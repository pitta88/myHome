#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend/MyHome.API"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "=== 1/3 프론트엔드 빌드 ==="
cd "$FRONTEND_DIR"
rm -rf dist
npm run build

echo "=== 2/3 프론트엔드 결과물을 백엔드 wwwroot로 복사 ==="
# 파일명에 해시가 붙으므로 그냥 복사하면 옛 번들이 계속 쌓인다.
# (index.html이 가리키지 않는 죽은 파일이 남아 저장소가 커지고, 지운 내용이
#  옛 번들 안에 그대로 남는다) 먼저 비우고 복사한다.
rm -rf "$BACKEND_DIR/wwwroot/assets"
cp -a dist/index.html dist/assets "$BACKEND_DIR/wwwroot/"
[ -f dist/favicon.svg ] && cp -a dist/favicon.svg "$BACKEND_DIR/wwwroot/"
[ -f dist/icons.svg ] && cp -a dist/icons.svg "$BACKEND_DIR/wwwroot/"

echo "=== 3/3 백엔드 퍼블리시 ==="
cd "$BACKEND_DIR"
rm -rf publish
dotnet publish -c Release -o ./publish

echo "✅ 빌드 완료!"
echo "   결과물: $BACKEND_DIR/publish"
echo "   실행:   cd $BACKEND_DIR/publish && dotnet MyHome.API.dll"
