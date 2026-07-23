import { defineConfig } from "vitest/config";

// 이 저장소가 다른 Vite 프로젝트 아래에 있어도 상위 설정을 상속하지 않는다.
export default defineConfig({
  test: {},
});
