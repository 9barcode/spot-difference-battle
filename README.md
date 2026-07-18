# Spot Difference Battle

두 플레이어가 직접 차이점을 만든 뒤 서로의 문제를 푸는 실시간 1대1 틀린그림찾기 웹게임입니다.

## 핵심 플레이

1. 두 플레이어가 동일한 원본 그림을 받습니다.
2. 각자 제한시간 안에 차이점 3개를 만듭니다.
3. 완성된 문제를 서로 교환합니다.
4. 상대가 만든 차이점 3개를 먼저 찾는 플레이어가 승리합니다.

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

## 로컬 데이터베이스

Docker가 설치되어 있다면 PostgreSQL을 다음과 같이 준비할 수 있습니다.

```sh
docker compose up -d postgres
pnpm --filter @spot-battle/server db:migrate
```

`DATABASE_URL`이 설정되면 서버는 경기 결과, 게스트와 신고를 PostgreSQL에 저장합니다. 설정하지 않은 로컬 환경에서는 메모리 저장소를 사용합니다. 필요한 환경변수는 `.env.example`을 참고합니다.

PostgreSQL 저장소를 사용하는 경우 진행 중인 경기 상태도 매 변경마다 저장됩니다. 서버가 재시작되면 게스트 토큰과 활성 경기를 복원하고 기존 재접속 유예시간을 적용합니다. 메모리 저장소를 사용하는 기본 로컬 실행은 프로세스 재시작 후 상태가 유지되지 않습니다.
