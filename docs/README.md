# 문서 포털

> 문서 상태: CURRENT
> 기준일: 2026-09-01

이 문서는 사람과 AI가 프로젝트를 이해할 때 사용하는 단일 시작점이다. 새 작업은 아래 읽기 순서와 문서 권한을 따른다.

## 5분 시작 순서

1. [프로젝트 헌장](PROJECT_CHARTER.md)에서 목표·범위·출시 단계를 확인한다.
2. [게임 규칙](GAME_RULES.md)에서 실제 플레이 규칙과 수치를 확인한다.
3. [개발 프로세스](DEVELOPMENT_PROCESS.md)에서 현재 작업 단계를 정한다.
4. 아래 문서 지도에서 변경 영역의 명세를 읽는다.
5. [검토 필요 항목](REVIEW_REQUIRED.md)을 확인하고 미확정 사항을 임의로 결정하지 않는다.
6. [품질 게이트](QUALITY_GATES.md)로 필요한 검증을 정한다.

## 문서 권한

| 질문 | 정본 | 충돌 시 처리 |
|---|---|---|
| 왜 만들고 어디까지 만드는가 | `PROJECT_CHARTER.md` | 제품 책임자 결정 전 변경 중단 |
| 게임이 어떻게 동작하는가 | `GAME_RULES.md` | 출시 차단 결함으로 처리 |
| 결정 이유와 대안은 무엇인가 | `MVP_DECISIONS.md` 및 승인된 결정 기록 | 최신 승인 결정을 기준으로 정본 동기화 |
| 상태·화면·기술이 어떻게 구현되는가 | 해당 상세 명세 | 규칙 정본과 코드에 함께 맞춤 |
| 실제 실행 수치·계약은 무엇인가 | 공유 타입·게임 코어·마이그레이션 | 문서와 다르면 결함이며 임의 우선순위 없음 |
| 무엇을 해야 하는가 | `IMPLEMENTATION_BACKLOG.md` | 완료 증거 없는 체크 금지 |
| 무엇을 사람이 결정해야 하는가 | `REVIEW_REQUIRED.md` | 결정권자 승인 전 미확정 유지 |
| 과거에 무엇이 바뀌었는가 | `ReleaseNote.md`, `CHANGES_*.md` | 현재 규칙의 근거로 사용 금지 |

코드는 현재 배포 동작을 보여주고 정본은 의도한 동작을 정의한다. 둘이 다르면 어느 쪽도 몰래 덮어쓰지 않고 결함으로 등록한 뒤 함께 수정한다.

## 문서 지도

### 제품과 규칙

- [프로젝트 헌장](PROJECT_CHARTER.md): 목적, 대상 사용자, 범위, 비범위, 출시 단계
- [게임 기획](GAME_DESIGN.md): 핵심 재미와 제품 경험
- [게임 규칙](GAME_RULES.md): 역할, 시간, 점수, 승패, 공개 범위의 유일한 규칙 정본
- [게임 모드와 난이도](GAME_MODES.md): 모드·난이도 파생 설명
- [결정 기록](MVP_DECISIONS.md): 확정 결정의 이유와 변경 이력

### 경험과 구현

- [사용자 흐름](USER_FLOW.md): 정상·예외 흐름
- [화면 명세](SCREEN_SPEC.md): 화면별 요구사항
- [게임 상태](GAME_STATE.md): 상태 전이와 입력 권한
- [기술 설계](TECH_SPEC.md): 모듈, 계약, 데이터, 보안
- [문제 에셋 가이드](GAME_ASSETS.md): 이미지 쌍 등록·권리·품질 기준

### 실행과 품질

- [개발 프로세스](DEVELOPMENT_PROCESS.md): 제안부터 폐기까지 8단계 생명주기
- [AI 협업 규칙](AI_COLLABORATION.md): 바이브 코딩 작업 계약과 인수인계
- [품질 게이트](QUALITY_GATES.md): 변경 유형별 필수 검증
- [요구사항 추적표](TRACEABILITY.md): 규칙-코드-테스트 연결
- [테스트 계획](TEST_PLAN.md): 기능별 테스트 시나리오
- [구현 백로그](IMPLEMENTATION_BACKLOG.md): 우선순위와 완료 상태
- [UI 감사](UI_AUDIT.md): 현재 UI 구현과 남은 품질 작업

### 출시와 운영

- [앱인토스 출시 기준](APPS_IN_TOSS_RELEASE.md): 공식 심사 대조, SDK 구성, 실기기 검수와 제출물
- [배포 가이드](DEPLOYMENT.md): 현재 Render 스테이징 배포 방법
- [운영·유지보수](OPERATIONS.md): 출시, 관측, 장애, 백업, 유지보수 기준
- [검토 필요 항목](REVIEW_REQUIRED.md): 사람 결정과 외부 검증 대기 목록
- [변경 역사 색인](HISTORY_INDEX.md): 날짜별 기록 탐색

### 템플릿

- [변경 계약](templates/CHANGE_BRIEF.md)
- [결정 기록](templates/DECISION_RECORD.md)
- [AI 인수인계](templates/HANDOFF.md)
- [출시 체크리스트](templates/RELEASE_CHECKLIST.md)
- [장애 보고서](templates/INCIDENT_REPORT.md)
- [문제 에셋 QA](templates/PUZZLE_QA.md)

## 작업 유형별 최소 문서

| 변경 유형 | 반드시 확인·갱신할 문서 |
|---|---|
| 게임 규칙·밸런스 | `GAME_RULES`, `MVP_DECISIONS`, `GAME_MODES`, `TRACEABILITY`, `TEST_PLAN` |
| 상태·서버 계약 | `GAME_STATE`, `TECH_SPEC`, `TRACEABILITY`, `TEST_PLAN` |
| UI·사용자 흐름 | `USER_FLOW`, `SCREEN_SPEC`, `UI_AUDIT`, `TEST_PLAN` |
| 문제 에셋 | `GAME_ASSETS`, 에셋 QA 기록, `TEST_PLAN`, 백로그 |
| DB·마이그레이션 | `TECH_SPEC`, `OPERATIONS`, `QUALITY_GATES`, 결정 기록 |
| 배포·운영 | `APPS_IN_TOSS_RELEASE`, `DEPLOYMENT`, `OPERATIONS`, 출시 체크리스트 |
| 문서 체계 | `DOCUMENTATION`, 이 포털, 영향받는 링크 |

문서 생성·변경·폐기 규칙은 [문서 운영 기준](DOCUMENTATION.md)을 따른다.
