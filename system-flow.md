# MyHome 시스템 흐름도

## 프로젝트 개요

가정 유지보수(집, 잔디/정원, 자동차 등) 항목을 관리하고, 할 일(Todo)을 추적하며, 텔레그램으로 리마인더를 받는 개인용 홈 관리 앱.

---

## 아키텍처 구성

```
[사용자 브라우저]
       |
       | HTTP (port 5174)
       v
[Frontend - Vite Dev Server]  ←→  /api/* proxy  →  [Backend API - ASP.NET Core]
  React 19 + TypeScript                                      |
  Tailwind CSS v4                                      [SQLite DB]
  TanStack Query                                       myhome.db
  React Router v6
                                                      [Telegram Bot API]
                                                   (외부 알림 서비스)
```

---

## 기술 스택

### Frontend
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 |
| 언어 | TypeScript 5.9 |
| 빌드 도구 | Vite 8 |
| 스타일 | Tailwind CSS v4 |
| 상태/데이터 패칭 | TanStack React Query v5 |
| HTTP 클라이언트 | Axios |
| 라우팅 | React Router DOM v6 |
| 아이콘 | Lucide React |

### Backend
| 항목 | 기술 |
|------|------|
| 프레임워크 | ASP.NET Core 10 (Minimal Hosting) |
| 언어 | C# / .NET 10 |
| ORM | Entity Framework Core 10 |
| 데이터베이스 | SQLite (`myhome.db`) |
| 인증 | JWT Bearer (HS256, 30일 만료) |
| 비밀번호 해시 | BCrypt.Net-Next |
| 외부 알림 | Telegram Bot API |

---

## 실행 환경

| 항목 | 값 |
|------|----|
| OS | macOS (Apple Silicon, Homebrew) |
| .NET | .NET 10 SDK (`dotnet`, system PATH) |
| Backend 포트 | `http://0.0.0.0:5002` |
| Frontend 포트 | `http://0.0.0.0:5174` |
| 로컬 접속 URL | http://localhost:5174 |
| 네트워크 접속 URL | http://192.168.1.156:5174 |

**실행 스크립트:** `start.sh`  
백엔드와 프론트엔드를 동시에 백그라운드 프로세스로 실행, `Ctrl+C`로 양쪽 모두 종료.

---

## 데이터베이스 스키마

### 테이블 목록

```
Users
├── Id (PK)
├── Username
├── PasswordHash  (BCrypt)
└── CreatedAt

Categories
├── Id (PK)
├── Name
├── Icon  (이모지)
└── Color

MaintenanceItems          (유지보수 항목)
├── Id (PK)
├── CategoryId (FK → Categories)
├── Name
├── Description
├── IntervalDays          (유지보수 주기, 일 단위)
├── IsActive
└── CreatedAt

MaintenanceLogs           (유지보수 기록)
├── Id (PK)
├── ItemId (FK → MaintenanceItems)
├── LogDate
├── Notes
├── Cost
├── ProductUsed
├── PhotoPath
└── CreatedAt

LogAttachments            (로그 첨부파일)
├── Id (PK)
├── LogId (FK → MaintenanceLogs)
├── FileName
├── FilePath
├── MimeType
└── CreatedAt

Todos                     (할 일)
├── Id (PK)
├── UserId (FK → Users)      (사용자별 소유)
├── CategoryId (FK → Categories)
├── Title
├── Description
├── DueDate
├── IsCompleted
├── CompletedAt
└── CreatedAt
```

### 기본 시드 데이터 (Categories)
| Id | Name | Icon | Color |
|----|------|------|-------|
| 1 | 잔디/정원 | 🌿 | green |
| 2 | 자동차 | 🚗 | blue |
| 3 | 집 내부 | 🏠 | orange |
| 4 | 기타 | 🔧 | gray |
| 6 | CPAP | 😴 | purple |

> Id 5(덱스터)는 시드가 아니라 `POST /api/categories`로 런타임에 추가된 항목입니다.

---

## API 엔드포인트

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | /api/auth/login | 로그인, JWT 발급 | 불필요 |
| POST | /api/auth/register | 회원가입, JWT 발급 | 불필요 |
| GET/POST | /api/categories | 카테고리 목록/생성 | 필요 |
| DELETE | /api/categories/{id} | 카테고리 삭제 | 필요 |
| GET/POST | /api/items | 유지보수 항목 목록/생성 | 필요 |
| PUT/DELETE | /api/items/{id} | 항목 수정/삭제 | 필요 |
| GET | /api/logs | 로그 목록 (`?itemId=`로 항목별 필터 가능) | 필요 |
| POST | /api/logs | 로그 생성 | 필요 |
| PUT/DELETE | /api/logs/{id} | 로그 수정/삭제 (삭제 시 첨부파일도 디스크에서 제거) | 필요 |
| GET | /api/logs/recent | 최근 로그 20건 | 필요 |
| POST | /api/logs/{id}/photo | 대표 사진 업로드 (`/photos/`) | 필요 |
| POST | /api/logs/{id}/attachments | 첨부파일 업로드 (`/uploads/`) | 필요 |
| DELETE | /api/logs/{id}/attachments/{attachmentId} | 첨부파일 삭제 | 필요 |
| GET/POST | /api/todos | 할 일 목록/생성 (로그인 사용자 본인 것만) | 필요 |
| PUT/DELETE | /api/todos/{id} | 할 일 수정/삭제 | 필요 |
| PATCH | /api/todos/{id}/toggle | 완료/미완료 토글 | 필요 |
| GET | /api/dashboard | 대시보드 통계 | 필요 |

---

## 인증 흐름

```
1. 로그인 요청 (POST /api/auth/login)
   └── BCrypt 비밀번호 검증
   └── JWT 토큰 발급 (30일 유효)

2. 클라이언트 저장
   └── localStorage에 token, username 저장

3. 이후 모든 API 요청
   └── Axios interceptor → Authorization: Bearer <token> 헤더 자동 추가

4. 토큰 만료/401 응답 시
   └── Axios interceptor → localStorage 삭제 → /login 리다이렉트
```

---

## 시스템 흐름도 (기능별)

### 유지보수 항목 관리
```
사용자 → 항목 등록 (카테고리 + 주기 설정)
       → 정비 완료 시 로그 기록 (날짜, 비용, 메모, 사진/첨부)
       → 대시보드에서 과기한/임박 항목 확인
```

**기한 상태(DueStatus) 계산** (Items·Dashboard 컨트롤러 공통, 기준일 = `DateTime.UtcNow.Date`)
- 마지막 로그가 없으면 → `no-logs`
- 마지막 로그는 있으나 `IntervalDays` 미설정 → `ok`
- `다음 예정일 = 마지막 로그일 + IntervalDays`
  - 오늘이 예정일을 지남 → `overdue` (`DaysOverdue` 계산)
  - 예정일 7일 이내 임박 → `due-soon`
  - 그 외 → `ok`
- 대시보드는 `overdue`/`due-soon` 건수와 목록, 이번 달 완료 로그 수, 최근 로그 10건을 반환

### 할 일(Todo) 관리
```
사용자 → 할 일 등록 (카테고리, 마감일 설정)   ※ 로그인 사용자별로 소유/조회
       → 캘린더 뷰로 일정 확인
       → 완료/미완료 토글 (PATCH /api/todos/{id}/toggle)
```
- 목록 정렬: 미완료 우선 → 마감일 있는 항목 우선 → 마감일 오름차순 → 생성일 내림차순

### 텔레그램 알림 (TodoReminderService)
```
매일 오전 10시 (BackgroundService, 서버 로컬 시간 기준)
       → 다음 10시까지 Task.Delay로 대기 후 실행, 무한 반복
       → DB에서 내일 마감인 미완료 Todo 조회 (전체 사용자 대상)
       → BotToken/ChatId 미설정 시 전송 생략
       → Telegram Bot API(sendMessage, parse_mode=Markdown)로 전송
```
메시지 형식:
```
📋 *내일 예정된 할 일* (yyyy-MM-dd)

• 🌿 항목명
• 🚗 항목명
```

---

## 프론트엔드 페이지 구성

| 경로 | 페이지 | 설명 |
|------|--------|------|
| / | DashboardPage | 통계, 과기한/임박 항목 요약 |
| /items | ItemsPage | 유지보수 항목 CRUD |
| /logs | LogsPage | 유지보수 로그 기록/조회 |
| /todos | TodosPage | 할 일 목록 + 캘린더 |

---

## 파일 구조

```
myHome/
├── start.sh                        # 백엔드+프론트 동시 실행 스크립트
├── frontend/
│   ├── vite.config.ts              # Vite 설정 (프록시: /api, /uploads, /photos)
│   ├── src/
│   │   ├── App.tsx                 # 라우터, 인증 상태 관리
│   │   ├── api/                    # Axios API 클라이언트 모음
│   │   ├── components/             # 공통 UI 컴포넌트
│   │   ├── pages/                  # 페이지별 컴포넌트
│   │   └── types/index.ts          # TypeScript 타입 정의
│   └── dist/                       # 빌드 결과물 (정적 파일)
├── build.sh                         # 배포용 빌드 스크립트 (프론트 빌드 + 백엔드 퍼블리시)
├── copy-data.sh                     # dev DB/업로드 파일을 배포 대상으로 복사 (1회성 마이그레이션용)
├── Dockerfile                       # 3-스테이지 이미지 빌드 (프론트+백엔드 → 단일 컨테이너)
├── docker-compose.yml               # 컨테이너 실행 구성 (포트/볼륨/환경변수)
├── .dockerignore
├── .env                             # Docker용 시크릿 (커밋 금지)
├── docker-data/                     # 컨테이너 실데이터 (DB, uploads, photos) — 바인드 마운트
└── backend/MyHome.API/
    ├── Program.cs                  # 앱 진입점, DI 설정, 미들웨어 (SPA 폴백 라우트 포함)
    ├── appsettings.json            # DB 연결, JWT, Telegram 설정
    ├── myhome.db                   # SQLite 데이터베이스 파일
    ├── Controllers/                # REST API 컨트롤러
    ├── Models/                     # EF Core 엔티티
    ├── DTOs/                       # 요청/응답 DTO
    ├── Data/AppDbContext.cs        # EF Core DbContext
    ├── Services/
    │   └── TodoReminderService.cs  # 텔레그램 알림 백그라운드 서비스
    ├── Migrations/                 # EF Core 마이그레이션
    └── publish/                    # dotnet publish 결과물 (build.sh 산출물, 빌드 아티팩트)
```

---

## CORS 설정

허용된 오리진:
- `http://localhost:5174`
- `http://192.168.1.156:5174`

---

## 배포 환경

향후 AWS 배포를 목표로, 로컬(맥미니)에서 도커화 전에 **프로덕션형 서빙 방식**을 먼저 검증 중. 일상 개발은 여전히 `start.sh`(dev 모드)로 진행.

### 아키텍처 결정: 프론트엔드+백엔드 단일 프로세스 서빙

Docker화 시 "nginx 컨테이너 + 백엔드 컨테이너" 2개로 나누는 대신, **ASP.NET Core(Kestrel) 하나가 API와 React 빌드 결과물을 함께 서빙**하는 구조(아래에서는 "Option B")로 결정했다. 사용자 수·데이터 양이 적어 AWS의 다양한 저비용 배포 옵션(단일 EC2, App Runner 등)과 궁합이 가장 좋고, 단일 origin이라 CORS도 필요 없기 때문.

이를 위해 `Program.cs`에 SPA 폴백 라우트를 추가했다:
```csharp
app.MapControllers();                // /api/* → 컨트롤러
app.MapFallbackToFile("index.html"); // 그 외 전부 → SPA (React Router가 클라이언트에서 처리)
```
Vite dev server는 이 폴백을 기본 내장하고 있어 지금까지 필요 없었지만, 순수 정적 파일 서빙(`UseStaticFiles`)은 폴백을 제공하지 않아 명시적으로 추가해야 딥링크 새로고침 시 404가 나지 않는다.

### 로컬 "프로덕션형" 테스트 토폴로지 (맥미니, Docker)

```
브라우저 (같은 LAN의 다른 기기 포함)
   │  http://<host>:8080 ──301 리다이렉트──▶ https://<host>:8443
   ▼
[nginx] (Homebrew, 호스트에서 직접 실행, /opt/homebrew/etc/nginx/nginx.conf)
   ├─ :8080  HTTP  → 301 redirect → https://$host:8443$request_uri
   └─ :8443  HTTPS (mkcert 인증서: localhost / 127.0.0.1 / ::1 / 192.168.1.156)
                │ proxy_pass → 127.0.0.1:5100
                ▼
┌──[Docker 컨테이너 "myhome"]── 포트 매핑 5100:8080 ──────────┐
│  [Kestrel] :8080  (mcr.microsoft.com/dotnet/aspnet:10.0)    │
│  ├── /api/*      → Controllers                              │
│  ├── /           → wwwroot/index.html (React 빌드, 이미지에 포함) │
│  ├── /uploads/*  → wwwroot/uploads  ← 바인드 마운트          │
│  └── /photos/*   → wwwroot/photos   ← 바인드 마운트          │
│         │                                                   │
│         ▼                                                   │
│  [SQLite] /data/myhome.db ← 바인드 마운트                    │
└──────────────────────────────────────────────────────────────┘
                │
                ▼ (호스트 실제 위치)
        ./docker-data/myhome.db
        ./docker-data/wwwroot/uploads/
        ./docker-data/wwwroot/photos/
```

- **데이터는 전부 컨테이너 밖**(`./docker-data` 바인드 마운트)에 있어 `docker compose down`/이미지 재빌드에도 유지된다. 컨테이너 파기→재생성 후 데이터 생존 검증 완료.
- 인증서: `mkcert`로 발급(LAN IP `192.168.1.156` 포함), macOS 시스템 키체인 + Firefox NSS 저장소에 로컬 CA 등록 완료. 다른 기기에서 LAN 접속하려면 각 기기에 `rootCA.pem`(`mkcert -CAROOT` 위치) 설치 필요.
- nginx가 TLS를 종료하고 컨테이너에는 평문 HTTP로 전달 — AWS에서 ALB가 TLS를 종료하는 구조와 동일한 패턴.
- 컨테이너는 비루트(`app`) 유저로 실행. 시크릿(JWT 키, 텔레그램 토큰)은 `.env` → compose 환경변수로 주입(`appsettings.json` 값을 오버라이드). `TZ=America/New_York` 설정 필수 — TodoReminderService가 서버 로컬 시간 기준 오전 10시에 동작하기 때문 (컨테이너 기본값은 UTC).

### Docker 파일 구성

| 파일 | 역할 |
|---|---|
| `Dockerfile` | 3-스테이지 빌드: node:24-alpine(프론트 빌드) → dotnet/sdk:10.0(퍼블리시) → dotnet/aspnet:10.0(런타임). `build.sh`가 호스트에서 하던 일을 이미지 빌드로 옮긴 것 |
| `docker-compose.yml` | 포트 5100:8080, `./docker-data` 바인드 마운트 3개, `.env` 시크릿 주입, `restart: unless-stopped` |
| `.dockerignore` | `node_modules`/`bin`/`obj`/`publish`/`myhome.db*`/`wwwroot`(실데이터) 제외 — 실데이터가 이미지에 구워지는 것 방지 |
| `.env` | JWT 키, 텔레그램 토큰/ChatId (커밋 금지) |

실행: `docker compose up -d --build` / 중지: `docker compose down` (데이터는 유지됨)

### 빌드/배포 스크립트

| 스크립트 | 역할 |
|---|---|
| `start.sh` | 개발용. 백엔드(`dotnet run`) + 프론트(`vite dev`) 동시 실행, 핫리로드 |
| `build.sh` | 배포용 빌드. 프론트 빌드(`npm run build`) → 결과물을 백엔드 `wwwroot`로 복사(`uploads`/`photos`는 보존) → `dotnet publish -c Release`로 `backend/MyHome.API/publish/` 생성 |
| `copy-data.sh [대상] [--force]` | **1회성 데이터 마이그레이션 전용.** dev DB(`myhome.db`, `sqlite3 .backup`으로 안전하게 스냅샷)와 `wwwroot/uploads`·`wwwroot/photos`(`rsync --ignore-existing`로 병합)를 대상 디렉토리로 복사. 실 운영 데이터가 쌓인 이후에는 재실행 금지 (오래된 dev 데이터로 덮어써짐) |

### 앞으로 남은 것

AWS 배포 (단일 EC2/Lightsail + EBS 호스트 디렉토리 바인드 마운트 패턴 예정). 그 전에 처리할 것:
- `appsettings.json`에 아직 실제 시크릿이 하드코딩되어 있고 이미지에도 구워짐 — ECR 푸시 전에 반드시 제거(env-only 구성으로 전환)
- 현재 이미지는 arm64(Apple Silicon) — AWS에서 Graviton 인스턴스를 쓰거나 `--platform linux/amd64` 빌드 필요
