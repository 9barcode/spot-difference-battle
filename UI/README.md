# Spot Difference Battle Web

> 문서 상태: CURRENT
> 이 폴더는 pnpm workspace의 `@spot-battle/web` 패키지다.

## 활성 앱

`src/main.tsx`가 `src/app/MvpApp.tsx`를 렌더한다. 현재 앱은 원본·변경본 동시 빨리찾기 화면을 구현하며 `../docs/GAME_RULES.md`와 `../docs/SCREEN_SPEC.md`를 따른다.

## 실행

저장소 루트에서:

```powershell
pnpm --filter @spot-battle/web dev
```

웹과 서버를 함께 실행하려면 `pnpm dev`를 사용한다. 기본 웹 주소는 `http://localhost:5173`이며 서버 주소는 `VITE_SERVER_URL`로 바꿀 수 있다.

## 검사

```powershell
pnpm --filter @spot-battle/web check
pnpm --filter @spot-battle/web test
pnpm --filter @spot-battle/web build
```

이 폴더에서 별도의 `npm install`을 실행하지 않는다. 의존성은 저장소 루트의 pnpm workspace에서 관리한다.
