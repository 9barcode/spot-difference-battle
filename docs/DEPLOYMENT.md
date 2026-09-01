# 스테이징 배포

> 문서 상태: CURRENT
> 기준일: 2026-08-31
> 책임 역할: 운영 책임자

이 문서는 현재 Render 스테이징 실행 절차를 설명한다. 프로덕션 출시 기준, 관측, 장애, 백업과 유지보수는 `OPERATIONS.md`와 `QUALITY_GATES.md`를 따른다.

현재 저장소는 공개 프로덕션 출시 게이트를 충족하지 않는다.

## 구성

운영 빌드는 Fastify, Socket.IO, React 정적 파일을 하나의 웹 서비스에서 같은 도메인으로 제공한다. 브라우저는 별도 `VITE_SERVER_URL` 없이 현재 주소의 Socket.IO에 연결한다. PostgreSQL이 설정되면 컨테이너 시작 전에 마이그레이션을 적용한다.

- 웹·게임 서버: Docker 기반 단일 Node.js 서비스
- 상태 확인: `GET /health`
- 영속 저장소: PostgreSQL
- 기본 리전: Singapore
- 활성 문제 이미지: 웹 정적 빌드에 포함된 버전 WebP
- 배포 정의: 루트 `render.yaml`
- 실행 제약: 단일 서버 인스턴스

## 배포 전 게이트

1. 대상 커밋과 릴리스 범위를 고정한다.
2. `QUALITY_GATES.md`의 스테이징 게이트를 통과한다.
3. DB 변경이 있으면 실제 PostgreSQL 테스트, 백업과 호환성을 확인한다.
4. `templates/RELEASE_CHECKLIST.md`에 담당자, 증거와 롤백 지점을 기록한다.

## Render 테스트 배포

1. Render에 로그인하고 **New > Blueprint**를 선택한다.
2. GitHub 저장소 `9barcode/spot-difference-battle`를 연결한다.
3. 루트 `render.yaml`을 선택해 Blueprint를 생성한다.
4. 웹 서비스와 PostgreSQL이 모두 생성되고 첫 배포가 성공할 때까지 기다린다.
5. 생성된 `https://...onrender.com/health`가 서버·DB 정상 상태를 반환하는지 확인한다.
6. PC와 모바일에서 동일 문제 순서·사전 로드·동시 시작·독립 문제 이동·최종 결과를 확인한다.
7. 기권 또는 재접속, 신고와 DB 쓰기를 확인한다.
8. 배포 결과와 관찰 시간을 출시 체크리스트에 기록한다.

같은 도메인으로 서비스하므로 Render에서는 `WEB_ORIGIN`과 `VITE_SERVER_URL`을 설정하지 않는다. 별도 웹 도메인을 분리할 때만 서버에 정확한 `WEB_ORIGIN`, 웹 빌드에 `VITE_SERVER_URL`을 지정한다.

## 무료 테스트 환경 주의사항

- 무료 웹 서비스는 유휴 상태가 지속되면 정지하므로 첫 접속이 느릴 수 있다.
- 무료 PostgreSQL은 임시 테스트용이며 만료·백업 제한이 있다.
- 무료 인스턴스는 단일 서버만 사용한다. 여러 서버로 확장하려면 매칭 큐와 실시간 이벤트 상태를 공유 저장소로 이전해야 한다.
- 실제 출시 전에는 유료 DB, 백업·복원, 로그·지표·알림과 롤백 훈련이 필요하다.

## 로컬 운영 이미지 확인

```powershell
docker build -t spot-difference-battle:staging .
docker run --rm -p 3001:3001 spot-difference-battle:staging
```

브라우저에서 `http://localhost:3001`과 `http://localhost:3001/health`를 확인한다. PostgreSQL 복구까지 확인하려면 테스트 전용 `DATABASE_URL`을 컨테이너에 전달한다. 운영 DB를 로컬 테스트에 사용하지 않는다.

배포 시작 명령에서 마이그레이션을 실행해 `004_puzzle_manifest.sql`까지 적용됐는지 확인한다.

## 스모크 테스트

- 정적 웹과 Socket.IO 연결
- 두 플레이어 매칭과 준비
- 문제 버전·사전 로드·카운트다운
- 정답·오답·다음 문제와 첫 완주 결과
- 기권 또는 재접속
- 신고와 완료 경기 저장
- 서버·DB 상태 로그

## 롤백

1. Render의 웹 서비스 **Deploys**에서 직전 정상 배포를 선택한다.
2. DB 스키마가 직전 앱과 호환되는지 먼저 확인한다.
3. **Rollback**을 실행한다.
4. `/health`, 정적 웹, 두 브라우저 매칭과 한 경기 완주를 다시 확인한다.
5. 롤백 원인과 후속 작업을 출시 기록에 남긴다.

파괴적 마이그레이션은 별도 백업·복원과 승인 없이 실행하지 않는다. 문제 에셋은 파일을 덮어쓰지 않고 해당 버전을 비활성화해 되돌린다.
