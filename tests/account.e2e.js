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

test("RGPD: páginas legais públicas, descarregar os dados e apagar a conta", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();
  await page.getByRole("link", { name: "Ler os termos de utilização" }).click();
  await expect(page.getByRole("heading", { name: "Termos de utilização" })).toBeVisible();
  const email = `rgpd-${Date.now()}@example.com`;
  await page.goto("/registar");
  await page.getByLabel("Nome", { exact: true }).fill("Rita Dados");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password (mín. 8)").fill("TesteSeguro123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Olá, Rita." })).toBeVisible();
  await page.goto("/app/conta");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarregar os meus dados" }).click();
  const file = await (await downloading).path();
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported.profile.email).toBe(email);
  await page.getByRole("button", { name: "Apagar a minha conta" }).click();
  const confirm = page.getByRole("button", { name: "Apagar definitivamente" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Escreve APAGAR para confirmar").fill("APAGAR");
  await page.screenshot({ path: testInfo.outputPath("apagar-conta.png"), fullPage: true });
  await confirm.click();
  await expect(page).toHaveURL(/127\.0\.0\.1:5175\/$/);
  const lookup = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-globalops/accounts:lookup",
    { headers: { Authorization: "Bearer owner" }, data: { email: [email] } },
  );
  expect((await lookup.json()).users).toBeUndefined();
});

test("modo claro: segue o sistema, muda pelo ícone e fica guardado", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ colorScheme: "light", viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  // Automático: o telemóvel está em modo claro.
  await page.goto("/");
  expect(await theme()).toBe("light");
  await page.screenshot({ path: testInfo.outputPath("landing-claro-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Mudar para modo escuro" }).click();
  expect(await theme()).toBe("dark");
  await page.reload();
  expect(await theme()).toBe("dark");
  // Em Segurança da conta escolhe-se Claro, e fica depois de recarregar.
  await page.goto("/registar");
  await page.getByLabel("Nome", { exact: true }).fill("Clara Modo");
  await page.getByLabel("Email", { exact: true }).fill(`claro-${Date.now()}@example.com`);
  await page.getByLabel("Password (mín. 8)").fill("TesteSeguro123!");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Olá, Clara." })).toBeVisible();
  await page.goto("/app/conta");
  await page.getByRole("radio", { name: /^Claro/ }).check();
  expect(await theme()).toBe("light");
  await page.reload();
  expect(await theme()).toBe("light");
  for (const path of ["/app", "/app/trabalhos", "/app/perfil", "/app/ganhos", "/app/conta"]) {
    await page.goto(path);
    await expect(page.locator(".market-main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `Overflow at ${path}`).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`claro${path.replaceAll("/", "-")}.png`), fullPage: true });
  }
  // Voltar a Automático segue outra vez o sistema.
  await page.goto("/app/conta");
  await page.getByRole("radio", { name: /^Automático/ }).check();
  expect(await theme()).toBe("light");
  await context.close();
});
