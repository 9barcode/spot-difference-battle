# Spot Difference Battle

한 플레이어가 객체별 차이점을 만들고 다른 플레이어가 푸는 실시간 1대1 틀린그림찾기 웹게임입니다. 혼자 제작과 풀이를 확인하는 1인 테스트 모드도 제공합니다.

## 핵심 플레이

1. 온라인 대전에서는 먼저 매칭된 플레이어가 문제 제작자, 두 번째 플레이어가 찾는 사람이 됩니다.
2. 제작자는 고양이·화분·공·창문·구름·베개·소파·전등 등 분리된 객체 중 3개를 골라 색상이나 모양·무늬를 변경합니다.
3. 제작 중에는 찾는 사람에게 그림과 정답 정보가 표시되지 않습니다.
4. 제작자가 `수정 완료`를 누른 뒤에만 찾는 사람에게 원본과 완성된 문제 이미지가 전달됩니다.
5. 찾는 사람이 제한시간 안에 3개를 모두 찾으면 승리하고, 시간 안에 찾지 못하면 제작자가 승리합니다.
6. 1인 테스트 모드에서는 같은 흐름을 혼자 제작한 뒤 바로 풀어볼 수 있습니다.

## 현재 단계

핵심 재미와 규칙을 검증하는 MVP 기획 단계입니다. 현재 기준 수치는 차이점 제작 30초, 풀이 60초, 오답 시 3초 차감, 경기당 힌트 1회입니다. 테스트 결과에 따라 변경될 수 있습니다.

## 프로젝트 구성

- `UI/`: React와 Vite 기반 웹 앱 및 Figma 시안
- `apps/server/`: Fastify와 Socket.IO 기반 게임 서버
- `packages/shared/`: 웹과 서버가 공유하는 타입과 게임 설정
- `packages/game-core/`: 서버 권한 게임 규칙과 판정 로직
- `docs/`: 게임 기획, 규칙, 화면, 기술 및 테스트 문서
- `spot_difference_game_mockup_editable.svg`: 편집 가능한 화면 목업

## 문서

- [게임 기획](docs/GAME_DESIGN.md)
- [게임 규칙](docs/GAME_RULES.md)
- [사용자 흐름](docs/USER_FLOW.md)
- [화면 명세](docs/SCREEN_SPEC.md)
- [게임 상태](docs/GAME_STATE.md)
- [기술 설계](docs/TECH_SPEC.md)
- [테스트 계획](docs/TEST_PLAN.md)
- [MVP 결정 기록](docs/MVP_DECISIONS.md)
- [UI 시안 점검](docs/UI_AUDIT.md)
- [구현 백로그](docs/IMPLEMENTATION_BACKLOG.md)

문서 간 내용이 충돌할 경우 실제 판정 수치는 `GAME_RULES.md`, MVP 범위와 제품 방향은 `GAME_DESIGN.md`를 우선합니다.

## 로컬 실행

Node.js와 pnpm이 필요합니다.

```sh
pnpm install
pnpm dev
```

- 웹: `http://localhost:5173`
- 서버 상태 확인: `http://localhost:3001/health`

전체 타입 검사와 게임 규칙 테스트는 각각 `pnpm check`, `pnpm test`로 실행합니다. UI만 실행하려면 [UI/README.md](UI/README.md)를 참고합니다.

## 브라우저 E2E 테스트

처음 한 번 Playwright용 Chromium, Firefox와 WebKit을 설치한 뒤 브라우저 E2E 테스트를 실행합니다.

```sh
pnpm e2e:install
pnpm e2e
```

E2E 테스트는 격리된 로컬 포트에서 웹과 서버를 자동 실행합니다. Chromium·Firefox·WebKit에서 독립된 브라우저 컨텍스트 두 개의 매칭과 결과 동기화, 제작 중 찾는 사람의 화면 비공개, 객체별 선택, 키보드 탐색과 포커스 표시를 검증합니다.

## 로컬 데이터베이스

Docker가 설치되어 있다면 PostgreSQL을 다음과 같이 준비할 수 있습니다.

```sh
docker compose up -d postgres
pnpm --filter @spot-battle/server db:migrate
```

`DATABASE_URL`이 설정되면 서버는 경기 결과, 게스트와 신고뿐 아니라 진행 중인 경기 상태도 PostgreSQL에 저장합니다. 서버가 재시작되면 게스트 토큰으로 기존 경기와 제한시간을 복구하며, 접속하지 않은 플레이어에게는 재접속 유예시간이 적용됩니다. 설정하지 않은 로컬 환경에서는 메모리 저장소를 사용합니다. 필요한 환경변수는 `.env.example`을 참고합니다.

실제 PostgreSQL 재시작 복구 테스트는 데이터베이스를 준비한 뒤 실행합니다.

```sh
DATABASE_URL=postgresql://postgres:spot-battle-local-only@localhost:5432/spot_difference_battle pnpm --filter @spot-battle/server test
```
