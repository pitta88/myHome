# MyHome — AWS EC2 배포 가이드 (학습용)

Lightsail 판은 [`SETUP.md`](./SETUP.md)에 있다. 비용만 따지면 그쪽이 싸다.
이 문서는 **AWS의 기본 구성요소를 직접 조립해보는 것**이 목적이다.

## Lightsail이 감춰주던 것들

| Lightsail | EC2에서 직접 하는 것 |
|---|---|
| 인스턴스의 "Firewall" 탭 | **VPC / 서브넷 / 인터넷 게이트웨이 / 시큐리티 그룹** |
| 고정 IP 버튼 | **Elastic IP 할당 & 연결** |
| 플랜에 포함된 디스크 | **EBS 볼륨(gp3), 스냅샷, DLM 자동화** |
| `aws configure`로 액세스 키 저장 | **IAM 인스턴스 역할** — 서버에 키 파일이 없다 |
| — | **SSM Session Manager** — 22번 포트를 안 열고 접속 |
| — | **GitHub OIDC** — CI에 AWS 장기 키를 두지 않는다 |
| — | **ECR**, user data 부트스트랩, IMDSv2 |

## 왜 ECS가 아닌가

이 앱에는 세 가지 상태 제약이 있다: SQLite(`/data/myhome.db`), 업로드 파일
(`wwwroot/uploads`, `photos`), 그리고 상시 실행이 필요한 `TodoReminderService`.

| | 상태 저장 | 월 비용 |
|---|---|---|
| **EC2 + Compose** | EBS 바인드 마운트 — 로컬 디스크 그대로 | **~$11** |
| ECS on EC2 | 동일 | ~$11 + ECS 관리 부담 (컨테이너 1개엔 순손해) |
| ECS Fargate | 파일시스템 휘발성 → **EFS 필수**, ALB $16/월 | ~$36 |

Fargate에서 SQLite를 EFS에 올리면 모든 fsync가 네트워크 왕복이 된다.
게다가 ECS의 진짜 가치(롤링 배포·오토스케일링)는 태스크를 2개로 못 늘리는
SQLite 앱에서 쓸 수가 없다.

> ECS를 제대로 배우고 싶다면 순서가 반대다. **SQLite → RDS(Postgres),
> 업로드 → S3로 앱을 stateless하게 고친 다음**에야 ECS가 의미를 갖는다.
> 이 문서는 그 1단계다.

## 아키텍처

```
  git push origin master
        │
        ▼
  GitHub Actions (ubuntu-24.04-arm)
    ├─ backend/frontend 테스트
    ├─ OIDC로 IAM 역할 assume  ── 장기 키 없음
    ├─ arm64 이미지 빌드 → ECR 푸시 (:latest, :<sha>)
    └─ SSM SendCommand ─────────── 인바운드 포트 불필요
                │
                ▼
        EC2 t4g.micro (Ubuntu 24.04 arm64)
          /usr/local/bin/myhome-deploy
            ├─ ECR 로그인 (인스턴스 역할)
            ├─ docker compose pull
            └─ docker compose up -d
                │
        ┌───────┴────────┐
     Caddy :80/:443    myhome :8080
     (Let's Encrypt)   (Kestrel = API + SPA)
                            │
                        EBS gp3 /srv/myhome/data
                            │
                        S3 (매일 백업) + EBS 스냅샷(DLM)
```

## 월 비용 (us-east-1 온디맨드, 대략)

| 항목 | 월 |
|---|---|
| t4g.micro (2 vCPU / 1GB, Graviton) | ~$6.13 |
| EBS gp3 10GB | ~$0.80 |
| 공인 IPv4 (Elastic IP) | ~$3.65 |
| Route 53 호스팅 존 | $0.50 |
| ECR (이미지 ~300MB) | ~$0.03 |
| S3 백업 + EBS 스냅샷 | ~$0.30 |
| **합계** | **~$11.4 / 월** |

여기에 도메인 등록비 연 $14(`.com`)가 붙는다.
신규 계정 크레딧이 남아 있으면 초기 몇 달은 사실상 무료다.

리전은 `us-east-1`을 가정한다 (`docker-compose.prod.yml`의 `TZ=America/New_York`과 맞다).
다른 리전을 쓰면 아래 모든 `us-east-1`을 바꾸고, `user-data.sh`의 awscli URL은 그대로 두면 된다.

---

# 절차

전체 30~60분. **1번 도메인 등록을 가장 먼저 시작한다** — 전파에 시간이 걸리고,
그게 끝나야 마지막에 HTTPS 인증서가 발급된다.

## 1. 도메인 등록 (Route 53)

Route 53 → Registered domains → **Register domains**

- **`.com`을 권한다.** Route 53의 `.io`는 연 $71로 비싸다.
  `.dev`/`.app`은 $14로 싸지만 브라우저 HSTS 프리로드 대상이라 평문 HTTP
  접속이 아예 안 된다 — 초기 디버깅 경로가 하나 막힌다.
- 프라이버시 보호(WHOIS 가림)는 대부분 TLD에서 무료. 켜둔다.
- 등록하면 **호스팅 존이 자동 생성**된다 (월 $0.50).

> ⚠️ **등록 직후 오는 이메일 인증 메일을 반드시 클릭할 것.**
> 15일 안에 인증하지 않으면 도메인이 정지된다. 등록 자체는 몇 분~몇 시간 걸린다.

호스트명은 **`home.내도메인.com` 같은 서브도메인**을 쓴다.
`Caddyfile`이 `{$DOMAIN}` 하나만 받는 구조라 그대로 맞고, apex는 나중을 위해 남는다.

## 2. ECR 리포지토리

ECR → Repositories → **Create repository**

- 이름: `myhome`
- 가시성: **Private** (기본)
- 나머지 기본값

생성 후 **Lifecycle policy**를 하나 건다 — 안 걸면 배포할 때마다 SHA 태그가
쌓여 용량이 계속 는다:

- Rule 1: `Untagged` 이미지를 1일 후 만료
- Rule 2: `Any` 이미지를 최근 10개만 남기고 만료

레지스트리 주소를 적어둔다: `<계정ID>.dkr.ecr.us-east-1.amazonaws.com`

## 3. IAM — 역할 두 개

키 파일을 아무 데도 두지 않는 게 이 단계의 핵심이다.

### 3-1. GitHub OIDC 자격증명 공급자

IAM → Identity providers → **Add provider**

- 유형: **OpenID Connect**
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

이걸 등록하면 GitHub Actions가 발급한 단기 토큰을 AWS가 신뢰한다.
GitHub Secrets에 AWS 액세스 키를 넣을 필요가 사라진다.

### 3-2. 배포 역할 (GitHub Actions가 빌린다)

IAM → Roles → Create role → **Web identity** → 위에서 만든 공급자 선택.

**신뢰 정책** — `<OWNER>/<REPO>`를 본인 것으로 바꾼다.
`sub` 조건이 핵심이다. 이게 없으면 **아무 GitHub 리포지토리나** 이 역할을
빌릴 수 있다. `master` 브랜치로 못박아 둔다:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<계정ID>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:ref:refs/heads/master"
      }
    }
  }]
}
```

**권한 정책** (인라인, 이름 `myhome-deploy`) — `<계정ID>`와 `<인스턴스ID>` 교체:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "EcrPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:BatchGetImage"
      ],
      "Resource": "arn:aws:ecr:us-east-1:<계정ID>:repository/myhome"
    },
    {
      "Sid": "SsmDeploy",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:us-east-1:<계정ID>:instance/<인스턴스ID>",
        "arn:aws:ssm:us-east-1::document/AWS-RunShellScript"
      ]
    },
    {
      "Sid": "SsmResult",
      "Effect": "Allow",
      "Action": ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
      "Resource": "*"
    }
  ]
}
```

> 인스턴스 ID는 5번에서 나온다. 우선 `"Resource": "*"`로 만들어 두고,
> 인스턴스 생성 후 위 형태로 좁히는 게 편하다. **좁히는 걸 잊지 말 것** —
> 최소 권한 원칙을 손으로 체험하는 지점이다.

역할 ARN을 적어둔다: `arn:aws:iam::<계정ID>:role/<역할명>`

### 3-3. 인스턴스 역할 (EC2가 쓴다)

IAM → Roles → Create role → **AWS service** → **EC2**

관리형 정책 두 개를 붙인다:

| 정책 | 용도 |
|---|---|
| `AmazonSSMManagedInstanceCore` | SSM 접속 + 명령 수신 |
| `AmazonEC2ContainerRegistryReadOnly` | ECR에서 이미지 pull |

여기에 백업용 인라인 정책을 추가한다 (`<버킷명>`은 7-4에서 만든다):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::<버킷명>/*"
  }]
}
```

역할 이름: `myhome-ec2`

> **이게 Lightsail 판과의 가장 큰 차이다.** `SETUP.md` 7번은 서버에서
> `aws configure`로 IAM 액세스 키를 저장하라고 하는데, 인스턴스 역할을 쓰면
> 그 키가 통째로 사라진다. awscli가 인스턴스 메타데이터(IMDS)에서 자동
> 회전되는 임시 자격증명을 받아온다. `backup.sh`는 **한 줄도 안 고쳐도 된다.**

## 4. 시큐리티 그룹

EC2 → Security Groups → **Create security group** (이름 `myhome-sg`, 기본 VPC)

**인바운드 규칙:**

| 유형 | 포트 | 소스 | 이유 |
|---|---|---|---|
| HTTP | 80 | `0.0.0.0/0` | Let's Encrypt HTTP-01 챌린지 + HTTPS 리다이렉트 |
| HTTPS | 443 | `0.0.0.0/0` | 실제 서비스 |
| SSH | 22 | **`<내 공인 IP>/32`** | 비상용. `curl ifconfig.me`로 확인 |

**아웃바운드는 기본값(전체 허용)** 그대로 둔다. ECR pull, Let's Encrypt,
SSM, S3 모두 아웃바운드로 나간다.

`8080`은 열지 않는다 — Caddy만 컨테이너 네트워크로 접근한다.

> **SSH를 아예 안 열어도 된다.** 배포는 SSM으로 가고, 접속도
> `aws ssm start-session --target <인스턴스ID>`로 가능하다.
> 다만 `deploy.sh`(비상용 수동 배포)와 `scp`가 22번을 쓰므로, 처음에는
> 내 IP로 열어두고 익숙해진 뒤 규칙을 지우는 걸 권한다.
> 재택 IP는 바뀌므로 접속이 안 되면 이 규칙부터 의심할 것.

## 5. EC2 인스턴스

EC2 → Instances → **Launch instances**

| 항목 | 값 |
|---|---|
| 이름 | `myhome` |
| AMI | **Ubuntu Server 24.04 LTS** — 반드시 **64-bit (Arm)** |
| 인스턴스 유형 | **t4g.micro** (2 vCPU / 1GB) |
| 키 페어 | 새로 생성 → `myhome-ec2.pem` 다운로드 → `chmod 400` |
| 네트워크 | 기본 VPC / 퍼블릭 서브넷, **퍼블릭 IP 자동 할당: 활성화** |
| 시큐리티 그룹 | 기존 선택 → `myhome-sg` |
| 스토리지 | **10 GiB gp3** |

**Advanced details**에서 두 가지:

- **IAM instance profile**: `myhome-ec2`
- **Metadata version**: `V2 only (token required)` ← IMDSv1은 SSRF로 자격증명이
  새어나갈 수 있다. 끄는 습관을 들이는 게 좋다.
- **User data**: [`user-data.sh`](./user-data.sh) 내용을 붙여넣는다.
  Docker 설치, 스왑 2GB, 데이터 디렉터리, awscli, SSM 에이전트를 자동 세팅한다.

> AMI 아키텍처를 x86으로 잘못 고르면 t4g가 목록에 안 뜬다. 그게 신호다.

부팅 후 **인스턴스 ID**를 적어두고, 3-2의 IAM 정책 `Resource`를 좁힌다.

user data가 잘 돌았는지 확인:

```bash
aws ssm start-session --target <인스턴스ID>
sudo tail -50 /var/log/cloud-init-output.log   # "✅ user-data 완료"
free -h                                        # 스왑 2.0Gi
docker --version
```

SSM 세션이 안 열리면 인스턴스 역할(`AmazonSSMManagedInstanceCore`)이 붙었는지,
에이전트가 떴는지 확인한다. 역할을 나중에 붙였다면 재부팅이 필요할 수 있다.

## 6. Elastic IP + DNS

### 6-1. Elastic IP

EC2 → Elastic IPs → **Allocate** → 생성된 IP 선택 → **Associate** → 인스턴스 `myhome`

기본 퍼블릭 IP는 인스턴스를 중지/시작하면 바뀐다. EIP는 고정이다.
어차피 공인 IPv4는 시간당 $0.005가 붙으므로 EIP를 쓴다고 더 비싸지 않다.

### 6-2. A 레코드

Route 53 → Hosted zones → 내 도메인 → **Create record**

| 항목 | 값 |
|---|---|
| Record name | `home` |
| Type | `A` |
| Value | `<Elastic IP>` |
| TTL | `300` |

전파 확인 — **이게 EIP를 반환해야 다음 단계로 간다:**

```bash
dig +short home.내도메인.com
```

## 7. 서버 설정

```bash
aws ssm start-session --target <인스턴스ID>
sudo su - ubuntu
```

### 7-1. 시크릿 파일

```bash
cat > /srv/myhome/.env <<'EOF'
JWT_KEY=<로컬 .env에서 복사>
TELEGRAM_BOT_TOKEN=<로컬 .env에서 복사>
TELEGRAM_CHAT_ID=<로컬 .env에서 복사>
DOMAIN=home.내도메인.com
ACME_EMAIL=you@example.com
ECR_REGISTRY=<계정ID>.dkr.ecr.us-east-1.amazonaws.com
AWS_REGION=us-east-1

# 인증서 발급을 실험하는 동안만 켠다. 성공 확인 후 이 줄을 지우고 재배포.
ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory
EOF
chmod 600 /srv/myhome/.env
```

`docker compose`는 같은 디렉터리의 `.env`를 자동으로 읽는다.

> **스테이징으로 시작하는 이유:** Let's Encrypt 프로덕션은 도메인당 주간
> 발급 한도와 시간당 실패 한도가 있다. 설정을 고치며 재시도하다 보면 막히고,
> 그러면 몇 시간 기다려야 한다. 스테이징은 한도가 넉넉하고, 브라우저가
> 신뢰하지 않는 인증서를 주는 게 정상이다 (경고를 무시하고 접속해서 확인).

### 7-2. 배포 스크립트 설치

로컬에서 (아직 리포가 GitHub에 없으므로 `scp`):

```bash
cd ~/claude/myHome
scp -i ~/.ssh/myhome-ec2.pem \
    deploy/remote-deploy.sh deploy/backup.sh \
    deploy/docker-compose.prod.yml deploy/Caddyfile \
    ubuntu@<EIP>:/tmp/
```

서버에서:

```bash
sudo install -m 755 /tmp/remote-deploy.sh /usr/local/bin/myhome-deploy
sudo install -m 755 /tmp/backup.sh        /usr/local/bin/myhome-backup
mv /tmp/docker-compose.prod.yml /tmp/Caddyfile /srv/myhome/
```

### 7-3. 기존 데이터 이전

로컬에서:

```bash
cd ~/claude/myHome
tar -czf /tmp/myhome-data.tar.gz -C docker-data myhome.db wwwroot
scp -i ~/.ssh/myhome-ec2.pem /tmp/myhome-data.tar.gz ubuntu@<EIP>:/tmp/
ssh -i ~/.ssh/myhome-ec2.pem ubuntu@<EIP> \
  'sudo tar -xzf /tmp/myhome-data.tar.gz -C /srv/myhome/data \
   && sudo chown -R 1654:1654 /srv/myhome/data'
```

> DB를 이전하면 앱의 시드 로직(`Program.cs`)이 돌지 않는다.
> 빈 상태로 띄우면 기본 관리자 계정이 생기므로, 그 경우 **첫 로그인 직후
> 반드시 비밀번호를 바꿀 것.**

### 7-4. 백업 버킷

S3 → Create bucket

- 이름: `myhome-backup-<임의숫자>` (전역 유일)
- **Block all public access: 켜둠**
- Lifecycle rule: 30일 지난 객체 만료 → 비용이 거의 0으로 유지된다

버킷명을 3-3의 인라인 정책 `Resource`에 반영한다.

## 8. GitHub 설정

### 8-1. 푸시 & public 전환

```bash
cd ~/claude/myHome
gh repo create <OWNER>/myHome --public --source=. --remote=origin --push
```

이미 리포가 있다면 Settings → General → Danger Zone → Change visibility.

> **public 전환은 커밋 히스토리 전체를 공개한다.** 이 리포는 확인 결과
> 히스토리에 시크릿이 없고 `.gitignore`가 `.env`, `*.db`, `wwwroot/uploads|photos`,
> `docker-data/`를 모두 제외하고 있다.

### 8-2. Secrets 등록

Settings → Secrets and variables → Actions → **New repository secret**

| 이름 | 값 |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::<계정ID>:role/<3-2에서 만든 역할명>` |
| `EC2_INSTANCE_ID` | `i-0abc...` |

둘 다 그 자체로는 비밀이 아니다 — **신뢰 정책의 `sub` 조건이 진짜 방어선이다.**
그래서 3-2에서 리포/브랜치를 못박은 것이다.

## 9. 첫 배포

```bash
git push origin master
```

Actions 탭에서 `backend` → `frontend` → `deploy` 순서로 도는 걸 확인한다.
`deploy`는 앞의 두 잡이 통과해야만 시작한다.

서버에서 인증서 발급 확인:

```bash
aws ssm start-session --target <인스턴스ID>
docker logs caddy --tail 50 | grep -i certificate
curl -k https://home.내도메인.com    # 스테이징이라 -k 필요
```

정상이면 프로덕션 인증서로 전환:

```bash
sudo sed -i '/^ACME_CA=/d' /srv/myhome/.env
sudo docker compose -f /srv/myhome/docker-compose.prod.yml up -d --force-recreate caddy
```

이제 브라우저에서 `https://home.내도메인.com` — 자물쇠가 정상이어야 한다.

## 10. 백업 자동화

### 10-1. 앱 데이터 → S3 (매일)

인스턴스 역할이 이미 `s3:PutObject`를 갖고 있으므로 `aws configure`가 필요 없다.

```bash
( crontab -l 2>/dev/null; \
  echo '0 3 * * * BACKUP_BUCKET=s3://myhome-backup-12345 /usr/local/bin/myhome-backup >> /var/log/myhome-backup.log 2>&1' \
) | crontab -

# 즉시 한 번 돌려서 확인
BACKUP_BUCKET=s3://myhome-backup-12345 /usr/local/bin/myhome-backup
```

`backup.sh`는 `sqlite3 .backup`으로 일관성 있는 스냅샷을 뜬다 (`cp`는 위험).

### 10-2. 디스크 전체 → EBS 스냅샷 (DLM)

10-1이 앱 데이터를 지킨다면, 이건 **인스턴스가 통째로 죽었을 때** 몇 분 만에
복구하기 위한 것이다. Lightsail에는 없는 개념이다.

EC2 → **Lifecycle Manager** → Create lifecycle policy

- 정책 유형: **EBS snapshot policy**
- 대상: 리소스 유형 `Volume`, 태그로 지정 (인스턴스 볼륨에 `Backup=myhome` 태그를 먼저 달 것)
- 스케줄: 매일 1회, 보존 7개
- IAM 역할: `AWSDataLifecycleManagerDefaultRole` (콘솔이 자동 생성 제안)

10GB 볼륨의 증분 스냅샷이라 월 $0.3 안팎이다.

---

# 운영

## 일상 배포

```bash
git push origin master     # 이게 전부다
```

## 롤백

ECR에 SHA 태그가 남아 있으므로 이전 커밋으로 즉시 되돌릴 수 있다:

```bash
aws ssm start-session --target <인스턴스ID>
sudo /usr/local/bin/myhome-deploy <되돌릴-커밋-SHA>
```

## 상태 확인

```bash
aws ssm start-session --target <인스턴스ID>

docker compose -f /srv/myhome/docker-compose.prod.yml logs -f myhome
docker stats --no-stream     # 메모리
free -h                      # 스왑 사용량
df -h /                      # 디스크 (이미지가 쌓이면 여기가 먼저 찬다)
```

> EC2는 **메모리 지표를 기본 제공하지 않는다** (CloudWatch는 하이퍼바이저에서
> 보이는 것만 수집한다). 메모리를 대시보드에서 보려면 CloudWatch 에이전트를
> 따로 설치해야 한다 — 다음 학습 주제로 좋다.

## 비상용 수동 배포

CI가 멈췄거나 커밋 안 한 변경을 급히 확인해야 할 때:

```bash
cd ~/claude/myHome/deploy
cp deploy.env.example .env.deploy   # SSH_HOST / SSH_KEY / ECR_REGISTRY 입력
./deploy.sh
```

Mac(arm64)에서 빌드해 SSH로 밀어넣는다. ECR을 거치지 않고 `:local` 태그를 쓴다.
끝나면 `myhome-deploy latest`로 정상 경로에 복귀시킨다.

## 정리 (과금 중단)

공부가 끝나 전부 지울 때, **순서대로** 지워야 고아 리소스가 안 남는다:

1. EC2 인스턴스 종료 (Terminate) — EBS 루트 볼륨도 함께 삭제됨
2. **Elastic IP 릴리스** ← 안 하면 연결 안 된 IP에도 계속 과금된다
3. ECR 리포지토리 삭제
4. S3 버킷 비우고 삭제 / EBS 스냅샷 삭제
5. Route 53 호스팅 존 삭제 (도메인 등록은 별개 — 자동 갱신을 끄지 않으면 내년에 청구된다)
6. IAM 역할 2개 + OIDC 공급자 삭제

Billing → **Cost Explorer**로 며칠 뒤 잔여 과금이 없는지 확인하는 습관을 들일 것.

---

# 문제 해결

| 증상 | 확인 |
|---|---|
| Actions `deploy` 잡이 인증 실패 | 신뢰 정책의 `sub`가 `repo:<OWNER>/<REPO>:ref:refs/heads/master`와 정확히 일치하는가. 리포명 대소문자도 맞아야 한다 |
| `SendCommand` 권한 오류 | 3-2 정책의 인스턴스 ARN이 실제 인스턴스 ID인가 |
| SSM 명령이 `Undeliverable` | 인스턴스 역할에 `AmazonSSMManagedInstanceCore`가 있는가. 역할을 나중에 붙였으면 재부팅 |
| Caddy 인증서 발급 실패 | `dig +short home.도메인`이 EIP를 반환하는가 / SG의 80번이 `0.0.0.0/0`인가 / 한도에 걸렸다면 `ACME_CA` 스테이징으로 |
| 컨테이너가 DB 못 씀 | `ls -ln /srv/myhome/data` 소유자가 `1654:1654`인가 |
| 배포 후 메모리 부족 | `free -h`로 스왑 확인. 계속 부족하면 t4g.small(2GB, 월 $12.26)로 인스턴스 유형 변경 (중지 → 유형 변경 → 시작, EIP는 유지됨) |
| 디스크 가득 참 | `docker image prune -af`. ECR 라이프사이클 정책이 걸려 있는지도 확인 |
