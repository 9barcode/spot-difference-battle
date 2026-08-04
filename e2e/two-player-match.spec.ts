import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

async function createPlayer(browser: Browser, nickname: string, viewport: { width: number; height: number }): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("닉네임").fill(nickname);
  await page.getByTestId("nickname-submit").click();
  return { context, page };
}

async function clickNormalized(page: Page, x: number, y: number) {
  const image = page.getByRole("img", { name: /변경본$/ });
  const box = await image.boundingBox();
  if (!box) throw new Error("변경본 이미지 좌표를 찾을 수 없습니다.");
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  await page.waitForTimeout(160);
}

test("two players start together and the first player to find all differences wins", async ({ browser }) => {
  const first = await createPlayer(browser, "빠른사람", { width: 1280, height: 900 });
  const second = await createPlayer(browser, "도전자", { width: 390, height: 844 });
  try {
    await Promise.all([
      first.page.getByTestId("matchmaking-start").click(),
      second.page.getByTestId("matchmaking-start").click(),
    ]);
    await Promise.all([
      expect(first.page.getByTestId("ready-screen")).toBeVisible(),
      expect(second.page.getByTestId("ready-screen")).toBeVisible(),
    ]);
    await Promise.all([
      first.page.getByTestId("ready-button").click(),
      second.page.getByTestId("ready-button").click(),
    ]);
    await Promise.all([
      expect(first.page.getByTestId("countdown-screen")).toBeVisible(),
      expect(second.page.getByTestId("countdown-screen")).toBeVisible(),
    ]);
    await Promise.all([
      expect(first.page.getByTestId("playing-screen")).toBeVisible({ timeout: 6_000 }),
      expect(second.page.getByTestId("playing-screen")).toBeVisible({ timeout: 6_000 }),
    ]);
    await expect(first.page.getByRole("img", { name: /원본$/ })).toBeVisible();
    await expect(first.page.getByRole("img", { name: /변경본$/ })).toBeVisible();

    const heading = first.page.getByTestId("playing-screen").getByRole("heading");
    const firstPuzzle = await heading.textContent();
    const firstPoints = firstPuzzle?.includes("마법")
      ? [{ x: 0.31, y: 0.13 }, { x: 0.23, y: 0.66 }, { x: 0.08, y: 0.84 }]
      : [{ x: 0.34, y: 0.19 }, { x: 0.27, y: 0.76 }, { x: 0.78, y: 0.62 }];
    for (const point of firstPoints) await clickNormalized(first.page, point.x, point.y);
    await expect(heading).not.toHaveText(firstPuzzle ?? "", { timeout: 5_000 });

    const secondPuzzle = await heading.textContent();
    const secondPoints = secondPuzzle?.includes("마법")
      ? [{ x: 0.31, y: 0.13 }, { x: 0.23, y: 0.66 }, { x: 0.08, y: 0.84 }]
      : [{ x: 0.34, y: 0.19 }, { x: 0.27, y: 0.76 }, { x: 0.78, y: 0.62 }];
    for (const point of secondPoints) await clickNormalized(first.page, point.x, point.y);

    await expect(first.page.getByTestId("finished-screen")).toContainText("승리했습니다", { timeout: 5_000 });
    await expect(second.page.getByTestId("finished-screen")).toContainText("패배했습니다", { timeout: 5_000 });
  } finally {
    await first.context.close();
    await second.context.close();
  }
});
