#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# 비상용 수동 배포. 평소에는 쓰지 않는다.
#
# 정상 경로는 `git push origin master` → GitHub Actions(.github/workflows/ci.yml)
# → ECR → SSM 이다. 이 스크립트는 CI가 멈췄거나, 커밋하지 않은 로컬 변경을
# 서버에서 급히 확인해야 할 때를 위한 우회로다.
#
# 로컬(Mac)에서 이미지를 빌드해 SSH로 밀어넣는다. 레지스트리를 거치지 않는다.
# 서버는 1GB 메모리라 dotnet/npm 빌드를 서버에서 돌리면 실패한다 — 그래서 로컬 빌드.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# deploy/.env.deploy 에서 접속 정보를 읽는다 (deploy.env.example 참고)
CONF="$SCRIPT_DIR/.env.deploy"
[ -f "$CONF" ] || { echo "❌ $CONF 없음. deploy.env.example를 복사해서 채우세요."; exit 1; }
# shellcheck disable=SC1090
source "$CONF"

: "${SSH_HOST:?SSH_HOST 미설정}"
: "${SSH_USER:=ubuntu}"
: "${SSH_KEY:?SSH_KEY 미설정}"
: "${ECR_REGISTRY:?ECR_REGISTRY 미설정 (예: 123456789012.dkr.ecr.us-east-1.amazonaws.com)}"
# t4g(Graviton)=linux/arm64, t3(인텔)=linux/amd64. 인스턴스에 맞춰야 한다.
: "${PLATFORM:=linux/arm64}"

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new $SSH_USER@$SSH_HOST"
REMOTE_DIR=/srv/myhome
# CI가 올린 latest/SHA 태그를 건드리지 않도록 별도 태그를 쓴다.
TAG=local
IMAGE="$ECR_REGISTRY/myhome:$TAG"
TAR=/tmp/myhome-image.tar.gz

echo "=== 1/5 이미지 빌드 ($PLATFORM) ==="
cd "$ROOT_DIR"
docker buildx build --platform "$PLATFORM" -t "$IMAGE" --load .

echo "=== 2/5 이미지 압축 ==="
docker save "$IMAGE" | gzip -1 > "$TAR"
echo "    크기: $(du -h "$TAR" | cut -f1)"

echo "=== 3/5 서버로 전송 ==="
scp -i "$SSH_KEY" "$TAR" "$SSH_USER@$SSH_HOST:/tmp/myhome-image.tar.gz"
scp -i "$SSH_KEY" "$SCRIPT_DIR/docker-compose.prod.yml" "$SCRIPT_DIR/Caddyfile" \
    "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "=== 4/5 서버에서 로드 & 재기동 ==="
# ECR을 거치지 않으므로 pull 없이 로드한 이미지를 그대로 쓴다.
# shellcheck disable=SC2029
$SSH "set -e
  cd $REMOTE_DIR
  gunzip -c /tmp/myhome-image.tar.gz | docker load
  rm -f /tmp/myhome-image.tar.gz
  IMAGE_TAG=$TAG docker compose -f docker-compose.prod.yml up -d
  docker image prune -f"

echo "=== 5/5 헬스 체크 ==="
rm -f "$TAR"
sleep 5
$SSH "IMAGE_TAG=$TAG docker compose -f $REMOTE_DIR/docker-compose.prod.yml ps"

echo "✅ 수동 배포 완료 (tag: $TAG)."
echo "   정상 경로로 되돌리려면: /usr/local/bin/myhome-deploy latest"
