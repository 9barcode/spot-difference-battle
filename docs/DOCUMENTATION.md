# 문서 운영 기준 — 단일 규칙 정본

> 문서 상태: CURRENT
> 기준일: 2026-07-30

## 1. 단일 규칙 정본

게임의 역할, 행동 권한, 수치, 시간, 승패, 기권, 공개 범위와 신고 조건을 규정하는 Markdown 정본은 **`GAME_RULES.md` 하나뿐이다.**

- `packages/shared/src/index.ts`의 `GAME_CONFIG`는 정본에 적힌 수치를 실행하는 코드이며 별도의 기획 규칙이 아니다.
- `GAME_STATE.md`, `SCREEN_SPEC.md`, `USER_FLOW.md`와 README에 반복되는 내용은 정본을 구현·표시·요약한 파생 설명이다.
- `MVP_DECISIONS.md`는 결정 이유와 변경 이력을 보존하며 현재 규칙을 새로 정의하지 않는다.
- `TECH_SPEC.md`, `TEST_PLAN.md`, `IMPLEMENTATION_BACKLOG.md`는 각각 구현 계약, 검증 범위와 작업 상태를 설명하며 게임 규칙을 새로 정의하지 않는다.
- `CHANGES_*.md`와 과거 릴리스는 역사 기록이다.

파생 문서나 코드가 `GAME_RULES.md`와 다르면 우선순위로 둘 중 하나를 임의 선택하지 않는다. 이를 결함으로 처리하고, 결정 근거·정본·코드·파생 문서·테스트를 한 변경에서 함께 갱신한다.

## 2. 문서별 책임

| 문서 | 책임 | 규칙 정본 여부 |
|---|---|---|
| `GAME_RULES.md` | 현재 게임 규칙 전체 | 유일한 정본 |
| `MVP_DECISIONS.md` | 제품 결정 이유와 변경 이력 | 아님 |
| `GAME_STATE.md` | 규칙을 서버 상태와 입력 권한으로 매핑 | 아님 |
| `TECH_SPEC.md` | 현재 기술 계약과 목표 구조 | 아님 |
| `SCREEN_SPEC.md`, `USER_FLOW.md` | 규칙을 화면과 사용자 경험으로 매핑 | 아님 |
| `TEST_PLAN.md`, `IMPLEMENTATION_BACKLOG.md` | 검증 범위와 남은 작업 | 아님 |
| `README.md` | 입문용 요약과 실행 방법 | 아님 |

## 3. 상태 표기

- `CURRENT`: 현재 구현·확정 결정의 기준
- `PROPOSED`: 아직 구현되지 않은 제안
- `HISTORICAL`: 당시 변경을 설명하는 역사 기록
- `ARCHIVED`: 더 이상 사용하지 않는 문서

`CHANGES_*.md`와 과거 릴리스는 현재 규칙을 덮어쓰지 않는다.

## 4. 변경 체크리스트

게임 역할·수치·상태·화면을 바꿀 때:

- `MVP_DECISIONS.md`에 날짜·이유·영향 기록
- 유일한 규칙 정본 `GAME_RULES.md` 갱신
- `GAME_STATE.md`의 상태·입력 매핑 갱신
- `USER_FLOW.md`와 `SCREEN_SPEC.md` 갱신
- `TECH_SPEC.md` 계약 영향 확인
- `TEST_PLAN.md`와 백로그 갱신
- README와 변경 이력 요약
- 구형 표현 전체 검색
- 타입 검사·단위·통합·브라우저 테스트 범위 확인

## 5. 역사 문서

날짜별 변경 요약은 당시 문제와 해결 과정을 보존한다. 이후 설계가 바뀌어 현재 구현과 달라도 원문을 다시 현재형으로 고치지 않고, 상단에 역사 기록과 대체된 결정을 표시한다.
