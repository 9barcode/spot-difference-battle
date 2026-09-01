# 요구사항 추적표

> 문서 상태: CURRENT
> 기준일: 2026-08-31
> 책임 역할: QA 책임자

이 표는 핵심 요구사항이 정본, 구현과 자동 검증에 연결되는지 보여준다. `검증`은 테스트 코드가 존재하고 최근 기본 테스트에서 통과한 항목, `조건부`는 외부 환경이 있어야 실행되는 항목, `부분`은 필수 검증이나 운영 요소가 남은 항목이다.

| ID | 요구사항 | 정본 | 주요 구현 | 자동 검증 | 상태 |
|---|---|---|---|---|---|
| GAME-001 | 같은 설정의 두 플레이어에게 같은 문제 순서·버전을 제공 | `GAME_RULES` 2~3 | `match-registry.ts`, `game-puzzles.ts` | `match-registry.test.ts`, `two-player-match.spec.ts` | 검증 |
| GAME-002 | 양쪽 이미지 로드 후 서버 기준 카운트다운·마감 | `GAME_RULES` 3, 6 | `GameMatch`, `server.ts` | `match.test.ts`, `two-player-match.spec.ts` | 검증 |
| GAME-003 | 각 플레이어가 독립적으로 문제를 완료·이동 | `GAME_RULES` 1, 4 | `GameMatch.guess` | 코어·서버·E2E | 검증 |
| GAME-004 | 서버가 정답·중복·오답·잠금을 판정 | `GAME_RULES` 4 | `GameMatch.guess` | `match.test.ts` | 검증 |
| GAME-005 | 첫 전체 완주 즉시 승리, 시간 종료 시 총점→오답→무승부 | `GAME_RULES` 5 | `GameMatch.finish`, 내부 `determineWinner` | `match.test.ts`, 서버 E2E | 부분: 중복 구형 함수 정리 필요 |
| GAME-006 | 모드별 시간·생존 한도와 난이도별 판정·잠금 | `GAME_RULES` 1, `GAME_MODES` | 공유 `GAME_MODE_RULES`, `GAME_DIFFICULTY_RULES` | 코어·레지스트리·E2E | 검증 |
| GAME-007 | 기권·10초 재접속 유예·신뢰 불가 취소 | `GAME_RULES` 7 | `server.ts`, `GameMatch` | 코어·서버 테스트 | 부분: 실제 스테이징 재접속 검수 필요 |
| PRIV-001 | 경기 중 미발견 정답과 상대 발견 위치 비공개 | `GAME_RULES` 4, 6, 8 | `GameMatch.snapshot` | `match.test.ts`, E2E | 검증 |
| UX-001 | 데스크톱·가로 게임 WebView 좌우, 세로 모바일 상하 비교와 동기화 확대·이동 | `SCREEN_SPEC` | `MvpApp.tsx`, `index.css`, `image-geometry.ts` | UI 단위·844×390 포함 3브라우저 E2E | 부분: 앱인토스 실기기 Safe Area·접근성 QA 필요 |
| DATA-001 | 활성 경기 저장·복구와 손상 행 격리 | `TECH_SPEC` | `match-store.ts`, `server.ts` | 메모리·복구 통합, PostgreSQL 조건부 | 조건부 |
| DATA-002 | 완료 경기 문제 버전·정답·양쪽 결과 감사 저장 | `GAME_RULES` 10 | `match-store.ts`, migration 004 | 저장소·PostgreSQL 조건부 | 부분·조건부: 이미지 해시·권리 스냅샷 미보존 |
| RESULT-001 | 결과에서 양쪽 점수 구성·오답과 종료 사유 공개 | `GAME_RULES` 8 | `MvpApp.tsx`, `GameMatch.snapshot` | 서버·E2E | 부분: 상대 오답 비공개 |
| REPORT-001 | 완료·취소 경기에서 플레이어당 1회 신고 | `GAME_RULES` 10 | `server.ts`, `match-store.ts` | 저장소·서버 통합 | 검증 |
| ASSET-001 | 문제 파일·버전·해시·난이도·권리 상태 일치 | `GAME_ASSETS` | `puzzle-asset-manifest.ts`, 양쪽 카탈로그 | UI·서버 매니페스트 테스트 | 검증 |
| ASSET-002 | 활성 문제 모바일 식별성·화풍·크롭·권리 육안 승인 | `GAME_ASSETS` | 운영 QA 기록 | 템플릿만 존재 | 부분 |
| OPS-001 | 서버와 DB 상태 확인 및 단일 컨테이너 기동 | `DEPLOYMENT`, `OPERATIONS` | `/health`, Dockerfile | 정적 웹 통합·Docker healthcheck | 부분: 실제 스테이징 증거 필요 |
| OPS-002 | CI, 관측, 알림, 백업·복원과 롤백 훈련 | `QUALITY_GATES`, `OPERATIONS` | 일부 로그와 Render 롤백 | 자동화 없음 | 미완료 |

## 추적 규칙

- 새 핵심 요구사항은 고유 ID, 정본, 구현 위치, 테스트와 상태를 추가한다.
- 규칙을 삭제해도 ID를 재사용하지 않는다. `RETIRED`로 남기고 결정 기록을 연결한다.
- 코드 변경이 요구사항을 만족했다고 표시하려면 자동 테스트 또는 명시적 수동 증거가 있어야 한다.
- 조건부 테스트가 CI나 검토 환경에서 실행되지 않았으면 `검증`으로 승격하지 않는다.
- 추적표와 실제 코드가 다르면 해당 작업은 완료가 아니다.

## 최근 검증 기준

2026-08-30 로컬에서 `pnpm check`, `pnpm test`, `pnpm build`가 통과했다. 단위·통합 테스트는 63개가 통과했고 실제 PostgreSQL이 필요한 2개는 건너뛰었다. 이후 코드 변경이 없었으므로 이 기준은 문서 감사의 출발점으로 사용했으며, 다음 코드 변경 또는 릴리스 전에 다시 실행해야 한다.
