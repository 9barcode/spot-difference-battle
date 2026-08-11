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

  // 먼저 대기열 요청을 보낸 뒤 두 번째 플레이어를 참가시킨다.
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

  return { firstContext, secondContext, first, second };
}

async function saveObjectEdit(page: Page, objectId: string, effectLabel: string): Promise<void> {
  const object = page.getByTestId(`scene-object-${objectId}`);
  await object.focus();
  await object.press("Enter");
  await page.getByRole("button", { name: effectLabel }).click();
  await page.getByRole("button", { name: "차이점 저장" }).click();
}

const sceneEdits: Record<string, Array<[string, string]>> = {
  "prototype-room": [["cat", "줄무늬"], ["ball", "점무늬"], ["clock", "윤곽 변경"]],
  "cartoon-laboratory": [["lab-clock", "윤곽 변경"], ["test-tubes", "점무늬"], ["toolbox", "가로로 넓게"]],
  "cozy-cafe": [["cafe-clock", "윤곽 변경"], ["cafe-cake", "점무늬"], ["cafe-roses", "가로로 넓게"]],
  "enchanted-forest": [["forest-sun", "윤곽 변경"], ["forest-scarf", "점무늬"], ["forest-bridge", "가로로 넓게"]],
  "cyber-city": [["city-dragon-sign", "윤곽 변경"], ["city-large-umbrella", "점무늬"], ["city-bollard", "세로로 길게"]],
  "underwater-treasure": [["underwater-jellyfish", "윤곽 변경"], ["underwater-chest", "점무늬"], ["underwater-starfish", "가로로 넓게"]],
};

async function saveSceneSpecificEdits(page: Page): Promise<void> {
  const sceneId = process.env.GAME_SCENE_ID ?? "cartoon-laboratory";
  const edits = sceneEdits[sceneId];
  if (!edits) throw new Error(`No E2E edits registered for ${sceneId}`);
  for (const [objectId, effectLabel] of edits) {
    await saveObjectEdit(page, objectId, effectLabel);
  }
}

test("two independent players match and receive opposite forfeit results", async ({ browser }) => {
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

test("both players edit privately and start finding only after both submit", async ({
  browser,
}) => {
  const desktop = { viewport: { width: 1280, height: 900 } };
  const mobile = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  };
  const { firstContext, secondContext, first, second } = await enterEditingMatch(
    browser,
    "비공개",
    desktop,
    mobile,
  );

  try {
    await expect(first.getByTestId("editor-board")).toBeVisible();
    await expect(second.getByTestId("editor-board")).toBeVisible();
    await expect(first.getByRole("img", { name: "상대가 수정한 그림" })).toHaveCount(0);
    await expect(second.getByRole("img", { name: "상대가 수정한 그림" })).toHaveCount(0);

    await saveSceneSpecificEdits(first);
    await saveSceneSpecificEdits(second);

    const qaScreenshotPath = process.env.SCENE_QA_SCREENSHOT_PATH;
    if (qaScreenshotPath) {
      await first.getByTestId("editing-screen").screenshot({ path: qaScreenshotPath });
    }

    const firstSubmit = first.getByTestId("submit-problem");
    await expect(firstSubmit).toContainText("완료 3/3");
    await firstSubmit.click();
    await expect(first.getByTestId("editing-screen")).toContainText("상대의 제출을 기다리는 중");
    await expect(second.getByTestId("editing-screen")).toBeVisible();

    await second.getByTestId("submit-problem").click();
    await Promise.all([
      expect(first.getByTestId("finding-screen")).toBeVisible(),
      expect(second.getByTestId("finding-screen")).toBeVisible(),
    ]);
    await expect(first.getByRole("img", { name: "상대가 수정한 그림" })).toBeVisible();
    await expect(second.getByRole("img", { name: "상대가 수정한 그림" })).toBeVisible();
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
