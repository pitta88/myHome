# MyHome — AWS 최저비용 배포 가이드

## 결론: Lightsail 인스턴스 1대

이 앱에는 서버리스(Lambda 등)를 쓸 수 없는 세 가지 제약이 있다:

| 제약 | 이유 |
|---|---|
| SQLite (`/data/myhome.db`) | Lambda 파일시스템은 휘발성이라 쓰기가 사라진다. EFS를 붙이면 되지만 비용·복잡도가 늘고 SQLite 락 문제가 생긴다 |
| 업로드 파일 (`wwwroot/uploads`, `photos` — 16MB) | 위와 동일. 영구 디스크가 필요하다 |
| `TodoReminderService` (매일 오전 10시) | 상시 실행 프로세스가 필요하다. 스케일-투-제로면 동작하지 않는다 |

따라서 **작은 상시 인스턴스 1대 + Docker**가 가장 싸고 단순하다.
Kestrel이 이미 API와 SPA를 함께 서빙하므로 (Dockerfile Stage 3) S3/CloudFront로 프론트를 분리할 필요도 없다.

---

## 월 비용

| 항목 | 비용 |
|---|---|
| Lightsail 2GB 플랜 (2 vCPU / 2GB / 60GB SSD / 3TB 전송) | **$12** |
| Lightsail 1GB 플랜 (2 vCPU / 1GB / 40GB SSD / 2TB 전송) | **$7** (IPv6 전용 $5) |
| Lightsail 512MB 플랜 | $5 (IPv6 전용 $3.50) |
| S3 백업 (수십 MB) | ~$0.01 |
| Lightsail DNS 존 (3개까지) | 무료 |
| Let's Encrypt 인증서 (Caddy 자동) | 무료 |
| 도메인 등록 (Route 53) | 연 $12~15 |

**추천: 1GB 플랜 = 월 약 $7.** ASP.NET Core 런타임은 유휴 시 150~250MB를 쓴다. 512MB에서도 스왑을 붙이면 돌아가지만 여유가 없다.

### EC2와 비교 (Lightsail이 이기는 이유)

t4g.nano $3.07 + EBS 8GB $0.64 + **공인 IPv4 $3.65** = **월 $7.36** — 더 비싸고 설정도 많다.
2024년 2월부터 모든 공인 IPv4에 시간당 $0.005가 붙는데, Lightsail은 이 요금이 플랜에 포함되어 있다.

> 신규 AWS 계정은 $100(온보딩 완료 시 $200) 크레딧을 6개월간 쓸 수 있다. 초기 몇 달은 사실상 무료다.

---

## 절차

### 1. Lightsail 인스턴스 생성

Lightsail 콘솔 → Create instance

- 리전: `us-east-1` (또는 본인과 가까운 곳)
- 플랫폼: **Linux/Unix** → **OS Only** → **Ubuntu 24.04 LTS**
- **아키텍처: ARM (Graviton)** — 같은 값에 성능이 좋다. `deploy.sh`가 arm64로 빌드한다
- 플랜: **$7 (1GB)**
- SSH 키: 다운로드해서 `~/.ssh/`에 두고 `chmod 400`

생성 후 **Networking** 탭에서:
- 고정 IP(Static IP) 연결 — 무료(인스턴스에 붙어 있는 동안)
- 방화벽: **22 (SSH), 80 (HTTP), 443 (HTTPS)만** 열기. 5100 등은 열지 않는다

### 2. 서버 초기 설정

```bash
ssh -i ~/.ssh/LightsailDefaultKey.pem ubuntu@<고정IP>
```

```bash
# Docker 설치
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# 스왑 2GB (1GB 플랜에서 안전망. 없으면 빌드/피크 때 OOM)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 데이터 디렉터리
sudo mkdir -p /srv/myhome/data/wwwroot/{uploads,photos}
sudo chown -R ubuntu:ubuntu /srv/myhome

# 컨테이너의 app 유저(UID 1654)가 쓸 수 있도록
sudo chown -R 1654:1654 /srv/myhome/data

# 백업용 도구
sudo apt update && sudo apt install -y sqlite3 awscli

exit   # usermod 반영을 위해 재접속
```

### 3. 시크릿 파일 배치

서버의 `/srv/myhome/.env`:

```bash
cat > /srv/myhome/.env <<'EOF'
JWT_KEY=<로컬 .env에서 복사>
TELEGRAM_BOT_TOKEN=<로컬 .env에서 복사>
TELEGRAM_CHAT_ID=<로컬 .env에서 복사>
DOMAIN=myhome.example.com
ACME_EMAIL=you@example.com
EOF
chmod 600 /srv/myhome/.env
```

`docker compose`는 같은 디렉터리의 `.env`를 자동으로 읽는다.

### 4. 기존 데이터 이전

로컬에서:

```bash
cd ~/claude/myHome
tar -czf /tmp/myhome-data.tar.gz -C docker-data myhome.db wwwroot
scp -i ~/.ssh/LightsailDefaultKey.pem /tmp/myhome-data.tar.gz ubuntu@<고정IP>:/tmp/
ssh -i ~/.ssh/LightsailDefaultKey.pem ubuntu@<고정IP> \
  'sudo tar -xzf /tmp/myhome-data.tar.gz -C /srv/myhome/data && sudo chown -R 1654:1654 /srv/myhome/data'
```

### 5. 도메인 연결

도메인이 있다면 Lightsail → Networking → **Create DNS zone** (3개까지 무료) →
A 레코드로 고정 IP를 가리키게 하고, 등록기관의 네임서버를 Lightsail 것으로 변경.

도메인이 없다면 Route 53에서 연 $12~15에 등록하거나, DuckDNS 같은 무료 DDNS로 시작해도 된다.
**Caddy가 HTTPS 인증서를 자동 발급하므로 도메인이 반드시 있어야 한다** (IP만으로는 Let's Encrypt 발급 불가).

### 6. 배포

로컬에서:

```bash
cd ~/claude/myHome/deploy
cp deploy.env.example .env.deploy
# .env.deploy에 SSH_HOST / SSH_KEY 입력
chmod +x deploy.sh
./deploy.sh
```

이후 코드를 고칠 때마다 `./deploy.sh` 한 번이면 재배포된다.
빌드는 Mac에서 돌고 이미지만 전송되므로 서버 메모리를 쓰지 않고, 레지스트리 비용도 0이다.
(Apple Silicon Mac이면 arm64 네이티브 빌드라 빠르다.)

### 7. 백업 자동화

S3 버킷을 만들고 (`myhome-backup-<임의숫자>`, 퍼블릭 액세스 차단),
Lightsail 인스턴스에 쓰기 권한이 있는 IAM 사용자 키를 `aws configure`로 등록한 뒤:

```bash
sudo cp deploy/backup.sh /usr/local/bin/myhome-backup
sudo chmod +x /usr/local/bin/myhome-backup

# 매일 새벽 3시
( crontab -l 2>/dev/null; \
  echo '0 3 * * * BACKUP_BUCKET=s3://myhome-backup-12345 /usr/local/bin/myhome-backup >> /var/log/myhome-backup.log 2>&1' \
) | crontab -
```

S3 버킷에 **수명 주기 규칙**을 걸어 30일 지난 백업을 삭제하면 비용이 거의 0으로 유지된다.

---

## 추가로 비용을 더 줄이려면

- **IPv6 전용 플랜** ($7 → $5): 월 $2 절약. 단 IPv4만 쓰는 네트워크(일부 회사망, 공용 Wi-Fi)에서는 접속이 안 된다. 혼자 쓰더라도 외출 중 접속을 생각하면 권하지 않는다.
- **1년 선결제 EC2 Savings Plan**: 인스턴스 요금은 40% 정도 싸지지만 IPv4 요금이 붙어 Lightsail보다 나을 게 없다.
- **밤에 인스턴스 정지**: Lightsail은 정지해도 플랜 요금이 그대로 청구되므로 의미가 없다. (EC2는 절약되지만 위 이유로 비추천)

## 운영 체크

```bash
ssh ... 'docker compose -f /srv/myhome/docker-compose.prod.yml logs -f myhome'   # 로그
ssh ... 'docker stats --no-stream'                                               # 메모리
ssh ... 'free -h'                                                                # 스왑 사용량
```

메모리가 계속 90% 이상이면 Lightsail 콘솔에서 상위 플랜으로 스냅샷 복원해 올리면 된다 (다운타임 몇 분).
