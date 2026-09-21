import { test, expect } from "@playwright/test";
const pass = "TesteSeguro123!";
async function verifyEmail(page, email) {
  await page.goto("/app/conta");
  await page.getByRole("button", { name: "Enviar confirmação" }).click();
  await expect(page.getByRole("status")).toContainText("Enviámos uma ligação");
  const response = await page.request.get(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-globalops/oobCodes",
  );
  const { oobCodes } = await response.json();
  const code = oobCodes.findLast(
    (c) => c.email === email && c.requestType === "VERIFY_EMAIL",
  );
  expect(code).toBeTruthy();
  const result = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key",
    { data: { oobCode: code.oobCode } },
  );
  expect(result.ok()).toBe(true);
  await page.getByRole("button", { name: "Já confirmei o email" }).click();
  await expect(
    page.getByText("Email confirmado.", { exact: true }),
  ).toBeVisible();
}
test.beforeAll(async ({ request }) => {
  const result = await request.delete(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-globalops/databases/(default)/documents",
  );
  expect(result.ok()).toBe(true);
});
test("empresa e profissional: publicar, pesquisar, guardar, contratar, conversar e avaliar", async ({
  browser,
}, testInfo) => {
  const companyContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-PT",
  });
  const workerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-PT",
    isMobile: true,
    hasTouch: true,
  });
  const company = await companyContext.newPage();
  const worker = await workerContext.newPage();
  const errors = [];
  for (const page of [company, worker]) {
    page.on("requestfailed", (r) =>
      console.log("Request failed", r.url(), r.failure()?.errorText),
    );
    page.on("console", (m) => {
      if (m.type() === "error") console.log("Browser error", m.text());
    });
  }
  company.on("pageerror", (e) => errors.push(e.message));
  worker.on("pageerror", (e) => errors.push(e.message));
  const suffix = Date.now();
  await company.goto("/registar-empresa");
  await company.getByLabel("Nome da empresa").fill("Aurora Eventos");
  await company
    .getByLabel("Email", { exact: true })
    .fill(`empresa-${suffix}@example.com`);
  await company.getByLabel("Password (mín. 8)").fill(pass);
  await company.getByRole("checkbox").check();
  await company.getByRole("button", { name: "Registar empresa" }).click();
  await expect(
    company.getByRole("heading", { name: "Olá, Aurora." }),
  ).toBeVisible();
  await verifyEmail(company, `empresa-${suffix}@example.com`);
  await company.goto("/app/perfil");
  await company.getByRole("button", { name: "Editar apresentação" }).click();
  await company.getByLabel("Atividade / setor").fill("Eventos e experiências");
  await company.getByLabel("Designação da empresa").fill("Aurora Eventos Lda.");
  await company
    .getByLabel("Sobre a empresa")
    .fill("Produzimos eventos com atenção às pessoas e aos detalhes.");
  await company.getByLabel("Distrito", { exact: true }).selectOption("Lisboa");
  await company.getByRole("button", { name: "Guardar perfil" }).click();
  await company.getByRole("button", { name: "Gerir visibilidade" }).click();
  await company.getByRole("checkbox", { name: "Perfil visível" }).check();
  await company.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(company.getByRole("status")).toHaveText("Perfil guardado.");
  await company.goto("/app/publicar");
  await company
    .getByLabel("Título *", { exact: true })
    .fill("Serviço de mesa · Gala em Lisboa");
  await company.getByRole("button", { name: "Guardar rascunho" }).click();
  await expect(company.getByRole("status")).toContainText("Rascunho guardado");
  const draftPath =
    new URL(company.url()).pathname + new URL(company.url()).search;
  await company.goto("/app/meus-trabalhos?tab=drafts");
  await expect(
    company.getByText("Serviço de mesa · Gala em Lisboa", { exact: true }),
  ).toBeVisible();
  await company.goto(draftPath);
  await expect(company.getByLabel("Título *", { exact: true })).toHaveValue(
    "Serviço de mesa · Gala em Lisboa",
  );
  await company.getByLabel("Função *", { exact: true }).selectOption("Mesa");
  await company.getByLabel("Local / morada *").fill("Pavilhão do Tejo, Lisboa");
  await company.getByLabel("Data *", { exact: true }).fill("2099-10-10");
  await company.getByLabel("Hora de início *").fill("18:00");
  await company.getByLabel("Hora de fim *").fill("23:00");
  await company.getByLabel("Número de vagas *").fill("4");
  await company.getByLabel("Valor (€) *").fill("14");
  await company
    .getByLabel("Prazo e condições de pagamento *")
    .fill("Transferência até 15 dias após o serviço");
  await company
    .getByLabel("Descrição do trabalho *")
    .fill(
      "Receção e serviço de mesa numa gala. Procuramos pessoas com experiência em eventos e atenção ao detalhe.",
    );
  await company
    .getByLabel("Transporte", { exact: true })
    .fill("A cargo do profissional");
  await company.getByLabel("Refeição", { exact: true }).fill("Jantar incluído");
  await company
    .getByLabel("Roupa e equipamento")
    .fill("Camisa branca e calçado preto");
  await company.getByRole("button", { name: "Pré-visualizar oferta" }).click();
  await company
    .getByRole("button", { name: "Publicar oferta", exact: true })
    .click();
  await expect(
    company.getByRole("heading", {
      name: "Serviço de mesa · Gala em Lisboa",
      exact: true,
    }),
  ).toBeVisible();
  await expect(company).toHaveURL(/app\/trabalhos\//);
  const jobPath = new URL(company.url()).pathname;
  await company
    .getByRole("link", { name: "Duplicar oferta", exact: true })
    .click();
  await expect(company.getByLabel("Título *", { exact: true })).toHaveValue(
    "Serviço de mesa · Gala em Lisboa",
  );
  await expect(company.getByLabel("Data *", { exact: true })).toHaveValue("");
  await expect(company.getByLabel("Valor (€) *")).toHaveValue("14");
  await company.goto("/app/meus-trabalhos?tab=drafts");
  await expect(
    company.getByText("Serviço de mesa · Gala em Lisboa", { exact: true }),
  ).toHaveCount(0);
  await company.goto(jobPath);
  await worker.goto("/registar");
  await worker.getByLabel("Nome", { exact: true }).fill("Ana Silva");
  await worker
    .getByLabel("Email", { exact: true })
    .fill(`ana-${suffix}@example.com`);
  await worker.getByLabel("Password (mín. 8)").fill(pass);
  await worker.getByRole("checkbox").check();
  await worker
    .getByRole("button", { name: "Criar perfil", exact: true })
    .click();
  await expect(
    worker.getByRole("heading", { name: "Olá, Ana." }),
  ).toBeVisible();
  await verifyEmail(worker, `ana-${suffix}@example.com`);
  await worker.goto("/app/perfil");
  await worker.getByRole("button", { name: "Editar apresentação" }).click();
  await worker
    .getByLabel("Apresentação curta")
    .fill("Mesa e bar · eventos e restauração");
  await worker
    .getByLabel("Sobre ti")
    .fill("Profissional com experiência em galas, catering e festivais.");
  await worker.getByLabel("Distrito", { exact: true }).selectOption("Lisboa");
  await worker.getByRole("button", { name: "Guardar perfil" }).click();
  await worker
    .getByRole("button", { name: "Editar disponibilidade e funções" })
    .click();
  await worker.getByRole("button", { name: "Mesa", exact: true }).click();
  await worker.getByRole("button", { name: "Bar", exact: true }).click();
  await worker.getByRole("button", { name: "Guardar perfil" }).click();
  await worker.getByRole("button", { name: "Gerir visibilidade" }).click();
  await worker.getByRole("checkbox", { name: "Perfil visível" }).check();
  await worker.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(worker.getByRole("status")).toHaveText("Perfil guardado.");
  await worker.reload();
  await worker.getByRole("button", { name: "Editar apresentação" }).click();
  await expect(worker.getByLabel("Apresentação curta")).toHaveValue(
    "Mesa e bar · eventos e restauração",
  );
  await worker.getByLabel("Apresentação curta").fill("Alteração por guardar");
  const dismissed = new Promise((resolve) =>
    worker.once("dialog", async (dialog) => {
      await dialog.dismiss();
      resolve();
    }),
  );
  await worker
    .locator(".market-tabs")
    .getByRole("link", { name: "Explorar", exact: true })
    .click();
  await dismissed;
  await expect(worker).toHaveURL(/app\/perfil/);
  await expect(worker.getByLabel("Apresentação curta")).toHaveValue(
    "Alteração por guardar",
  );
  worker.once("dialog", (dialog) => dialog.accept());
  await worker
    .locator(".market-tabs")
    .getByRole("link", { name: "Explorar", exact: true })
    .click();
  await expect(worker).toHaveURL(/app\/trabalhos/);
  await worker.goto("/app/trabalhos");
  await worker.getByRole("button", { name: /^Filtros/ }).click();
  await worker.getByLabel("Distrito", { exact: true }).selectOption("Lisboa");
  await worker.getByRole("button", { name: /^Ver 1 trabalho$/ }).click();
  await worker.getByLabel("Pesquisar").fill("Gala");
  await worker
    .getByRole("button", { name: "Guardar oferta", exact: true })
    .click();
  await expect(
    worker.getByRole("button", { name: "Retirar dos guardados" }),
  ).toBeVisible();
  await worker.screenshot({
    path: testInfo.outputPath("explorar-mobile.png"),
    fullPage: true,
  });
  await worker.reload();
  await worker.getByRole("button", { name: "Guardados", exact: true }).click();
  await expect(
    worker.getByRole("heading", {
      name: "Serviço de mesa · Gala em Lisboa",
      exact: true,
    }),
  ).toBeVisible();
  await worker.goto(jobPath);
  await worker
    .getByLabel("Mensagem (opcional)")
    .fill("Tenho experiência em galas e disponibilidade para este horário.");
  await worker
    .getByRole("button", { name: "Candidatar-me", exact: true })
    .click();
  await expect(worker).toHaveURL(/contratacoes/);
  const engagementPath = new URL(worker.url()).pathname;
  await worker.reload();
  await expect(
    worker.getByText("Candidatura enviada", { exact: true }),
  ).toHaveCount(1);
  await worker.goto(jobPath);
  await expect(worker.getByText("Já enviaste a tua candidatura")).toBeVisible();
  await expect(
    worker.getByRole("button", { name: "Candidatar-me", exact: true }),
  ).toHaveCount(0);
  await company.goto("/app/notificacoes");
  await company
    .getByRole("link")
    .filter({ hasText: "Serviço de mesa · Gala em Lisboa" })
    .click();
  await company.getByRole("button", { name: "Aceitar", exact: true }).click();
  await company
    .getByRole("button", { name: "Aceitar", exact: true })
    .last()
    .click();
  await expect(
    company.getByText("A proposta foi enviada.", { exact: false }),
  ).toBeVisible();
  await worker.goto(engagementPath);
  await worker
    .getByRole("button", { name: "Confirmar trabalho", exact: true })
    .click();
  await worker.getByRole("checkbox", { name: "Aceito o horário" }).check();
  await worker
    .getByRole("button", { name: "Confirmar trabalho", exact: true })
    .last()
    .click();
  await expect(worker.getByText("Confirmado", { exact: true })).toHaveCount(1);
  await worker
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Obrigada! Onde é o ponto de encontro?");
  await worker.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    company.getByText("Obrigada! Onde é o ponto de encontro?", { exact: true }),
  ).toBeVisible();
  await worker.goto("/app/mensagens");
  await company
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Na entrada principal, às 17h45.");
  await company.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    worker.getByText("Na entrada principal, às 17h45.", { exact: true }),
  ).toBeVisible();
  await expect(worker.locator(".market-tabs .nav-count")).toHaveText("1");
  await worker
    .getByRole("link")
    .filter({ hasText: "Na entrada principal, às 17h45." })
    .click();
  await expect(worker).toHaveURL(/view=chat/);
  await expect(worker.locator(".market-tabs .nav-count")).toHaveCount(0);
  await worker.screenshot({
    path: testInfo.outputPath("contratacao-mobile.png"),
    fullPage: true,
  });
  await expect(
    company.getByText(
      "Podes assinalar a realização depois do fim do horário combinado.",
    ),
  ).toBeVisible();
  await expect(
    company.getByRole("button", { name: "Assinalar como realizado" }),
  ).toHaveCount(0);
  // Advance ONLY this emulator fixture to after the shift. No test hooks are
  // shipped in the callable function, whose production clock is always server time.
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const { initializeApp: adminApp, deleteApp } =
    await import("firebase-admin/app");
  const { getFirestore: adminDb } = await import("firebase-admin/firestore");
  const fixtureApp = adminApp(
    { projectId: "demo-globalops" },
    "e2e-time-fixture",
  );
  const fixtureDb = adminDb(fixtureApp);
  await fixtureDb
    .doc(engagementPath.replace("/app/contratacoes/", "engagements/"))
    .update({
      "agreedTerms.startMs": Date.now() - 3600000,
      "agreedTerms.endMs": Date.now() - 1000,
    });
  await fixtureDb.terminate();
  await deleteApp(fixtureApp);
  await company
    .getByRole("button", { name: "Assinalar como realizado" })
    .click();
  await company
    .getByRole("button", { name: "Assinalar como realizado", exact: true })
    .last()
    .click();
  await worker
    .getByRole("button", { name: "Confirmar conclusão", exact: true })
    .click();
  await worker
    .getByRole("button", { name: "Confirmar conclusão", exact: true })
    .last()
    .click();
  await expect(worker.getByText("Concluído", { exact: true })).toHaveCount(1);
  await worker
    .getByLabel("A tua experiência")
    .fill("Boa comunicação e condições cumpridas.");
  await worker.getByRole("button", { name: "Publicar avaliação" }).click();
  await expect(
    worker.getByText("A tua avaliação ficou guardada.", { exact: false }),
  ).toBeVisible();
  await company
    .getByLabel("A tua experiência")
    .fill("Pontual e muito profissional.");
  await company.getByRole("button", { name: "Publicar avaliação" }).click();
  await expect(
    company.getByText("A tua avaliação ficou guardada.", { exact: false }),
  ).toBeVisible();
  await company.goto(jobPath);
  await company
    .getByRole("button", { name: "Encerrar oferta", exact: true })
    .click();
  await expect(
    company.getByText("Oferta encerrada", { exact: true }),
  ).toBeVisible();
  await worker.goto("/app/meus-trabalhos?tab=history");
  await expect(
    worker.getByRole("heading", {
      name: "Serviço de mesa · Gala em Lisboa",
      exact: true,
    }),
  ).toBeVisible();
  await company.goto("/app/diretorio");
  await company.getByLabel("Pesquisar").fill("Ana Silva");
  await company.getByRole("link").filter({ hasText: "Ana Silva" }).click();
  await expect(
    company.getByText("Pontual e muito profissional.", { exact: true }),
  ).toBeVisible();
  await expect(
    company.getByRole("heading", { name: "Fiabilidade", exact: true }),
  ).toBeVisible();
  await expect(
    company.getByRole("heading", { name: "Histórico de trabalhos", exact: true }),
  ).toBeVisible();
  await expect(
    company.getByText("Verificado", { exact: true }).first(),
  ).toBeVisible();
  await company.screenshot({
    path: testInfo.outputPath("perfil-desktop.png"),
    fullPage: true,
  });
  await worker.goto("/app/ganhos");
  await expect(worker.getByLabel("Horas", { exact: true })).toHaveCount(0);
  await worker.getByRole("button", { name: "Registar trabalho" }).click();
  await worker.getByLabel("Horas", { exact: true }).fill("5");
  await worker.getByLabel("Valor por hora (€)").fill("14");
  await worker.getByLabel("Empresa (opcional)").fill("Aurora Eventos");
  await worker.getByRole("button", { name: "Guardar registo" }).click();
  await expect(worker.locator(".earnings-entry")).toContainText(
    "Aurora Eventos",
  );
  await worker.reload();
  await expect(worker.locator(".earnings-entry")).toContainText("70,00");
  for (const path of [
    "/app",
    "/app/trabalhos",
    "/app/meus-trabalhos",
    "/app/mensagens",
    "/app/notificacoes",
    "/app/perfil",
    "/app/ganhos",
    "/app/canais",
    "/app/ranking",
    "/app/diretorio",
  ]) {
    await worker.goto(path);
    await expect(worker.locator(".market-tabs")).toBeVisible();
    await expect(worker.locator(".market-main")).toBeVisible();
    await expect(worker.getByRole("status")).toHaveCount(0);
    if (["/app/perfil", "/app/ganhos", "/app/mensagens"].includes(path))
      await worker.screenshot({
        path: testInfo.outputPath(path.split("/").pop() + "-mobile.png"),
        fullPage: true,
      });
    const overflow = await worker.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `Overflow at ${path}`).toBe(false);
  }
  await worker.goto("/app");
  await expect(worker.getByRole("status")).toHaveCount(0);
  await worker.screenshot({
    path: testInfo.outputPath("inicio-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await companyContext.close();
  await workerContext.close();
});
