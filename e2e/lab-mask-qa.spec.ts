import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const sceneObjectCounts: Record<string, number> = {
  "prototype-room": 16,
  "cartoon-laboratory": 18,
  "cozy-cafe": 15,
  "enchanted-forest": 15,
  "cyber-city": 15,
  "underwater-treasure": 15,
};
const configuredSceneId = process.env.GAME_SCENE_ID ?? "cartoon-laboratory";

async function join(page: Page, nickname: string): Promise<void> {
  await page.goto("/");
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("nickname-submit").click();
  await expect(page.getByTestId("matchmaking-start")).toBeEnabled();
}

test(`all ${configuredSceneId} objects remain individually selectable by touch on mobile`, async ({ browser }) => {
  test.setTimeout(35_000);
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

    const editorBoard = creator.getByTestId("editor-board");
    await editorBoard.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "center" }),
    );
    const targetResults = await creator
      .locator('[data-testid^="scene-object-hit-"]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const circle = element as SVGCircleElement;
          const svg = circle.ownerSVGElement!;
          const rect = svg.getBoundingClientRect();
          const viewBox = svg.viewBox.baseVal;
          const x = rect.left + ((circle.cx.baseVal.value - viewBox.x) / viewBox.width) * rect.width;
          const y = rect.top + ((circle.cy.baseVal.value - viewBox.y) / viewBox.height) * rect.height;
          return {
            expected: circle.getAttribute("data-object-id"),
            actual: document.elementFromPoint(x, y)?.getAttribute("data-object-id") ?? null,
          };
        }),
      );
    expect(targetResults).toHaveLength(sceneObjectCounts[configuredSceneId]);
    expect(
      targetResults.filter(({ expected, actual }) => expected !== actual),
    ).toEqual([]);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
