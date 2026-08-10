#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== MyHome 시작 ==="
cd "$SCRIPT_DIR/backend/MyHome.API"
dotnet run --urls "http://0.0.0.0:5002" &
BACKEND_PID=$!
sleep 2
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ 실행 완료!"
echo "   브라우저: http://localhost:5174"
echo "   API:     http://localhost:5002"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
