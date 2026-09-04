import { useEffect } from "react";

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const propertyNames = {
  top: "--ait-safe-area-top",
  right: "--ait-safe-area-right",
  bottom: "--ait-safe-area-bottom",
  left: "--ait-safe-area-left",
} as const;

function applyInsets(insets: Insets): void {
  const root = document.documentElement;
  root.classList.add("apps-in-toss");
  for (const side of Object.keys(propertyNames) as Array<keyof Insets>) {
    const value = Number.isFinite(insets[side])
      ? Math.max(0, insets[side])
      : 0;
    root.style.setProperty(propertyNames[side], `${value}px`);
  }
}

function clearInsets(): void {
  const root = document.documentElement;
  root.classList.remove("apps-in-toss");
  for (const propertyName of Object.values(propertyNames)) {
    root.style.removeProperty(propertyName);
  }
}

export function useAppsInTossSafeArea(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let restoreOrientation: (() => void) | undefined;

    void import("@apps-in-toss/web-framework")
      .then(({ SafeAreaInsets, Screen }) => {
        if (cancelled) return;
        void Screen.setOrientation({ type: "landscape" }).catch(() => undefined);
        restoreOrientation = () => {
          void Screen.setOrientation({ type: "portrait" }).catch(() => undefined);
        };
        applyInsets(SafeAreaInsets.get());
        unsubscribe = SafeAreaInsets.subscribe({
          onEvent: (insets) => applyInsets(insets),
        });
      })
      .catch(() => {
        // 일반 브라우저에는 앱인토스 브리지가 없으므로 CSS env() fallback을 사용한다.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      restoreOrientation?.();
      clearInsets();
    };
  }, []);
}
