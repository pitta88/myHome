#!/usr/bin/env bash
# 서버에서 실행되는 배포 스크립트. GitHub Actions가 SSM SendCommand로 호출한다.
#
# 설치:
#   sudo cp deploy/remote-deploy.sh /usr/local/bin/myhome-deploy
#   sudo chmod +x /usr/local/bin/myhome-deploy
#
# 사용:
#   myhome-deploy              # :latest 배포
#   myhome-deploy <git-sha>    # 특정 커밋으로 롤백
#
# SSM에 긴 셸 명령을 JSON으로 밀어넣는 대신 이 스크립트를 호출하게 하면
# 따옴표 이스케이프 지옥을 피하고, 서버에서 직접 실행해 디버깅할 수도 있다.
set -euo pipefail

TAG="${1:-latest}"
REMOTE_DIR=/srv/myhome
COMPOSE="$REMOTE_DIR/docker-compose.prod.yml"

cd "$REMOTE_DIR"

# .env를 통째로 source하지 않는다 — JWT_KEY 등 시크릿을 이 스크립트의
# 환경에 끌어들일 이유가 없다. 필요한 두 값만 뽑아 쓴다.
read_env() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
ECR_REGISTRY="$(read_env ECR_REGISTRY)"
AWS_REGION="$(read_env AWS_REGION)"

: "${ECR_REGISTRY:?/srv/myhome/.env에 ECR_REGISTRY 필요}"
: "${AWS_REGION:?/srv/myhome/.env에 AWS_REGION 필요}"

echo "=== 1/4 ECR 로그인 ==="
# 자격증명은 IAM 인스턴스 역할에서 온다. 액세스 키 파일이 서버에 없다.
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "=== 2/4 이미지 받기 (tag: $TAG) ==="
# 셸 환경변수가 .env보다 우선하므로 롤백 시 인자로 덮어쓸 수 있다.
export IMAGE_TAG="$TAG"
docker compose -f "$COMPOSE" pull myhome

echo "=== 3/4 재기동 ==="
docker compose -f "$COMPOSE" up -d

echo "=== 4/4 정리 ==="
# 7일 지난 미사용 이미지만 지운다. 최근 것은 빠른 롤백을 위해 남긴다.
docker image prune -af --filter "until=168h"

docker compose -f "$COMPOSE" ps
echo "✅ 배포 완료 (tag: $TAG)"
