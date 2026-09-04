# 프로젝트 표준 적용 기준

> 문서 상태: CURRENT
> 기준일: 2026-09-04
> 책임 역할: 제품·기술·QA·보안·운영 책임자

이 문서는 국제 표준을 그대로 복제하지 않고, 소규모 실시간 게임에 필요한 통제만 선택해 적용하는 기준이다. 표준 이름을 적는 것만으로 준수했다고 주장하지 않으며, 아래 산출물과 증거가 있을 때만 프로젝트 적용으로 인정한다.

## 적용 원칙

1. 요구사항은 고유 ID, 근거, 구현, 검증과 상태를 가진다.
2. 아키텍처는 이해관계자 관심사와 관점별로 설명한다.
3. 보안·개인정보는 개발 생명주기와 출시 게이트에 포함한다.
4. 접근성은 자동 검사만으로 완료하지 않고 실제 사용자 흐름을 검수한다.
5. 운영 목표는 측정 가능한 SLI·SLO와 대응 행동으로 정의한다.
6. 외부 심사와 사람 승인은 자동 테스트로 대체하지 않는다.

## 표준과 프로젝트 산출물

| 기준 | 프로젝트 적용 | 정본·증거 | 현재 상태 |
|---|---|---|---|
| ISO/IEC/IEEE 29148:2018 요구사항 공학 | 요구사항 ID, 검증 가능한 문장, 양방향 추적, 변경 통제 | `PROJECT_CHARTER`, `GAME_RULES`, `TRACEABILITY`, 변경 계약 | 부분 적용: 추적표 존재, 변경 계약 사용 정착 필요 |
| ISO/IEC/IEEE 42010:2022 아키텍처 기술 | 이해관계자·관심사·시스템 경계·관점·결정·품질 속성 | `TECH_SPEC`, `MVP_DECISIONS`, ADR | 부분 적용: 핵심 관점 존재, ADR 사용 정착 필요 |
| NIST SP 800-218 SSDF 1.1 | 역할, 보호된 개발, 안전한 구현, 취약점 대응 | `SECURITY_PRIVACY`, `DEVELOPMENT_PROCESS`, CI 증거 | 부분 적용: 로컬 통제 존재, CI·취약점 대응 운영 필요 |
| OWASP ASVS 5.0 | 웹 애플리케이션 보안 요구사항과 검증 범위 | `SECURITY_PRIVACY`, 보안 테스트 결과 | 부분 적용: 위협·입력·세션 통제 존재, 정식 검증표 필요 |
| WCAG 2.2 AA / ISO/IEC 40500:2025 | 키보드, 이름·역할, 대비, 포커스, 드래그 대안, 최소 대상 크기 | `SCREEN_SPEC`, `TEST_PLAN`, 실기기 접근성 기록 | 부분 적용: 자동 검증 일부, 수동·보조기술 검수 필요 |
| Google SRE SLI/SLO 방식 | 사용자 중심 지표, 측정창, 목표, 오류 예산, 대응 | `OPERATIONS`, 운영 대시보드·리포트 | 미완료: 공개 출시 전 목표와 측정 계층 필요 |
| 앱인토스 공식 출시 가이드 | 운영·기능·디자인·보안 검수, 게임 등급, 번들·실기기·콘솔 증거 | `APPS_IN_TOSS_RELEASE`, 릴리스 체크리스트 | 코드 부분 충족, 외부 증거 미완료 |

## 공식 참고 자료

- [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html)
- [ISO/IEC/IEEE 42010:2022](https://www.iso.org/standard/74393.html)
- [NIST SP 800-218 SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Google SRE Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [앱인토스 게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-game.html)
- [앱인토스 미니앱 출시](https://developers-apps-in-toss.toss.im/development/deploy.html)
- [앱인토스 콘솔 앱 등록](https://developers-apps-in-toss.toss.im/prepare/console-workspace.html)

## 적합성 표현

- `VERIFIED`: 요구사항과 증거가 현재 릴리스에 연결되고 필수 검증이 통과함
- `PARTIAL`: 일부 증거가 있으나 수동·외부·운영 검증이 남음
- `NOT_READY`: 필수 증거 또는 결정이 없음
- `NOT_APPLICABLE`: 적용 제외 근거와 승인자가 기록됨

프로젝트는 위 국제 표준에 대한 공식 인증을 주장하지 않는다. 이 문서는 표준에서 가져온 실무 원칙을 프로젝트 규모에 맞게 적용하는 프로파일이다.
