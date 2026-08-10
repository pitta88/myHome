#!/usr/bin/env bash
# 서버에서 cron으로 매일 실행. SQLite + 업로드 파일을 S3에 백업한다.
# 데이터가 수십 MB 수준이라 S3 비용은 월 $0.01 미만이다.
# 설치: sudo cp backup.sh /usr/local/bin/myhome-backup && sudo chmod +x /usr/local/bin/myhome-backup
set -euo pipefail

BUCKET="${BACKUP_BUCKET:?BACKUP_BUCKET 환경변수 필요 (예: s3://myhome-backup-12345)}"
DATA_DIR=/srv/myhome/data
STAMP=$(date +%Y%m%d-%H%M%S)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# .backup은 실행 중인 DB에서도 안전한 일관성 있는 스냅샷을 만든다 (cp는 위험).
sqlite3 "$DATA_DIR/myhome.db" ".backup '$TMP/myhome.db'"

tar -czf "$TMP/myhome-$STAMP.tar.gz" \
    -C "$TMP" myhome.db \
    -C "$DATA_DIR" wwwroot

aws s3 cp "$TMP/myhome-$STAMP.tar.gz" "$BUCKET/" --storage-class STANDARD_IA

echo "✅ 백업 완료: $BUCKET/myhome-$STAMP.tar.gz"
