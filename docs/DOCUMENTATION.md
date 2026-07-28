# 문서 운영 기준

> 문서 상태: CURRENT
> 기준일: 2026-07-29

## 1. 문서 우선순위

문서가 충돌할 때 다음 순서를 따른다.

1. `MVP_DECISIONS.md`: 제품 방향과 결정 이유
2. `GAME_RULES.md`: 현재 게임 판정과 수치
3. `GAME_STATE.md`: 서버 상태 전이와 역할별 입력
4. `TECH_SPEC.md`: 현재 기술 계약과 목표 구조
5. `SCREEN_SPEC.md`, `USER_FLOW.md`: 화면과 사용자 경험
6. `TEST_PLAN.md`, `IMPLEMENTATION_BACKLOG.md`: 검증 범위와 남은 작업
7. `README.md`: 입문용 요약

실제 판정 수치의 실행 기준은 `packages/shared/src/index.ts`의 `GAME_CONFIG`다. 문서와 코드가 다르면 차이를 숨기지 말고 결정 기록과 관련 문서를 한 변경에서 함께 갱신한다.

## 2. 상태 표기

- `CURRENT`: 현재 구현·확정 결정의 기준
- `PROPOSED`: 아직 구현되지 않은 제안
- `HISTORICAL`: 당시 변경을 설명하는 역사 기록
- `ARCHIVED`: 더 이상 사용하지 않는 문서

`CHANGES_*.md`와 과거 릴리스는 현재 규칙을 덮어쓰지 않는다.

## 3. 변경 체크리스트

게임 역할·수치·상태·화면을 바꿀 때:

- `MVP_DECISIONS.md`에 날짜·이유·영향 기록
- `GAME_RULES.md`와 `GAME_STATE.md` 갱신
- `USER_FLOW.md`와 `SCREEN_SPEC.md` 갱신
- `TECH_SPEC.md` 계약 영향 확인
- `TEST_PLAN.md`와 백로그 갱신
- README와 변경 이력 요약
- 구형 표현 전체 검색
- 타입 검사·단위·통합·브라우저 테스트 범위 확인

## 4. 역사 문서

날짜별 변경 요약은 당시 문제와 해결 과정을 보존한다. 이후 설계가 바뀌어 현재 구현과 달라도 원문을 다시 현재형으로 고치지 않고, 상단에 역사 기록과 대체된 결정을 표시한다.
