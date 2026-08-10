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
