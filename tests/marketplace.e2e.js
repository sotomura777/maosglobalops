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
// Shared between the marketplace journey and the administration journey below.
const shared = {};
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
  shared.workerEmail = `ana-${suffix}@example.com`;
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
  // The offer can be shared: its public page opens without an account and,
  // after signing up, brings the person straight back to it.
  const publicPath = jobPath.replace("/app/trabalhos/", "/ofertas/");
  const visitorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-PT",
    isMobile: true,
    hasTouch: true,
  });
  const visitor = await visitorContext.newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto(publicPath);
  await expect(
    visitor.getByRole("heading", { name: "Serviço de mesa · Gala em Lisboa" }),
  ).toBeVisible();
  await visitor.screenshot({ path: testInfo.outputPath("oferta-publica-mobile.png"), fullPage: true });
  await visitor.getByRole("link", { name: "Criar perfil e candidatar-me" }).click();
  await visitor.getByLabel("Nome", { exact: true }).fill("Bruno Visita");
  await visitor.getByLabel("Email", { exact: true }).fill(`bruno-${suffix}@example.com`);
  await visitor.getByLabel("Password (mín. 8)").fill(pass);
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(visitor).toHaveURL(new RegExp(jobPath + "$"));
  await expect(
    visitor.getByRole("heading", { name: "Serviço de mesa · Gala em Lisboa" }),
  ).toBeVisible();
  await visitorContext.close();
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
  // Aurora has its own staff app (set by the administration; seeded here through the emulator).
  const owner = { Authorization: "Bearer owner" };
  const lookup = await company.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-globalops/accounts:lookup",
    { headers: owner, data: { email: [`empresa-${suffix}@example.com`] } },
  );
  const auroraId = (await lookup.json()).users[0].localId;
  const seeded = await company.request.patch(
    `http://127.0.0.1:8080/v1/projects/demo-globalops/databases/(default)/documents/companyStatus/${auroraId}`,
    {
      headers: owner,
      data: {
        fields: {
          app: {
            mapValue: {
              fields: {
                name: { stringValue: "MaosOps" },
                url: { stringValue: "https://maosops.example" },
              },
            },
          },
        },
      },
    },
  );
  expect(seeded.ok()).toBe(true);
  await worker.goto(jobPath);
  // Before applying, the person is told a staff account will be created if accepted.
  await expect(worker.getByRole("note")).toContainText("MaosOps");
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
  // The acceptance is the approval: Aurora now has to create Ana's MaosOps account.
  await company.goto("/app/equipa");
  const staff = company.locator(".panel").filter({ hasText: "Ana Silva" });
  await expect(staff).toContainText(`ana-${suffix}@example.com`);
  await company.screenshot({ path: testInfo.outputPath("staff-para-app.png"), fullPage: true });
  await staff.getByRole("button", { name: "Já criei a conta" }).click();
  await expect(company.getByText("Nada para criar")).toBeVisible();
  await company.goto(engagementPath);
  await worker.goto("/app");
  await expect(worker.getByRole("heading", { name: "As minhas empresas" })).toBeVisible();
  await expect(worker.getByRole("link", { name: "Abrir MaosOps ↗" })).toHaveAttribute(
    "href",
    "https://maosops.example",
  );
  await worker.screenshot({ path: testInfo.outputPath("minhas-empresas-mobile.png"), fullPage: true });
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
  await company.screenshot({
    path: testInfo.outputPath("presenca-form.png"),
    fullPage: true,
  });
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
  // Ana marks the 15th of next month as a day she can't work; companies looking for
  // someone that day no longer see her.
  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const offDay = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-15`;
  await worker.goto("/app/perfil");
  await worker.getByRole("button", { name: "Editar disponibilidade e funções" }).click();
  await worker.locator(".calendar").nth(1).locator(".calendar-day", { hasText: /^15$/ }).click();
  await expect(worker.getByText("1 dia marcado.")).toBeVisible();
  await worker.screenshot({ path: testInfo.outputPath("calendario-mobile.png"), fullPage: true });
  await worker.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(worker.getByRole("status")).toHaveText("Perfil guardado.");
  await company.goto("/app/diretorio");
  await company.getByLabel("Pesquisar").fill("Ana Silva");
  await company.getByLabel("Livre no dia").fill(offDay);
  await expect(company.getByRole("link").filter({ hasText: "Ana Silva" })).toHaveCount(0);
  await company.getByLabel("Livre no dia").fill("");
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
  // The company has not been validated by the administration yet.
  await expect(
    company.getByText("Concluído na app", { exact: true }).first(),
  ).toBeVisible();
  await company.screenshot({
    path: testInfo.outputPath("perfil-desktop.png"),
    fullPage: true,
  });
  // Aurora keeps Ana in its favourites to call her again.
  await company.getByRole("button", { name: "☆ Guardar nos favoritos" }).click();
  await expect(company.getByRole("button", { name: "★ Nos favoritos" })).toBeVisible();
  await worker.goto("/app/perfil");
  await worker.getByRole("button", { name: "Editar experiência" }).click();
  await worker.getByLabel("Função / cargo").fill("Chefe de bar");
  await worker
    .getByLabel("Empresa registada (opcional)")
    .selectOption({ index: 1 });
  await worker.screenshot({
    path: testInfo.outputPath("trabalhos-anteriores.png"),
    fullPage: true,
  });
  await worker.getByRole("button", { name: "Adicionar trabalho" }).click();
  await expect(
    worker.getByText("A aguardar confirmação", { exact: false }).first(),
  ).toBeVisible();
  await company.goto("/app/aprovacoes");
  await expect(
    company.getByText("Chefe de bar", { exact: false }),
  ).toBeVisible({ timeout: 10000 });
  await company.screenshot({
    path: testInfo.outputPath("aprovacoes.png"),
    fullPage: true,
  });
  await worker.goto("/app/ganhos");
  // The completed job counts on its own, from the agreed terms. The emulator time
  // adjustment above made the shift last 1 h, so 1 h × 14 €.
  const fromApp = worker.locator(".earnings-entry").filter({ hasText: "GlobalOps" });
  await expect(fromApp).toContainText("Serviço de mesa · Gala em Lisboa");
  await expect(fromApp).toContainText("14,00");
  await expect(worker.getByText("A tua média: 14,00 €/h")).toBeVisible();
  await expect(worker.getByLabel("Horas", { exact: true })).toHaveCount(0);
  await worker.getByRole("button", { name: "Registar trabalho" }).click();
  await worker.getByLabel("Horas", { exact: true }).fill("5");
  await worker.getByLabel("Valor por hora (€)").fill("14");
  await worker.getByLabel("Empresa (opcional)").fill("Aurora Eventos");
  await worker.getByRole("button", { name: "Guardar registo" }).click();
  const personal = worker.locator(".earnings-entry").filter({ hasNotText: "GlobalOps" });
  await expect(personal).toContainText("Aurora Eventos");
  await worker.reload();
  await expect(personal).toContainText("70,00");
  await expect(worker.locator(".earnings-summary")).toContainText("84,00");
  // A private offer, only for invited favourites. The invite is an application:
  // Ana accepts it and Aurora still chooses.
  await company.goto(jobPath);
  await company.getByRole("link", { name: "Duplicar oferta", exact: true }).click();
  await expect(company.getByLabel("Título *", { exact: true })).toHaveValue(
    "Serviço de mesa · Gala em Lisboa",
  );
  await company.getByLabel("Título *", { exact: true }).fill("Jantar privado · só convidados");
  await company.getByLabel("Data *", { exact: true }).fill("2099-11-11");
  await company.getByRole("radio", { name: /Privada/ }).check();
  await company.getByRole("checkbox", { name: "Ana Silva" }).check();
  await company.screenshot({ path: testInfo.outputPath("publicar-privada.png"), fullPage: true });
  await company.getByRole("button", { name: "Pré-visualizar oferta" }).click();
  await expect(company.getByText("só a pessoa convidada")).toBeVisible();
  await company.getByRole("button", { name: "Publicar oferta" }).click();
  await expect(company.getByText("Só por convite", { exact: true })).toBeVisible();
  await worker.goto("/app");
  const invites = worker.locator(".attention-panel").filter({ hasText: "Convites para ti" });
  await expect(invites).toContainText("Jantar privado · só convidados");
  await worker.screenshot({ path: testInfo.outputPath("convites-mobile.png"), fullPage: true });
  await invites.getByRole("link").filter({ hasText: "Jantar privado" }).click();
  await worker.getByRole("button", { name: "Aceitar convite", exact: true }).click();
  await expect(worker).toHaveURL(/contratacoes/);
  await expect(worker.getByText("Candidatura enviada", { exact: true })).toHaveCount(1);
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
  // The same pages with real data in light mode.
  await worker.evaluate(() => localStorage.setItem("gop-theme", "light"));
  for (const path of ["/app", engagementPath, "/app/ganhos", "/app/meus-trabalhos"]) {
    await worker.goto(path);
    await expect(worker.locator(".market-main")).toBeVisible();
    await expect(worker.getByRole("status")).toHaveCount(0);
    const overflow = await worker.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `Overflow at ${path} (claro)`).toBe(false);
    await worker.screenshot({
      path: testInfo.outputPath(`claro${path.replaceAll("/", "-")}-mobile.png`),
      fullPage: true,
    });
  }
  await company.evaluate(() => localStorage.setItem("gop-theme", "light"));
  await company.goto(jobPath);
  await company.screenshot({ path: testInfo.outputPath("claro-oferta-desktop.png"), fullPage: true });
  await company.goto("/app/equipa");
  await company.screenshot({ path: testInfo.outputPath("claro-equipa-desktop.png"), fullPage: true });
  // Each contracting step queued an email; in the emulator nothing leaves (dry run).
  const mail = await company.request.get(
    "http://127.0.0.1:8080/v1/projects/demo-globalops/databases/(default)/documents/mailLog?pageSize=100",
    { headers: { Authorization: "Bearer owner" } },
  );
  const statuses = ((await mail.json()).documents || []).map(
    (d) => d.fields.status.stringValue,
  );
  expect(statuses.length).toBeGreaterThanOrEqual(4);
  expect(statuses.every((s) => s === "dry_run")).toBe(true);
  expect(errors).toEqual([]);
  await companyContext.close();
  await workerContext.close();
});

test("administração: estatísticas, validação de empresas e suspensão de contas", async ({
  browser,
  request,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-PT",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `admin-${Date.now()}@example.com`;
  await page.goto("/registar");
  await page.getByLabel("Nome", { exact: true }).fill("Pedro Admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password (mín. 8)").fill(pass);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Olá, Pedro." })).toBeVisible();
  await verifyEmail(page, email);
  // Without the claim the area stays closed.
  await page.goto("/app/admin");
  await expect(page.getByRole("heading", { name: "Acesso reservado" })).toBeVisible();
  // Same effect as scripts/set-admin.mjs, through the Auth emulator.
  const owner = { Authorization: "Bearer owner" };
  const lookup = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-globalops/accounts:lookup",
    { headers: owner, data: { email: [email] } },
  );
  const { localId } = (await lookup.json()).users[0];
  const claim = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-globalops/accounts:update",
    { headers: owner, data: { localId, customAttributes: JSON.stringify({ admin: true }) } },
  );
  expect(claim.ok()).toBe(true);
  // A new session carries the new claim.
  await page.getByRole("button", { name: "A minha conta" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).not.toHaveURL(/\/app/);
  await page.goto("/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Olá, Pedro." })).toBeVisible();
  await page.getByRole("link", { name: "Administração" }).first().click();
  await expect(page.getByRole("heading", { name: "Painel da plataforma" })).toBeVisible();
  await expect(page.locator(".stat").filter({ hasText: "Empresas por validar" })).toContainText("1");
  await page.screenshot({ path: testInfo.outputPath("admin-estatisticas.png"), fullPage: true });

  await page.getByRole("tab", { name: "Empresas" }).click();
  const aurora = page.locator(".panel").filter({ hasText: "Aurora Eventos" });
  await aurora.getByLabel("Nota interna (fica só na administração)").fill("NIF confirmado");
  await aurora.getByRole("button", { name: "Validar empresa" }).click();
  await expect(page.getByText("Não há empresas à espera de validação.")).toBeVisible();
  await page.getByRole("button", { name: /^Validadas/ }).click();
  await expect(aurora.getByText("Validada", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("admin-empresas.png"), fullPage: true });
  await aurora.getByRole("link", { name: "Ver perfil público →" }).click();
  await expect(page.getByText("Empresa validada", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("empresa-validada.png"), fullPage: true });
  // Any verified account can report a profile; the report lands in the admin queue.
  await page.getByRole("button", { name: "Denunciar este perfil" }).click();
  await page.getByLabel("Motivo").selectOption("dados_falsos");
  await page.getByLabel("Detalhes (opcional)").fill("Diz ter 20 anos de atividade.");
  await page.screenshot({ path: testInfo.outputPath("denuncia-formulario.png"), fullPage: true });
  await page.getByRole("button", { name: "Enviar denúncia" }).click();
  await expect(page.getByText("Obrigado. A equipa vai analisar a denúncia.")).toBeVisible();
  await page.goto("/app/admin?tab=reports");
  const card = page.locator(".panel").filter({ hasText: "Informação falsa" });
  await expect(card).toContainText("Diz ter 20 anos de atividade.");
  const resolve = card.getByRole("button", { name: "Marcar como resolvida" });
  await expect(resolve).toBeDisabled();
  await card.getByLabel("Decisão (fica registada)").fill("Empresa contactada; dados corrigidos.");
  await page.screenshot({ path: testInfo.outputPath("admin-denuncias.png"), fullPage: true });
  await resolve.click();
  await expect(page.getByText("Sem denúncias por tratar")).toBeVisible();
  await page.getByRole("button", { name: "Resolvidas" }).click();
  await expect(page.getByText("Decisão: Empresa contactada; dados corrigidos.")).toBeVisible();

  await page.goto("/app/admin?tab=accounts");
  await page.getByLabel("Email da conta").fill(shared.workerEmail);
  await page.getByRole("button", { name: "Procurar conta" }).click();
  await expect(page.getByText("Ana Silva", { exact: true })).toBeVisible();
  const suspend = page.getByRole("button", { name: "Suspender conta" });
  await expect(suspend).toBeDisabled();
  await page.getByLabel("Motivo da suspensão (obrigatório, fica registado)").fill("Teste de moderação");
  await suspend.click();
  await page.getByRole("button", { name: "Sim, suspender agora" }).click();
  await expect(page.getByText("Suspensa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reativar conta" }).click();
  await expect(page.getByText("Ativa", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/admin");
  await expect(page.locator(".stat").first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow, "Overflow at /app/admin").toBe(false);
  await page.screenshot({ path: testInfo.outputPath("admin-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
  await context.close();
});
