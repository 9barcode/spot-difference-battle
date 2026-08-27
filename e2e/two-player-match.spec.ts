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
  await image.click({ position: { x: box.width * x, y: box.height * y } });
  await page.waitForTimeout(160);
}

function pointsForPuzzle(label: string | null): Array<{ x: number; y: number }> {
  if (label?.includes("카페")) return [{ x: 0.075, y: 0.13 }, { x: 0.485, y: 0.51 }, { x: 0.84, y: 0.79 }];
  if (label?.includes("마법")) return [{ x: 0.28, y: 0.39 }, { x: 0.18, y: 0.73 }, { x: 0.8, y: 0.12 }];
  if (label?.includes("바닷속")) return [{ x: 0.39, y: 0.11 }, { x: 0.8, y: 0.22 }, { x: 0.5, y: 0.76 }];
  if (label?.includes("사이버")) return [{ x: 0.17, y: 0.2 }, { x: 0.68, y: 0.18 }, { x: 0.52, y: 0.72 }];
  if (label?.includes("겨울")) return [{ x: 0.66, y: 0.12 }, { x: 0.84, y: 0.6 }, { x: 0.51, y: 0.78 }];
  if (label?.includes("우주")) return [{ x: 0.27, y: 0.33 }, { x: 0.74, y: 0.27 }, { x: 0.51, y: 0.8 }];
  if (label?.includes("하와이")) return [{ x: 0.26, y: 0.56 }, { x: 0.76, y: 0.75 }, { x: 0.88, y: 0.31 }];
  if (label?.includes("연금술")) return [{ x: 0.17, y: 0.48 }, { x: 0.51, y: 0.77 }, { x: 0.84, y: 0.61 }];
  if (label?.includes("공룡")) return [{ x: 0.5, y: 0.28 }, { x: 0.32, y: 0.57 }, { x: 0.78, y: 0.8 }];
  if (label?.includes("해적")) return [{ x: 0.49, y: 0.12 }, { x: 0.8, y: 0.4 }, { x: 0.35, y: 0.88 }];
  throw new Error(`등록되지 않은 문제 제목입니다: ${label}`);
}
test("the first player to clear the deck wins and both players see the result", async ({ browser }) => {
  const first = await createPlayer(browser, "빠른사람", { width: 1280, height: 900 });
  test.setTimeout(60_000);
  const second = await createPlayer(browser, "도전자", { width: 390, height: 844 });
  try {
    await Promise.all([
      first.page.getByRole("button", { name: /쉬움/ }).click(),
      second.page.getByRole("button", { name: /쉬움/ }).click(),
    ]);
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
    const progressText = await first.page.getByText(/^나 1\/\d+번 · 0\/3$/).textContent();
    const puzzleTotal = Number(progressText?.match(/^나 1\/(\d+)번/)?.[1]);
    expect(puzzleTotal).toBeGreaterThan(0);

    const firstPuzzle = await heading.textContent();
    const firstPoints = pointsForPuzzle(firstPuzzle);
    const mobileImage = second.page.getByRole("img", { name: /변경본$/ });
    const imageBeforeZoom = await mobileImage.boundingBox();
    await second.page.getByRole("button", { name: "확대" }).click();
    await second.page.getByRole("button", { name: "확대" }).click();
    await expect(second.page.getByTestId("zoom-controls")).toContainText("2.0배");
    const imageAfterZoom = await mobileImage.boundingBox();
    expect(imageAfterZoom!.width).toBeGreaterThan(imageBeforeZoom!.width * 1.9);

    const mobileBoard = second.page.getByTestId("modified-board");
    await mobileBoard.scrollIntoViewIfNeeded();
    const boardBox = await mobileBoard.boundingBox();
    if (!boardBox) throw new Error("모바일 변경본 보드를 찾을 수 없습니다.");
    await second.page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2);
    await second.page.mouse.down();
    await second.page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2 + 120, { steps: 5 });
    await second.page.mouse.up();
    await expect(second.page.getByText(`나 1/${puzzleTotal}번 · 0/3`, { exact: true })).toBeVisible();
    await second.page.getByRole("button", { name: "원래 크기" }).click();
    await expect(second.page.getByTestId("zoom-controls")).toContainText("1.0배");

    await clickNormalized(second.page, firstPoints[0]!.x, firstPoints[0]!.y);
    await expect(second.page.getByText(`나 1/${puzzleTotal}번 · 1/3`, { exact: true })).toBeVisible();
    for (let puzzleIndex = 0; puzzleIndex < puzzleTotal; puzzleIndex += 1) {
      const puzzleLabel = await heading.textContent();
      const points = pointsForPuzzle(puzzleLabel);
      for (const point of points) await clickNormalized(first.page, point.x, point.y);
      if (puzzleIndex < puzzleTotal - 1) {
        await expect(heading).not.toHaveText(puzzleLabel ?? "", { timeout: 5_000 });
      }
    }

    await expect(first.page.getByTestId("finished-screen")).toContainText("승리했습니다", { timeout: 5_000 });
    await expect(second.page.getByTestId("finished-screen")).toContainText("패배했습니다", { timeout: 5_000 });
    await expect(first.page.getByTestId("finished-screen")).toContainText("한 플레이어 전체 문제 완료");
    await expect(second.page.getByTestId("finished-screen")).toContainText("한 플레이어 전체 문제 완료");
  } finally {
    await first.context.close();
    await second.context.close();
  }
});
