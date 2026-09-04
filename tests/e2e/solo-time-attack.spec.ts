import { expect, test, type Page } from "@playwright/test";

async function clickNormalized(page: Page, x: number, y: number) {
  const board = page.getByTestId("modified-board");
  const box = await board.boundingBox();
  if (!box) throw new Error("솔로 변경본 보드를 찾을 수 없습니다.");
  await board.click({ position: { x: box.width * x, y: box.height * y } });
}

test("a solo player can finish five hard differences and keep a personal record", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("닉네임").fill("혼자찾기");
  await page.getByTestId("nickname-submit").click();
  await page.getByTestId("solo-mode-open").click();

  await expect(page.getByRole("heading", { name: "솔로 타임어택" })).toBeVisible();
  await expect(page.getByText("최고 기록 없음")).toHaveCount(5);
  await page.getByTestId("solo-puzzle-start").click();
  await expect(page.getByTestId("solo-playing")).toBeVisible({ timeout: 6_000 });

  for (const point of [
    { x: 0.27, y: 0.18 },
    { x: 0.58, y: 0.27 },
    { x: 0.92, y: 0.75 },
    { x: 0.17, y: 0.47 },
    { x: 0.38, y: 0.88 },
  ]) {
    await clickNormalized(page, point.x, point.y);
  }

  await expect(page.getByTestId("solo-finished")).toContainText("5개 모두 찾았습니다!");
  await expect(page.getByTestId("solo-finished")).toContainText("개인 최고기록");
  await page.getByRole("button", { name: "다른 문제" }).click();
  await expect(page.getByText(/최고 \d+\.\d{2}초/)).toHaveCount(1);
});
