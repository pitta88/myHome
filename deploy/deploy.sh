#!/usr/bin/env bash
# 로컬(Mac)에서 arm64 이미지를 빌드해 SSH로 서버에 밀어넣는다.
# 컨테이너 레지스트리(ECR/Docker Hub)를 쓰지 않으므로 추가 비용이 0이다.
# 서버는 512MB~1GB 메모리라 dotnet/npm 빌드를 서버에서 돌리면 실패한다 — 그래서 로컬 빌드.
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

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new $SSH_USER@$SSH_HOST"
REMOTE_DIR=/srv/myhome
IMAGE=myhome:latest
TAR=/tmp/myhome-image.tar.gz

echo "=== 1/5 arm64 이미지 빌드 (Graviton용) ==="
cd "$ROOT_DIR"
docker buildx build --platform linux/arm64 -t "$IMAGE" --load .

echo "=== 2/5 이미지 압축 ==="
docker save "$IMAGE" | gzip -1 > "$TAR"
echo "    크기: $(du -h "$TAR" | cut -f1)"

echo "=== 3/5 서버로 전송 ==="
scp -i "$SSH_KEY" "$TAR" "$SSH_USER@$SSH_HOST:/tmp/myhome-image.tar.gz"
scp -i "$SSH_KEY" "$SCRIPT_DIR/docker-compose.prod.yml" "$SCRIPT_DIR/Caddyfile" \
    "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "=== 4/5 서버에서 로드 & 재기동 ==="
# shellcheck disable=SC2029
$SSH "set -e
  cd $REMOTE_DIR
  gunzip -c /tmp/myhome-image.tar.gz | docker load
  rm -f /tmp/myhome-image.tar.gz
  docker compose -f docker-compose.prod.yml up -d
  docker image prune -f"

echo "=== 5/5 헬스 체크 ==="
rm -f "$TAR"
sleep 5
$SSH "docker compose -f $REMOTE_DIR/docker-compose.prod.yml ps"

echo "✅ 배포 완료. 서버의 /srv/myhome/.env에 설정한 DOMAIN으로 접속하세요."
