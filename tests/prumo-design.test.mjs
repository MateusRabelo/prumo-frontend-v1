import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { origin, mockPrumo } from "./fixtures/prumo.mjs";

const pages = [
  "import",
  "invoices",
  "dashboard",
  "transactions",
  "accounts-cards",
  "installments",
  "budgets",
  "goals",
  "reports",
  "settings",
  "family",
];

test("all populated pages follow the brand scale on desktop, laptop and mobile", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: "pt-BR" });
    await mockPrumo(context);
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1920, 1366, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const path of pages) {
        await page.goto(origin + "/" + path);
        await page.locator("main h1").first().waitFor();
        await page.waitForLoadState("networkidle");
        const result = await page.evaluate(() => {
          const main = document.querySelector(".app-main"),
            heading = document.querySelector("main h1");
          return {
            body: parseFloat(getComputedStyle(document.body).fontSize),
            heading: parseFloat(getComputedStyle(heading).fontSize),
            overflow: main.scrollWidth > main.clientWidth + 1,
            nan: main.textContent.includes("NaN"),
            fonts:
              document.fonts.check("16px Figtree") &&
              document.fonts.check('800 32px "Bricolage Grotesque"'),
          };
        });
        assert.ok(
          result.body >= 16 && result.heading >= 28 && result.fonts,
          JSON.stringify({ path, width, ...result }),
        );
        assert.equal(
          result.overflow,
          false,
          `Horizontal overflow: ${path} at ${width}`,
        );
        assert.equal(result.nan, false, `Invalid financial number: ${path}`);
        assert.equal(
          await page.locator("[role=alert]").count(),
          0,
          `Unexpected error: ${path}`,
        );
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("native financial dialogs keep 16px fields, keyboard containment and Escape", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: "pt-BR" });
    await mockPrumo(context);
    const page = await context.newPage();
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, label] of [
        ["transactions", "Novo lançamento"],
        ["accounts-cards", "Nova conta"],
        ["accounts-cards", "Novo cartão"],
        ["installments", "Novo parcelamento"],
        ["budgets", "Novo orçamento"],
        ["goals", "Nova meta"],
        ["settings", "Nova categoria"],
      ]) {
        await page.goto(origin + "/" + path);
        await page.waitForLoadState("networkidle");
        await page
          .getByRole("button", { name: label, exact: true })
          .first()
          .click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        await page.waitForLoadState("networkidle");
        const result = await dialog.evaluate((el) => ({
          label: el.getAttribute("aria-labelledby"),
          outside: el.scrollWidth > el.clientWidth + 1,
          fields: [
            ...el.querySelectorAll(
              "input:not([type=color]):not([type=checkbox]),select",
            ),
          ]
            .filter((e) => e.getBoundingClientRect().height > 0)
            .map((e) => ({
              font: getComputedStyle(e).fontSize,
              height: e.getBoundingClientRect().height,
            })),
          focus: el.contains(document.activeElement),
        }));
        assert.ok(
          result.label && result.focus,
          `Dialog accessibility: ${label}`,
        );
        assert.equal(result.outside, false, `${label} overflows at ${width}`);
        assert.ok(
          result.fields.every((f) => f.font === "16px" && f.height >= 46),
          JSON.stringify({ label, ...result }),
        );
        await page.keyboard.press("Tab");
        assert.ok(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        );
        await page.keyboard.press("Escape");
        assert.equal(await dialog.count(), 0);
      }
    }
  } finally {
    await browser.close();
  }
});

test("Brazilian money input reaches the API without losing the thousands separator", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: "pt-BR" });
    const writes = await mockPrumo(context);
    const page = await context.newPage();
    await page.goto(origin + "/transactions");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Novo lançamento", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Descrição", { exact: true })
      .fill("Compra de teste");
    await dialog.getByLabel("Valor (R$)", { exact: true }).fill("1.234,56");
    await dialog
      .getByRole("button", { name: "Registrar lançamento", exact: true })
      .click();
    await dialog.waitFor({ state: "detached" });
    const saved = writes.find((w) => w.path.endsWith("/transactions"));
    assert.equal(saved.body.amount, 1234.56);
    assert.equal(saved.body.description, "Compra de teste");
  } finally {
    await browser.close();
  }
});

test("invoices, nested payments, installment payment and goal history remain accessible", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "pt-BR",
      viewport: { width: 390, height: 844 },
    });
    await mockPrumo(context);
    const page = await context.newPage();
    await page.goto(origin + "/accounts-cards");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Ver faturas", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("heading", { name: "Faturas do cartão", exact: true })
      .waitFor();
    assert.equal(await page.locator("dialog[open]").count(), 1);
    const overflow = await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    assert.equal(overflow, false, "Invoice dialog overflows on mobile");
    await page
      .getByRole("button", { name: "Pagar fatura", exact: true })
      .click();
    assert.equal(await page.locator("dialog[open]").count(), 2);
    assert.ok(
      await page
        .getByRole("dialog", { name: "Pagar fatura", exact: true })
        .evaluate((e) => e.contains(document.activeElement)),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.goto(origin + "/installments");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Ver todas as 10 parcelas", exact: true })
      .click();
    await page.getByRole("button", { name: "Pagar", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    assert.ok(
      await page
        .getByRole("dialog")
        .evaluate((e) => e.contains(document.activeElement)),
    );
    await page.keyboard.press("Escape");
    await page.goto(origin + "/goals");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "+ Aporte / Ajuste", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Ver histórico de aportes", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Histórico de aportes", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
  } finally {
    await browser.close();
  }
});

test("login, registration and recovery use the Prumo brand and readable controls", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ locale: "pt-BR" }),
      page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["login", "register", "recover-password"]) {
        await page.goto(origin + "/" + path);
        await page.locator(".auth-form-container h1").waitFor();
        assert.ok((await page.title()).startsWith("Prumo"));
        assert.ok(
          await page
            .locator("input")
            .evaluateAll((fields) =>
              fields.every(
                (e) =>
                  getComputedStyle(e).fontSize === "16px" &&
                  e.getBoundingClientRect().height >= 48,
              ),
            ),
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
    }
  } finally {
    await browser.close();
  }
});
