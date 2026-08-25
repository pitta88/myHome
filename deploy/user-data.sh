#!/bin/bash
# EC2 인스턴스 최초 부팅 시 root로 1회 실행된다 (Advanced details → User data).
#
# 이걸 user data로 넣어두면 인스턴스를 지웠다 다시 만드는 실험이 쉬워진다 —
# 서버를 손으로 세팅하지 않으므로 "재현 가능한 인프라"를 체감할 수 있다.
# 실행 로그: /var/log/cloud-init-output.log
set -eux

# ── Docker ──────────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# ── 스왑 2GB ────────────────────────────────────────────────────────────
# 1GB 인스턴스의 안전망. 이미지 로드나 트래픽 피크 때 OOM을 막는다.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── 데이터 디렉터리 ─────────────────────────────────────────────────────
# 1654는 컨테이너의 비루트 app 유저 UID (mcr.microsoft.com/dotnet/aspnet).
# 호스트 쪽 소유권을 맞춰줘야 컨테이너가 SQLite와 업로드 파일을 쓸 수 있다.
mkdir -p /srv/myhome/data/wwwroot/uploads /srv/myhome/data/wwwroot/photos
chown -R 1654:1654 /srv/myhome/data
chown ubuntu:ubuntu /srv/myhome

# ── 도구 ────────────────────────────────────────────────────────────────
apt-get update
apt-get install -y sqlite3 unzip

# awscli v2 (arm64). apt의 v1은 오래됐다.
# t3(인텔) 인스턴스라면 aarch64 → x86_64 로 바꿀 것.
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# ── SSM 에이전트 ────────────────────────────────────────────────────────
# Ubuntu 24.04 AWS AMI에는 snap으로 기본 탑재되어 있다. 확인차 기동만 시킨다.
snap start amazon-ssm-agent || systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service || true

echo "✅ user-data 완료"
