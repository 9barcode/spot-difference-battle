import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function join(page: Page, nickname: string): Promise<void> {
  await page.goto("/");
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("nickname-submit").click();
  await expect(page.getByTestId("matchmaking-start")).toBeEnabled();
}

test("all laboratory objects remain individually selectable by touch on mobile", async ({ browser }) => {
  const firstContext: BrowserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const secondContext: BrowserContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  try {
    await Promise.all([join(first, "마스크 검수 1"), join(second, "마스크 검수 2")]);
    await first.getByTestId("matchmaking-start").click();
    await expect(first.getByTestId("matching-screen")).toBeVisible();
    await second.getByTestId("matchmaking-start").click();

    await Promise.all([
      expect(first.getByTestId("ready-screen")).toBeVisible(),
      expect(second.getByTestId("ready-screen")).toBeVisible(),
    ]);

    await Promise.all([
      first.getByTestId("ready-button").click(),
      second.getByTestId("ready-button").click(),
    ]);
    await Promise.all([
      expect(first.getByTestId("editing-screen")).toBeVisible(),
      expect(second.getByTestId("editing-screen")).toBeVisible(),
    ]);
    const firstIsCreator = (await first.getByTestId("editor-board").count()) === 1;
    const creator = firstIsCreator ? first : second;
    await expect(creator.getByTestId("editor-board")).toBeVisible();

    const hitTargets = creator.locator('[data-testid^="scene-object-hit-"]');
    await expect(hitTargets).toHaveCount(18);
    for (let index = 0; index < 18; index += 1) {
      const hitTarget = hitTargets.nth(index);
      const testId = await hitTarget.getAttribute("data-testid");
      const objectId = testId!.replace("scene-object-hit-", "");
      const mask = creator.getByTestId(`scene-object-${objectId}`);
      const label = (await mask.getAttribute("aria-label"))!.replace(/ 선택$/, "");
      await hitTarget.scrollIntoViewIfNeeded();
      const box = await hitTarget.boundingBox();
      expect(box).not.toBeNull();
      await creator.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(creator.getByText(`선택 객체: ${label}`, { exact: true })).toBeVisible();
    }
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
