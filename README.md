# Spot Difference Battle

> 문서 상태: CURRENT

한 플레이어가 객체 3개를 수정해 문제를 만들고 다른 플레이어가 차이를 찾는 실시간 1대1 틀린그림찾기 웹게임입니다. 같은 흐름을 혼자 확인하는 1인 테스트 모드도 제공합니다.

## 현재 게임 방식

1. 먼저 매칭된 플레이어가 제작자, 두 번째 플레이어가 찾는 사람이 됩니다.
2. 양쪽이 준비하면 제작자에게 30초의 편집 시간이 주어집니다.
3. 제작자는 장면의 서로 다른 객체 3개에 색상·확대·무늬·윤곽 효과를 적용합니다.
4. 제작 중 찾는 사람에게 그림·선택 객체·정답 위치를 보내지 않습니다.
5. 제작자가 제출하면 찾는 사람에게 원본과 완성된 PNG 문제 이미지를 제공합니다.
6. 찾는 사람이 60초 안에 3개를 모두 찾으면 승리합니다.
7. 시간 안에 완료하지 못하면 제작자가 승리합니다.
8. 오답은 3초 차감되고 힌트는 한 번 사용할 수 있습니다.
9. 제작자가 마감까지 제출하지 못하거나 플레이어가 10초 안에 재접속하지 못하면 기권 처리됩니다.

정상 경기에는 동점 비교나 무승부가 없습니다. 결과 화면에서는 현재 로비 이동과 신고를 제공합니다. 재대전과 결과 화면 즉시 새 매칭은 보류 기능입니다.

## 현재 단계

핵심 비대칭 경기와 저장·복구·브라우저 테스트가 연결된 세로형 MVP입니다. 아직 출시 후보는 아닙니다.

출시 전에 필요한 주요 작업:

- 라이선스가 확인된 장면 10개
- 완료 문제와 정답의 신고 감사용 보관
- 운영 로그·지표·모니터링
- 스테이징 배포와 복구 검증

현재 장면 카탈로그에는 라이선스가 확인되지 않은 `prototype-room` 한 개만 있습니다.

## 프로젝트 구성

- `UI/`: 현재 React 웹 앱, 객체 편집기와 비활성 Figma 참고 시안
- `apps/server/`: Fastify·Socket.IO 서버와 PostgreSQL 저장소
- `packages/shared/`: 공유 타입, 상태와 게임 수치
- `packages/game-core/`: 서버 권한 역할·타이머·승패 판정
- `docs/`: 현재 규칙, 기술, 화면, 테스트와 역사 기록
- `e2e/`: Playwright 브라우저 테스트

활성 웹 진입점은 `UI/src/main.tsx`이며 `MvpApp`을 렌더합니다. `UI/src/app/App.tsx`는 차이점 5개·랭킹·상점 등이 포함된 비활성 과거 시안으로 구현 기준이 아닙니다.

## 문서

- [문서 운영 기준](docs/DOCUMENTATION.md)
- [MVP 결정 기록](docs/MVP_DECISIONS.md)
- [게임 규칙](docs/GAME_RULES.md)
- [게임 상태](docs/GAME_STATE.md)
- [게임 기획](docs/GAME_DESIGN.md)
- [사용자 흐름](docs/USER_FLOW.md)
- [화면 명세](docs/SCREEN_SPEC.md)
- [기술 설계](docs/TECH_SPEC.md)
- [테스트 계획](docs/TEST_PLAN.md)
- [구현 백로그](docs/IMPLEMENTATION_BACKLOG.md)
- [UI 현황 점검](docs/UI_AUDIT.md)
- [게임 장면 에셋 가이드](docs/GAME_ASSETS.md)

제품 방향은 `MVP_DECISIONS.md`, 게임 판정은 `GAME_RULES.md`, 상태 전이는 `GAME_STATE.md`를 우선합니다. 실제 판정 수치는 공유 `GAME_CONFIG`가 실행 기준입니다. 날짜별 `CHANGES_*.md`와 과거 릴리스는 역사 기록이며 현재 규칙보다 우선하지 않습니다.

## 로컬 실행

필요 항목:

- Node.js
- pnpm 11.9.0
- 선택 사항: PostgreSQL을 실행할 Docker Desktop

저장소를 처음 준비할 때:

```powershell
pnpm setup
```

웹과 서버 실행:

```powershell
pnpm dev
```

- 웹: `http://localhost:5173`
- 서버 상태: `http://localhost:3001/health`

UI만 실행:

```powershell
pnpm --filter @spot-battle/web dev
```

서버만 실행:

```powershell
pnpm --filter @spot-battle/server dev
```

## 검사와 테스트

```powershell
pnpm check
pnpm test
pnpm build
```

`pnpm test`는 `DATABASE_URL`이 없으면 실제 PostgreSQL 재시작 통합 테스트를 건너뜁니다.

브라우저 엔진을 처음 설치하고 E2E를 실행하려면:

```powershell
pnpm e2e:install
pnpm e2e
```

현재 E2E는 Chromium·Firefox·WebKit에서 닉네임·매칭, 역할·준비, 제작 화면 비공개, 객체 3개 선택, 데스크톱·모바일 조합, 기권 결과 동기화를 확인합니다. 브라우저에서 정답 3개를 직접 찾아 정상 결과까지 완료하는 시나리오는 백로그에 있습니다.

## PostgreSQL

PostgreSQL 없이 실행하면 메모리 저장소를 사용합니다. Docker가 준비된 경우:

```powershell
docker compose up -d postgres
$env:DATABASE_URL="postgresql://postgres:spot-battle-local-only@127.0.0.1:5432/spot_difference_battle"
pnpm --filter @spot-battle/server db:migrate
pnpm dev
```

같은 PowerShell 창에서 실제 PostgreSQL 테스트:

```powershell
$env:DATABASE_URL="postgresql://postgres:spot-battle-local-only@127.0.0.1:5432/spot_difference_battle"
pnpm --filter @spot-battle/server test
```

환경변수 전체 목록은 `.env.example`을 참고합니다.
