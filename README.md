# Spot Difference Battle

> 문서 상태: CURRENT
> 이 문서는 입문용 요약이다. 현재 게임 규칙의 유일한 Markdown 정본은 [`docs/GAME_RULES.md`](docs/GAME_RULES.md)다.

두 플레이어가 각자 객체 3개를 수정한 뒤 문제를 교환하고, 제한시간 안에 상대가 만든 차이를 찾는 실시간 1대1 대전 게임입니다. 같은 편집·찾기 흐름을 혼자 확인하는 1인 테스트 모드도 제공합니다.

## 현재 게임 방식

1. 양쪽이 준비하면 두 플레이어 모두에게 30초의 편집 시간이 주어집니다.
2. 각자 장면의 서로 다른 객체 3개를 수정해 제출합니다.
3. 양쪽 제출 전에는 상대의 그림·선택 객체·정답 위치를 보내지 않습니다.
4. 양쪽 제출이 끝나면 각 플레이어에게 상대가 만든 PNG 문제 이미지를 전달합니다.
5. 두 플레이어가 60초 동안 동시에 상대의 차이 3개를 찾습니다.
6. 발견 수, 오답 수, 마지막 정답 시각 순으로 승패를 비교합니다.
7. 오답은 3초 차감되고 힌트는 각자 한 번 사용할 수 있습니다.
8. 한쪽만 제작 마감까지 제출하지 못하거나 10초 안에 재접속하지 못하면 기권 처리됩니다.

모든 비교 조건이 같으면 무승부입니다. 결과 화면에서는 양쪽 결과 비교, 상대 문제의 정답 공개, 로비 이동과 신고를 제공합니다.

## 현재 단계

핵심 비대칭 경기와 저장·복구·브라우저 테스트가 연결된 세로형 MVP입니다. 아직 출시 후보는 아닙니다.

출시 전에 필요한 주요 작업:

- 라이선스가 확인된 장면 10개
- 완료 문제와 정답의 신고 감사용 보관
- 운영 로그·지표·모니터링
- 스테이징 배포와 복구 검증

현재 장면 카탈로그에는 6개 장면이 있습니다. `cartoon-laboratory`와 사용자 제작 정사각형 장면 4개는 라이선스가 확인됐고, `prototype-room`은 확인되지 않았습니다. 연구실은 1920×1080 출시 조건을 충족하며, 새 카페·숲·도시·바다 장면은 1024×1024 플레이 검증용이므로 출시 전 16:9 정본과 최종 마스크 육안 검수가 필요합니다.

## 프로젝트 구성

- `UI/`: 현재 React 웹 앱과 객체 편집기
- `apps/server/`: Fastify·Socket.IO 서버와 PostgreSQL 저장소
- `packages/shared/`: 공유 타입, 상태와 게임 수치
- `packages/game-core/`: 서버 권한 역할·타이머·승패 판정
- `docs/`: 현재 규칙, 기술, 화면, 테스트와 역사 기록
- `e2e/`: Playwright 브라우저 테스트

활성 웹 진입점은 `UI/src/main.tsx`이며 유일한 앱 구현인 `MvpApp`을 렌더합니다.

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

게임 규칙의 유일한 Markdown 정본은 `GAME_RULES.md`입니다. `MVP_DECISIONS.md`는 결정 근거, `GAME_STATE.md`는 상태 매핑이며 별도 규칙집이 아닙니다. 실제 판정 수치는 정본을 구현한 공유 `GAME_CONFIG`가 사용합니다. 날짜별 `CHANGES_*.md`와 과거 릴리스는 역사 기록입니다.

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

내부 테스트에서 특정 장면으로 고정하려면 서버 실행 전에 `GAME_SCENE_ID`를 설정합니다. 비우면 등록 장면 중 하나를 무작위로 선택합니다.

```powershell
$env:GAME_SCENE_ID="cartoon-laboratory"
pnpm dev
```
