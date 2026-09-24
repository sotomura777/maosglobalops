import { test, expect } from "@playwright/test";
test("recuperação de palavra-passe emite ligação válida e mantém resposta neutra", async ({
  page,
  request,
}) => {
  const email = `recovery-${Date.now()}@example.com`;
  const endpoint = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/";
  const created = await request.post(
    endpoint + "accounts:signUp?key=demo-api-key",
    { data: { email, password: "Anterior123!", returnSecureToken: true } },
  );
  expect(created.ok()).toBe(true);
  await page.goto("/entrar");
  await page.getByRole("link", { name: "Esqueci-me da palavra-passe" }).click();
  // The route change is a transition: wait for it, or the login page's Email field gets filled.
  await expect(
    page.getByRole("heading", { name: "Recuperar palavra-passe" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Enviar ligação" }).click();
  await expect(page.getByRole("status")).toContainText("Se existir uma conta");
  const response = await request.get(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-globalops/oobCodes",
  );
  const { oobCodes } = await response.json();
  const code = oobCodes.findLast(
    (c) => c.email === email && c.requestType === "PASSWORD_RESET",
  );
  expect(code).toBeTruthy();
  const reset = await request.post(
    endpoint + "accounts:resetPassword?key=demo-api-key",
    { data: { oobCode: code.oobCode, newPassword: "NovaSegura123!" } },
  );
  expect(reset.ok()).toBe(true);
  const previous = await request.post(
    endpoint + "accounts:signInWithPassword?key=demo-api-key",
    { data: { email, password: "Anterior123!" } },
  );
  expect(previous.ok()).toBe(false);
  const current = await request.post(
    endpoint + "accounts:signInWithPassword?key=demo-api-key",
    { data: { email, password: "NovaSegura123!" } },
  );
  expect(current.ok()).toBe(true);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`missing-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Enviar ligação" }).click();
  await expect(page.getByRole("status")).toContainText("Se existir uma conta");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
