import { expect, test } from "@playwright/test";

test("keyboard users can set a nickname and start matchmaking with visible focus", async ({
  page,
}) => {
  await page.goto("/");

  const nickname = page.getByLabel("닉네임");
  await expect(nickname).toBeFocused();
  await nickname.fill("키보드 사용자");
  await nickname.press("Enter");

  const matchmaking = page.getByTestId("matchmaking-start");
  await expect(matchmaking).toBeEnabled();
  for (let control = 0; control < 7; control += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(matchmaking).toBeFocused();
  await expect(matchmaking).toHaveCSS("outline-style", "solid");
  await expect(matchmaking).toHaveCSS("outline-width", "3px");

  await page.keyboard.press("Enter");
  await expect(page.getByTestId("matching-screen")).toBeVisible();
});
