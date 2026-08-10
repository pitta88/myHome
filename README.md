# MyHome

가정 유지보수(집, 잔디/정원, 자동차 등) 항목을 관리하고, 할 일을 추적하며, 텔레그램으로 리마인더를 받는 개인용 홈 관리 앱.

---

## 주요 기능

- **유지보수 항목 관리** — 카테고리별 항목 등록, 주기 설정, 기록 이력 추적
- **정비 로그** — 날짜·비용·메모·사진 첨부 기록
- **대시보드** — 과기한/임박 항목 한눈에 파악
- **할 일(Todo)** — 카테고리 + 마감일 설정, 캘린더 뷰
- **텔레그램 알림** — 매일 오전 10시, 내일 마감 예정 할 일 자동 전송

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, TypeScript 5.9, Vite 8 |
| 스타일 | Tailwind CSS v4 |
| 데이터 패칭 | TanStack React Query v5, Axios |
| 라우팅 | React Router DOM v6 |
| Backend | ASP.NET Core 10, C#, .NET 10 |
| ORM | Entity Framework Core 10 |
| 데이터베이스 | SQLite (`myhome.db`) |
| 인증 | JWT Bearer (HS256, 30일 만료), BCrypt |
| 외부 서비스 | Telegram Bot API |

---

## 시작하기

### 요구사항

- .NET 10 SDK (`brew install dotnet@10`)
- Node.js 18+

### 실행

```bash
./start.sh
```

스크립트가 백엔드와 프론트엔드를 동시에 실행합니다.

| 서비스 | 주소 |
|--------|------|
| 앱 (브라우저) | http://localhost:5174 |
| API 서버 | http://localhost:5002 |

`Ctrl+C` 로 양쪽 모두 종료됩니다.

### Docker로 실행 (프로덕션형)

```bash
docker compose up -d --build
```

- 접속: http://localhost:5100 (호스트 nginx 구성 시 https://localhost:8443)
- 데이터(DB, 업로드 파일)는 `./docker-data/`에 바인드 마운트되어 컨테이너를 지워도 유지됩니다.
- 최초 1회, 기존 개발 데이터를 옮기려면: `./copy-data.sh ./docker-data`
- 시크릿은 `.env` 파일에서 주입됩니다 (커밋 금지).
- 중지: `docker compose down`

### 초기 계정

최초 실행 시 자동 생성됩니다.

| 항목 | 값 |
|------|-----|
| 아이디 | `admin` |
| 비밀번호 | `admin1234` |

---

## 설정

`backend/MyHome.API/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=myhome.db"
  },
  "Jwt": {
    "Key": "...",
    "Issuer": "MyHome.API",
    "Audience": "MyHome.Client"
  },
  "Telegram": {
    "BotToken": "...",
    "ChatId": "..."
  }
}
```

텔레그램 알림을 사용하려면 `BotToken`과 `ChatId`를 입력합니다.

---

## 프로젝트 구조

```
myHome/
├── start.sh                    # 실행 스크립트
├── frontend/                   # React 앱
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/                # Axios API 클라이언트
│   │   ├── components/         # 공통 UI 컴포넌트
│   │   ├── pages/              # 페이지 컴포넌트
│   │   └── types/index.ts      # TypeScript 타입 정의
│   └── vite.config.ts
└── backend/MyHome.API/         # ASP.NET Core API
    ├── Program.cs
    ├── appsettings.json
    ├── myhome.db               # SQLite DB 파일
    ├── Controllers/
    ├── Models/
    ├── DTOs/
    ├── Data/AppDbContext.cs
    ├── Services/
    │   └── TodoReminderService.cs   # 텔레그램 알림 서비스
    └── Migrations/
```

---

## 페이지 구성

| 경로 | 설명 |
|------|------|
| `/` | 대시보드 — 통계, 과기한/임박 항목 |
| `/items` | 유지보수 항목 관리 |
| `/logs` | 정비 로그 기록/조회 |
| `/todos` | 할 일 목록 + 캘린더 |

---

## API 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/register` | 회원가입 |
| GET/POST | `/api/items` | 유지보수 항목 |
| GET/POST | `/api/logs` | 정비 로그 |
| GET/POST | `/api/todos` | 할 일 |
| POST | `/api/todos/{id}/complete` | 할 일 완료 처리 |
| GET | `/api/dashboard` | 대시보드 통계 |

> 인증이 필요한 엔드포인트는 `Authorization: Bearer <token>` 헤더를 포함해야 합니다.

---

> 자세한 시스템 구조는 [system-flow.md](./system-flow.md)를 참고하세요.
