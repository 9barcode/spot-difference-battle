# Spot Difference Battle Web

> 문서 상태: CURRENT
> 이 폴더는 pnpm workspace의 `@spot-battle/web` 패키지다.

## 활성 앱

`src/main.tsx`가 `src/app/MvpApp.tsx`를 렌더한다. `src/app/App.tsx`는 Figma Make에서 가져온 비활성 참고 시안이며 현재 게임 규칙이나 화면의 기준이 아니다.

## 실행

저장소 루트에서:

```powershell
pnpm --filter @spot-battle/web dev
```

웹과 서버를 함께 실행하려면 루트에서:

```powershell
pnpm dev
```

기본 웹 주소는 `http://localhost:5173`이다. 서버 주소는 `VITE_SERVER_URL`로 바꿀 수 있으며 기본값은 로컬 서버 설정을 따른다.

## 검사

```powershell
pnpm --filter @spot-battle/web check
pnpm --filter @spot-battle/web test
pnpm --filter @spot-battle/web build
```

이 폴더에서 별도의 `npm install`을 실행하지 않는다. 의존성은 저장소 루트의 pnpm workspace에서 관리한다.
