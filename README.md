# Spot Difference Battle

> 문서 상태: CURRENT
> 현재 게임 규칙의 유일한 Markdown 정본은 [`docs/GAME_RULES.md`](docs/GAME_RULES.md)다.

두 플레이어가 동일한 원본과 변경본을 비교하고, 차이점 3개를 찾을 때마다 각자 다음 이미지로 이동해 제한시간 동안 더 많이 푸는 실시간 1대1 게임입니다.

## 다음 게임 방식

1. 두 플레이어가 매칭·준비한다.
2. 서버가 양쪽에 동일한 문제 순서를 배정한다.
3. 이미지 로드 후 3초 카운트다운으로 동시에 시작한다.
4. 변경본에서 차이 3개를 찾는다.
5. 모두 찾은 플레이어는 상대를 기다리지 않고 다음 이미지로 이동한다.
6. 3분 동안 완료한 문제 수가 많은 플레이어가 승리한다.
7. 완료 수가 같으면 현재 발견 수, 오답이 적은 순서로 판정하고 모두 같으면 무승부다.
8. 경쟁전 힌트와 문제별 선착 보너스는 없다.
9. 오답은 1초 입력 잠금이며 재접속 유예는 10초다.

현재 웹·서버는 이 규칙의 동시 대전 흐름을 구현한다.

## 에셋 상태

- 숲과 바다: 원본·변경본과 수동 정답 3곳 등록 완료, 플레이 난이도 검수 필요
- 카페·도시·연구실: 유효한 변경본 필요
- 거실: 라이선스 미확인으로 출시 제외

내부 기능 검증에는 5세트 이상, 3분 경기에는 반복되지 않는 10세트 이상, 초기 반복 서비스에는 20~30세트를 목표로 한다.

## 프로젝트 구성

- `UI/`: React 웹 앱
- `apps/server/`: Fastify·Socket.IO 서버와 PostgreSQL 저장소
- `packages/shared/`: 공유 타입·상태·게임 수치
- `packages/game-core/`: 서버 권한 판정
- `docs/`: 규칙·상태·기술·화면·테스트와 역사 기록
- `e2e/`: Playwright 브라우저 테스트

활성 웹 진입점은 `UI/src/main.tsx`이며 `MvpApp`을 렌더한다.

## 주요 문서

- [문서 운영 기준](docs/DOCUMENTATION.md)
- [게임 규칙](docs/GAME_RULES.md)
- [MVP 결정 기록](docs/MVP_DECISIONS.md)
- [게임 상태](docs/GAME_STATE.md)
- [게임 기획](docs/GAME_DESIGN.md)
- [사용자 흐름](docs/USER_FLOW.md)
- [화면 명세](docs/SCREEN_SPEC.md)
- [기술 설계](docs/TECH_SPEC.md)
- [테스트 계획](docs/TEST_PLAN.md)
- [구현 백로그](docs/IMPLEMENTATION_BACKLOG.md)
- [UI 현황 점검](docs/UI_AUDIT.md)
- [문제 에셋 가이드](docs/GAME_ASSETS.md)
- [스테이징 배포 가이드](docs/DEPLOYMENT.md)

날짜별 `CHANGES_*.md`와 과거 릴리스는 당시 구현의 역사 기록이다.

## 로컬 실행

필요 항목은 Node.js와 pnpm 11.9.0이며 PostgreSQL을 쓸 때만 Docker Desktop이 필요하다.

```powershell
pnpm setup
pnpm dev
```

- 웹: `http://localhost:5173`
- 서버 상태: `http://localhost:3001/health`

검사:

```powershell
pnpm check
pnpm test
pnpm build
```

자동 테스트는 동시 사전 로드·카운트다운·독립 정답 판정·첫 문제 완료 승패를 검증한다.

PostgreSQL 없이 실행하면 메모리 저장소를 사용한다. PostgreSQL·환경변수·배포 절차는 `.env.example`과 `docs/DEPLOYMENT.md`를 참고한다.
