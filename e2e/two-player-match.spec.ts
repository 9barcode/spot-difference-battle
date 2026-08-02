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
  creator: Page;
  finder: Page;
}

async function enterEditingMatch(
  browser: Browser,
  nicknameSuffix: string,
  creatorOptions: BrowserContextOptions = {},
  finderOptions: BrowserContextOptions = {},
): Promise<EditingMatch> {
  const firstContext = await browser.newContext(creatorOptions);
  const secondContext = await browser.newContext(finderOptions);
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

  // 네트워크 전달 순서가 바뀌어도 실제 서버가 부여한 역할을 기준으로 테스트한다.
  const firstIsCreator = await first.getByText("내 역할: 문제 제작자").isVisible();
  const creator = firstIsCreator ? first : second;
  const finder = firstIsCreator ? second : first;

  await Promise.all([
    creator.getByTestId("ready-button").click(),
    finder.getByTestId("ready-button").click(),
  ]);

  await Promise.all([
    expect(creator.getByTestId("editing-screen")).toBeVisible(),
    expect(finder.getByTestId("editing-screen")).toBeVisible(),
  ]);

  return { firstContext, secondContext, creator, finder };
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
  const { firstContext, secondContext, creator, finder } = await enterEditingMatch(
    browser,
    "E2E",
  );

  try {
    creator.once("dialog", (dialog) => dialog.accept());
    await creator.getByTestId("forfeit-button").click();

    await Promise.all([
      expect(creator.getByTestId("finished-screen")).toContainText("아쉽게 패배했습니다"),
      expect(finder.getByTestId("finished-screen")).toContainText("승리했습니다!"),
    ]);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("finder cannot see the editor until the creator finishes, and objects are selected independently", async ({
  browser,
}) => {
  const desktop = { viewport: { width: 1280, height: 900 } };
  const mobile = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  };
  const { firstContext, secondContext, creator, finder } = await enterEditingMatch(
    browser,
    "비공개",
    desktop,
    mobile,
  );

  try {
    await expect(creator.getByTestId("editor-board")).toBeVisible();
    await expect(finder.getByTestId("editor-board")).toHaveCount(0);
    await expect(finder.getByTestId("editing-screen")).toContainText("수정 완료 대기 중");
    await expect(finder.getByRole("img", { name: /게임 원본 그림|상대가 수정한 그림/ })).toHaveCount(0);

    await saveSceneSpecificEdits(creator);

    const qaScreenshotPath = process.env.SCENE_QA_SCREENSHOT_PATH;
    if (qaScreenshotPath) {
      await creator.getByTestId("editing-screen").screenshot({ path: qaScreenshotPath });
    }

    const submitProblem = creator.getByTestId("submit-problem");
    await expect(submitProblem).toContainText("완료 3/3");
    await submitProblem.click();

    await expect(finder.getByTestId("finding-screen")).toBeVisible();
    await expect(finder.getByRole("img", { name: "게임 원본 그림" })).toBeVisible();
    await expect(finder.getByRole("img", { name: "상대가 수정한 그림" })).toBeVisible();
    await expect(creator.getByTestId("finding-screen")).toContainText("상대가 차이점을 찾고 있습니다");
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
