# Spot Difference Battle

> 문서 상태: CURRENT
> 현재 게임 규칙의 유일한 Markdown 정본은 [`docs/GAME_RULES.md`](docs/GAME_RULES.md)다.

두 플레이어가 동일한 원본과 변경본을 비교하고, 문제마다 등록된 차이를 모두 찾으며 정답 점수와 완주 시간 가산점을 겨루는 실시간 1대1 게임입니다.

## 다음 게임 방식

1. 두 플레이어가 매칭·준비한다.
2. 서버가 양쪽에 동일한 문제 순서를 배정한다.
3. 이미지 로드 후 3초 카운트다운으로 동시에 시작한다.
4. 변경본에서 현재 문제에 등록된 차이를 찾는다.
5. 모두 찾은 플레이어는 상대를 기다리지 않고 다음 이미지로 이동한다.
6. 한 플레이어가 전체 문제를 먼저 완주하거나 제한시간이 끝나면 경기가 종료된다.
7. 정답 1개당 10점과 완주 시간 가산점을 합산하고, 동점이면 오답 수와 완주 시각 순으로 판정한다.
8. 경쟁전 힌트와 문제별 선착 보너스는 없다.
9. 난이도에 맞는 이미지 풀을 사용하며 오답 입력 잠금은 0.5~2초, 재접속 유예는 10초다.

현재 웹·서버는 이 규칙의 동시 대전 흐름을 구현한다.

## 에셋 상태

- EASY: 베이커리·우주·하와이·연금술·공룡·해적·일본 신사·한국 궁궐·중세 성 9세트
- MEDIUM: 마법의 버섯 숲·일본 닌자·한국 도깨비·중세 용 4세트
- HARD: 네온 사이버 도시 1세트
- UNRATED 공용: 바닷속 보물·겨울 산장 2세트
- 중세 연금술사: HARD 원본만 있어 변경본 추가 전까지 비활성
- 연구실: 유효한 변경본 필요
- 거실: 라이선스 미확인으로 출시 제외

전체 활성 문제는 16세트다. 현재 공용 문제를 포함해 EASY 11세트, NORMAL(MEDIUM) 6세트, HARD 3세트를 사용한다. 초기 반복 서비스에는 전체 20~30세트 이상을 목표로 한다.

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
- [게임 모드와 난이도](docs/GAME_MODES.md)
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

### 같은 Wi-Fi 휴대폰 테스트

1. PC와 휴대폰을 같은 Wi-Fi에 연결한다.
2. PC PowerShell에서 `ipconfig`로 Wi-Fi 어댑터의 IPv4 주소를 확인한다.
3. 저장소 루트에서 `pnpm dev`를 실행한다.
4. 휴대폰에서 `http://<PC의 IPv4 주소>:5173`으로 접속한다.

개발 웹은 접속한 PC 호스트의 `3001` 포트로 API를 자동 연결한다. Windows 방화벽 알림이 나오면 개인 네트워크만 허용한다. 이 기능은 같은 사설망의 개발 테스트용이며 인터넷에 직접 공개하는 용도가 아니다.

검사:

```powershell
pnpm check
pnpm test
pnpm build
```

자동 테스트는 동시 사전 로드·카운트다운·독립 정답 판정·점수·첫 완주자 즉시 승리를 검증한다.

PostgreSQL 없이 실행하면 메모리 저장소를 사용한다. PostgreSQL·환경변수·배포 절차는 `.env.example`과 `docs/DEPLOYMENT.md`를 참고한다.
