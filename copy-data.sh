#!/bin/bash
# 개발 환경(backend/MyHome.API)의 실 데이터(myhome.db, uploads, photos)를
# 배포 대상 디렉토리로 복사한다.
#
# 사용법:
#   ./copy-data.sh [대상_디렉토리] [--force]
#
#   대상_디렉토리   기본값: backend/MyHome.API/publish (build.sh 결과물)
#   --force        대상에 이미 myhome.db가 있어도 확인 없이 덮어쓴다
#
# 주의: build.sh(퍼블리시)는 반복 실행해도 안전하지만, 이 스크립트는
# "덮어쓰기"이므로 대상 쪽에 이미 운영 데이터가 쌓여있다면 함부로 반복
# 실행하지 말 것 (dev 쪽 오래된 데이터로 되돌아갈 수 있음).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/backend/MyHome.API"

TARGET_DIR="$SCRIPT_DIR/backend/MyHome.API/publish"
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) TARGET_DIR="$arg" ;;
  esac
done

if [ ! -d "$TARGET_DIR" ]; then
  echo "대상 디렉토리가 없습니다: $TARGET_DIR"
  exit 1
fi

echo "=== 데이터 복사: $SOURCE_DIR -> $TARGET_DIR ==="

# 1. SQLite DB: sqlite3 온라인 백업(.backup)으로 복사.
#    WAL 모드에서도 안전하게 일관된 스냅샷을 뜬다 (파일을 그냥 cp하면
#    -wal/-shm과 불일치가 생겨 손상될 수 있음).
if [ -f "$SOURCE_DIR/myhome.db" ]; then
  if [ -f "$TARGET_DIR/myhome.db" ] && [ "$FORCE" != true ]; then
    read -p "대상에 이미 myhome.db가 있습니다. 덮어쓸까요? (y/N) " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      echo "DB 복사를 건너뜁니다."
    else
      FORCE=true
    fi
  fi

  if [ ! -f "$TARGET_DIR/myhome.db" ] || [ "$FORCE" = true ]; then
    sqlite3 "$SOURCE_DIR/myhome.db" ".backup '$TARGET_DIR/myhome.db'"
    rm -f "$TARGET_DIR/myhome.db-wal" "$TARGET_DIR/myhome.db-shm"
    echo "myhome.db 복사 완료"
  fi
else
  echo "경고: $SOURCE_DIR/myhome.db 가 없습니다. DB 복사를 건너뜁니다."
fi

# 2. uploads/photos: 병합 복사 (대상에 이미 있는 파일은 건드리지 않음)
mkdir -p "$TARGET_DIR/wwwroot/uploads" "$TARGET_DIR/wwwroot/photos"
rsync -a --ignore-existing "$SOURCE_DIR/wwwroot/uploads/" "$TARGET_DIR/wwwroot/uploads/"
rsync -a --ignore-existing "$SOURCE_DIR/wwwroot/photos/" "$TARGET_DIR/wwwroot/photos/"

echo "✅ 데이터 복사 완료"
echo "   대상을 실행 중이었다면 재시작해야 반영됩니다 (SQLite 파일은 실행 중 앱이 붙잡고 있음)."
