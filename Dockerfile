# Stage 1: React 프론트엔드 빌드
FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: ASP.NET Core 백엔드 퍼블리시
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src/backend
COPY backend/MyHome.API/MyHome.API.csproj ./
RUN dotnet restore
COPY backend/MyHome.API/ ./
RUN dotnet publish -c Release -o /app/publish

# Stage 3: 런타임 (Kestrel이 API + SPA 정적 파일을 함께 서빙 — Option B)
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app/publish ./
COPY --from=frontend /src/frontend/dist ./wwwroot/
# /data: SQLite 볼륨 마운트 지점, uploads/photos: 사용자 파일 마운트 지점
# chown /app 전체: 호스트 파일의 제한적 권한(600 등)이 빌드 스테이지를 거쳐
# 보존되므로, 비루트 app 유저가 읽을 수 있게 소유권을 넘긴다
RUN mkdir -p /data wwwroot/uploads wwwroot/photos \
    && chown -R app:app /data /app
USER app
ENTRYPOINT ["dotnet", "MyHome.API.dll"]
