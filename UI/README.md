# Spot Difference Battle Web

> 문서 상태: CURRENT
> 기준일: 2026-09-01
> 이 폴더는 pnpm workspace의 `@spot-battle/web` 패키지다.
> 프로젝트 문서의 시작점은 `../docs/README.md`다.

## 활성 앱

`src/main.tsx`가 `src/app/MvpApp.tsx`를 렌더한다. 현재 앱은 원본·변경본 동시 빨리찾기 화면을 구현하며 `../docs/GAME_RULES.md`와 `../docs/SCREEN_SPEC.md`를 따른다.

웹은 서버 스냅샷을 표시하고 입력 좌표를 전달한다. 시간, 정답, 점수와 승패를 독립적으로 확정하지 않는다.

## 실행

저장소 루트에서:

```powershell
pnpm --filter @spot-battle/web dev
```

웹과 서버를 함께 실행하려면 `pnpm dev`를 사용한다. 기본 웹 주소는 `http://localhost:5173`이며 서버 주소는 `VITE_SERVER_URL`로 바꿀 수 있다. 개발 모드에서는 LAN에 바인딩하며, 다른 기기가 PC의 사설 IP로 접속하면 API도 같은 PC의 `3001` 포트를 자동 사용한다.

## 검사

```powershell
pnpm --filter @spot-battle/web check
pnpm --filter @spot-battle/web test
pnpm --filter @spot-battle/web build
```

사용자 흐름·반응형·브라우저 동작 변경은 저장소 루트에서 관련 Playwright 테스트도 실행한다.

```powershell
pnpm e2e
```

이 폴더에서 별도의 `npm install`을 실행하지 않는다. 의존성은 저장소 루트의 pnpm workspace에서 관리한다.

## 앱인토스

앱인토스 SDK 3.1.1 설정은 `apps-in-toss.config.ts`에 있고 변경 불가 appName `spot-difference-syk`를 사용한다. `UI/.env.apps-in-toss.example`을 복사한 뒤 정상 동작하는 운영 HTTPS 서버 origin을 입력한다. 예시 값이나 `/health`가 실패하는 서버로 `.ait`를 만들지 않는다.

```powershell
pnpm dev:ait
pnpm build:ait
```

`dev:ait`는 공식 devtools의 게임 내비게이션·가로 화면·Safe Area mock을 사용한다. 실제 출시 절차와 외부 증빙은 `../docs/APPS_IN_TOSS_RELEASE.md`를 따른다.
