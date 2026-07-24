import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";

interface EditingMatch {
  firstContext: BrowserContext;
  secondContext: BrowserContext;
  first: Page;
  second: Page;
}

async function enterEditingMatch(
  browser: Browser,
  nicknameSuffix: string,
  firstOptions: BrowserContextOptions = {},
  secondOptions: BrowserContextOptions = {},
): Promise<EditingMatch> {
  const firstContext = await browser.newContext(firstOptions);
  const secondContext = await browser.newContext(secondOptions);
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  await Promise.all([first.goto("/"), second.goto("/")]);

  await first.getByTestId("nickname-input").fill(`${nicknameSuffix} 첫째`);
  await second.getByTestId("nickname-input").fill(`${nicknameSuffix} 둘째`);
  await Promise.all([
    first.getByTestId("nickname-submit").click(),
    second.getByTestId("nickname-submit").click(),
  ]);

  await Promise.all([
    expect(first.getByTestId("matchmaking-start")).toBeEnabled(),
    expect(second.getByTestId("matchmaking-start")).toBeEnabled(),
  ]);
  await Promise.all([
    first.getByTestId("matchmaking-start").click(),
    second.getByTestId("matchmaking-start").click(),
  ]);

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

  return { firstContext, secondContext, first, second };
}

async function expectNormalizedSelection(
  page: Page,
  xRatio: number,
  yRatio: number,
): Promise<void> {
  const board = page.getByTestId("editor-board");
  const bounds = await board.boundingBox();
  if (!bounds) throw new Error("Editor board is not visible");
  const position = {
    x: Math.round(bounds.width * xRatio),
    y: Math.round(bounds.height * yRatio),
  };

  await board.click({ position });
  await expect(board).toHaveAttribute("data-selection-x", /.+/);
  await expect(board).toHaveAttribute("data-selection-y", /.+/);

  const actualX = Number(await board.getAttribute("data-selection-x"));
  const actualY = Number(await board.getAttribute("data-selection-y"));
  expect(actualX).toBeCloseTo(position.x / bounds.width, 2);
  expect(actualY).toBeCloseTo(position.y / bounds.height, 2);
}

test("two independent players match, become ready, and receive opposite forfeit results", async ({
  browser,
}) => {
  const { firstContext, secondContext, first, second } = await enterEditingMatch(
    browser,
    "E2E",
  );

  try {
    first.once("dialog", (dialog) => dialog.accept());
    await first.getByTestId("forfeit-button").click();

    await Promise.all([
      expect(first.getByTestId("finished-screen")).toContainText("아쉽게 패배했습니다"),
      expect(second.getByTestId("finished-screen")).toContainText("승리했습니다!"),
    ]);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("desktop and mobile editors preserve normalized click coordinates", async ({ browser }) => {
  const desktop = { viewport: { width: 1280, height: 900 } };
  const mobile = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  };
  const { firstContext, secondContext, first, second } = await enterEditingMatch(
    browser,
    "좌표",
    desktop,
    mobile,
  );

  try {
    await Promise.all([
      expectNormalizedSelection(first, 0.32, 0.68),
      expectNormalizedSelection(second, 0.32, 0.68),
    ]);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
