# 스테이징 배포

> 문서 상태: CURRENT
> 기준일: 2026-08-03

## 구성

운영 빌드는 Fastify, Socket.IO, React 정적 파일을 하나의 웹 서비스에서 같은 도메인으로 제공합니다. 브라우저는 별도 `VITE_SERVER_URL` 없이 현재 주소의 Socket.IO에 연결합니다. PostgreSQL이 설정되면 컨테이너 시작 전에 마이그레이션을 적용합니다.

- 웹·게임 서버: Docker 기반 단일 Node.js 서비스
- 상태 확인: `GET /health`
- 영속 저장소: PostgreSQL
- 기본 리전: Singapore
- 서버 검증용 원본: 컨테이너의 `/app/game-assets`
- 배포 정의: 루트의 `render.yaml`

## Render 테스트 배포

1. Render에 로그인하고 **New > Blueprint**를 선택합니다.
2. GitHub 저장소 `9barcode/spot-difference-battle`를 연결합니다.
3. 루트의 `render.yaml`을 선택해 Blueprint를 생성합니다.
4. 웹 서비스와 PostgreSQL이 모두 생성되고 첫 배포가 성공할 때까지 기다립니다.
5. 생성된 `https://...onrender.com/health`가 `status: ok`를 반환하는지 확인합니다.
6. PC와 모바일에서 같은 서비스 URL을 열고 서로 다른 닉네임으로 매칭·제작·찾기 흐름을 확인합니다.

같은 도메인으로 서비스하므로 Render에서는 `WEB_ORIGIN`과 `VITE_SERVER_URL`을 설정하지 않습니다. 별도 웹 도메인을 분리할 때만 서버에 정확한 `WEB_ORIGIN`, 웹 빌드에 `VITE_SERVER_URL`을 지정합니다.

## 무료 테스트 환경 주의사항

- 무료 웹 서비스는 유휴 상태가 지속되면 정지하므로 첫 접속이 느릴 수 있습니다.
- 무료 PostgreSQL은 임시 테스트용이며 만료·백업 제한이 있습니다.
- 무료 인스턴스는 단일 서버만 사용합니다. 여러 서버로 확장하려면 매칭 큐와 실시간 이벤트 상태를 Redis 등 공유 저장소로 이전해야 합니다.
- 실제 출시 전에는 유료 DB, 백업, 로그 보존, 알림과 롤백 훈련이 필요합니다.

## 로컬 운영 이미지 확인

```powershell
docker build -t spot-difference-battle:staging .
docker run --rm -p 3001:3001 spot-difference-battle:staging
```

브라우저에서 `http://localhost:3001`과 `http://localhost:3001/health`를 확인합니다. PostgreSQL 복구까지 확인하려면 `DATABASE_URL`을 컨테이너에 별도로 전달합니다.

## 롤백

1. Render의 웹 서비스 **Deploys** 화면에서 직전 정상 배포를 선택합니다.
2. **Rollback**을 실행합니다.
3. `/health`와 두 브라우저 매칭을 다시 확인합니다.
4. DB 스키마 변경이 포함된 경우 이전 애플리케이션과 호환되는지 먼저 확인하며, 파괴적 마이그레이션은 별도 복구 절차 없이 실행하지 않습니다.
