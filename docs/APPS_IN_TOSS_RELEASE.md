# 앱인토스 출시 기준과 절차

> 문서 상태: CURRENT
> 기준일: 2026-09-01
> 책임 역할: 제품 책임자·기술 책임자·운영 책임자

이 문서는 이 게임을 앱인토스 게임 미니앱으로 빌드하고 검수 요청하기 위한 저장소 기준이다. 공식 문서는 수시로 바뀌므로 제출 직전 링크의 최신 내용을 다시 확인한다. 실제 증빙이 없는 항목은 통과로 표시하지 않는다.

## 1. 현재 판정

코드와 로컬 자동 검증 범위는 앱인토스 Web SDK 3.1.1, CSR, HTTPS 서버 제한, 정확한 CORS 허용 목록, 게임용 내비게이션 여백, Safe Area, 가로 화면, 핀치 줌 비활성화, 종료 확인, 재연결 안내와 CI까지 반영됐다.

아래 항목이 끝나기 전에는 공개 출시 요청을 하면 안 된다.

- 콘솔의 앱 이름, 600×600 PNG 아이콘, 고객센터·홈페이지 등록
- 게임 사용자 식별키를 서버 계정에 연결할 목적·보존·삭제 정책 승인과 구현
- 게임 등급분류 증빙과 원본 플레이 화면 제출
- 활성 문제 16세트의 상업 이용·재배포 권리 승인
- 운영 서버·DB의 상시 기동, CORS, SLO, 알림, 백업·복원과 롤백 실증
- 토스 샌드박스와 QR 실앱에서 프로필, Safe Area, 가로 화면, 재접속, 2인 완주 검수

## 2. 공식 기준 대조표

| 영역 | 공식 요구 | 저장소 상태 | 출시 판정 |
|---|---|---|---|
| SDK | 지원되는 최신 SDK와 `ait build` 사용 | `@apps-in-toss/web-framework`·`devtools` 3.1.1, `apps-in-toss.config.ts` 사용 | 코드 충족 |
| 앱 설정 | 콘솔 `appName` 일치, 브랜드 색상·권한·내비게이션 설정 | 원격 main에서 확인한 변경 불가 `spot-difference-syk`, 권한 0개, 게임용 투명 내비게이션 | 코드 충족·콘솔 메타데이터 확인 필요 |
| 렌더링 | SSR 금지, CSR 또는 SSG | Vite CSR | 충족 |
| 접속 | 첫 화면 10초 이내 | 첫 화면은 서버 응답 전에 렌더링, 외부 폰트 제거 | 코드 충족·운영 콜드 스타트 실측 필요 |
| 네트워크 | 운영 WebSocket은 `wss://` | 앱인토스 빌드는 경로 없는 HTTPS 서버 origin만 허용 | 코드 충족·실서버 확인 필요 |
| CORS | 라이브·QR 테스트 origin 허용 | 쉼표 구분 정확한 origin allowlist 지원 | 코드 충족·운영 환경값 필요 |
| 전체 화면 | 게임 풀스크린과 지정 방향 정상 동작 | SDK `Screen.setOrientation(landscape)`, 640×360·844×390 레이아웃 | 코드 충족·실기기 확인 필요 |
| Safe Area | 시스템 UI와 게임용 더보기·X 버튼 비중첩 | SDK Safe Area 구독과 우측 게임 내비게이션 영역 확보 | 코드 충족·실기기 확인 필요 |
| 제스처 | 핀치 줌과 OS 뒤로가기 제스처 금지 | viewport 핀치 줌 차단, back-forward gesture 비활성 | 충족 |
| 종료 | 종료 시 확인 모달 | 경기 나가기 확인 모달, SDK X 버튼 확인은 호스트 제공 | 코드 충족·QR 확인 필요 |
| 사운드 | 사운드가 있으면 설정·백그라운드 제어 | 사운드·햅틱 미사용 | 해당 없음 |
| 권한 | 필요한 권한만 사전 고지 후 요청 | 요청 권한 없음 | 충족 |
| 광고·결제·리워드 | 사용 기능별 별도 심사 흐름 | 기능 없음 | 해당 없음 |
| 웹보드 | 성인 인증·확률·고객센터 | 이 게임은 웹보드·베팅·확률형 아이템이 아님 | 해당 없음 |
| 금지 코드 | 외부 코드 실행·히스토리 탈취 금지 | `eval`, `new Function`, 강제 location 이동 없음 | 충족 |
| 사용자 식별 | 게임 식별키 확인·저장, 기록 유지 | SDK API는 확인했으나 개인정보 정책과 서버 연결 미승인 | 차단 |
| 게임 프로필 | 시작 전 프로필 등록 | SDK에서 자동 노출되는 흐름을 QR로 확인해야 함 | 외부 확인 차단 |
| 주요 흐름 | 점수·스테이지·복구 오류 없음 | 서버 권위 판정과 자동 테스트 존재 | 자동 검증·실기기 완주 필요 |
| 번들 | 압축 해제 100MB 이하 | `.ait` 생성 후 실제 크기 기록 필요 | 실제 환경값 대기 |
| 등급분류 | 게임 등급 증빙 필수 | 증빙 없음 | 차단 |
| 운영 | 안정성·장애 대응·고객지원 | 로컬 health·로그만 존재, 운영 증거 없음 | 차단 |

## 3. 저장소 구성

- 설정: `UI/apps-in-toss.config.ts`
- 실제 값 예시: `UI/.env.apps-in-toss.example`
- SDK 전용 Vite 모드: `UI/vite.config.ts`
- Safe Area·화면 방향: `UI/src/app/use-apps-in-toss-safe-area.ts`
- 운영 서버 URL 검증: `UI/src/app/server-url.ts`, `UI/src/app/url-policy.ts`
- 서버 CORS: `apps/server/src/web-origin.ts`
- CI: `.github/workflows/ci.yml`

`.env.apps-in-toss`와 `.ait`는 Git에 올리지 않는다. 빈 값이나 예시 도메인을 실제 출시 값처럼 사용하지 않는다.

## 4. 실제 환경값 준비

`UI/.env.apps-in-toss.example`을 `UI/.env.apps-in-toss`로 복사하고 실제 운영 서버 값만 넣는다. 변경 불가 appName `spot-difference-syk`는 설정 파일에 고정돼 있다.

```dotenv
VITE_SERVER_URL=https://<운영 게임 서버 origin>
```

`VITE_SERVER_URL`에는 경로·쿼리·인증정보가 없는 HTTPS origin만 허용한다. 앱인토스 라이브와 QR 테스트 WebView는 별도 origin이므로 서버의 `WEB_ORIGIN`에 둘 다 정확히 넣는다.

```text
https://<appName>.apps.tossmini.com,https://<appName>.private-apps.tossmini.com
```

개발용 HTTP와 사설 IP는 개발 모드에서만 허용한다.

## 5. 개발·빌드·검증

Node.js 24와 저장소에 고정된 pnpm을 사용한다.

```powershell
pnpm install --frozen-lockfile
pnpm dev:ait
pnpm check
pnpm test
pnpm build
pnpm e2e
pnpm build:ait
```

`pnpm dev:ait`는 공식 devtools의 가로 화면·게임 내비게이션·Safe Area mock을 사용한다. mock 통과는 실기기 통과가 아니다. `pnpm build:ait`는 먼저 Vite 운영 번들을 만든 후 `<appName>.ait`를 만든다. 산출물은 압축 해제 기준 100MB 미만인지 확인한다.

2026-09-02 로컬 검증 결과는 `check` 통과, 단위·통합 테스트 79개 통과·PostgreSQL 실연동 2개 건너뜀, UI·서버 빌드 통과, Chromium·Firefox·WebKit E2E 9개 통과, 프로덕션 의존성 high 이상 취약점 0건이다. `.ait` 생성은 검증된 운영 서버가 없고 기존 staging 상태 확인이 HTTP 404이므로 수행하지 않았다. 정상 HTTPS 서버와 DB를 준비한 뒤 위 순서로 다시 검증해야 한다.

## 6. 토스앱 최종 검수

1. 샌드박스에서 최초 화면, 가로 회전, Safe Area, 내비게이션 더보기·X를 확인한다.
2. `.ait`를 콘솔에 올리고 QR 테스트용 앱스킴으로 실제 토스앱에서 실행한다.
3. iOS와 Android 각각에서 서로 다른 두 사용자로 매칭부터 완주까지 수행한다.
4. 네트워크 끊김·복귀, 서버 오류·재시도, 기권 확인, 신고를 확인한다.
5. 최초 화면 10초 이내, 조작 반응 2초 이내와 비정상 메모리·트래픽 증가가 없는지 측정한다.
6. 라이브 origin과 QR origin 모두에서 Socket.IO 연결과 CORS를 확인한다.
7. 게임 프로필이 시작 전에 실제로 노출되고 등록 전 플레이가 차단되는지 확인한다.
8. 결과와 로그를 릴리스 체크리스트에 기기·토스앱 버전·시각과 함께 기록한다.

## 7. 콘솔·검수 제출물

- 앱 이름과 설정의 변경 불가 `appName` 일치 확인
- 정사각형 600×600 PNG 아이콘: 배경색 필수, 투명 배경 금지
- 가로형 스크린샷 최소 1장: 1504×741 PNG 권장 규격
- 고객센터 문의 링크와 홈페이지
- 개인정보·이용정책과 데이터 보존·삭제 절차
- 게임 등급분류 정보와 요구되는 서명·사업자 또는 개인 정보
- 등급을 받은 버전과 앱인토스 버전의 편집하지 않은 플레이 화면 각 2장
- 문제 이미지별 원본·생성 도구·상업 이용·재배포 권리 증빙
- 운영 SLO, 알림 담당자, 백업·복원 결과와 롤백 지점

## 8. 공식 문서

- [게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-game.html)
- [SDK 2.x 이상 필수 마이그레이션](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/시작하기/SDK2.0.1.html)
- [설정](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/UI/Config.html)
- [내비게이션 바](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/UI/NavigationBar.html)
- [Safe Area](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/화면%20제어/safe-area.html)
- [WebView 속성](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/속성%20제어/webview-props.html)
- [권장 해상도](https://developers-apps-in-toss.toss.im/design/resolution.html)
- [게임 사용자 식별키](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/게임/getUserKeyForGame.html)
- [게임 프로필·리더보드](https://developers-apps-in-toss.toss.im/game-center/intro.html)
- [콘솔 앱 등록·등급분류](https://developers-apps-in-toss.toss.im/prepare/console-workspace.html)
- [토스앱 테스트](https://developers-apps-in-toss.toss.im/development/test/toss.html)
- [출시와 CORS 환경](https://developers-apps-in-toss.toss.im/development/deploy.html)
- [서비스별 운영 주의사항](https://developers-apps-in-toss.toss.im/intro/caution.html)

## 9. 롤백

앱인토스 변경을 되돌릴 때는 직전 승인 `.ait`와 서버 커밋을 함께 기준으로 삼는다. 서버 API가 호환되면 콘솔에서 직전 번들을 재출시하고 서버를 직전 정상 커밋으로 롤백한다. DB 변경이 포함되면 백업과 하위 호환을 먼저 확인하며 파괴적 스키마 롤백은 승인 없이 실행하지 않는다.
