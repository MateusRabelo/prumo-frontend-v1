import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.FRONTEND_TEST_URL || "http://localhost:5174";
const own = "11111111-1111-4111-8111-111111111111";
const shared = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const families = [
  {
    id: own,
    name: "Meu espaço",
    currency: "BRL",
    owner_id: userId,
    role: "OWNER",
    members_count: 1,
  },
  {
    id: shared,
    name: "Casa compartilhada",
    currency: "BRL",
    owner_id: "another-user",
    role: "ADMIN",
    members_count: 2,
  },
];

test("space selection, permissions, invitation errors and mobile navigation", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(
      ({ own }) => {
        localStorage.setItem("msfinancas_token", "test-token");
        if (!localStorage.getItem("msfinancas_family_id"))
          localStorage.setItem("msfinancas_family_id", own);
      },
      { own },
    );
    await context.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const selected = request.headers()["x-family-id"] || own;
      let data = [];
      let status = 200;
      if (path.endsWith("/auth/me"))
        data = {
          id: userId,
          full_name: "Pessoa de teste",
          email: "pessoa@example.com",
          is_active: true,
        };
      else if (path.endsWith("/auth/my-families")) data = families;
      else if (path.endsWith("/family/members"))
        data = [
          {
            id: "one",
            user_id: userId,
            full_name: "Pessoa de teste",
            email: "pessoa@example.com",
            role: selected === own ? "OWNER" : families[1].role,
            alias_name: "Pessoa",
          },
          ...(selected === shared
            ? [
                {
                  id: "two",
                  user_id: "another-user",
                  full_name: "Outra pessoa",
                  role: "OWNER",
                  alias_name: "Outra",
                },
              ]
            : []),
        ];
      else if (path.endsWith("/family/accept-invite")) {
        status = 403;
        data = { detail: "Convite destinado a outro usuário" };
      }
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + "/family");
    await page
      .getByRole("heading", { name: "Meu espaço", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Abrir espaço compartilhado", exact: true })
      .click();
    await page.getByText("Outra pessoa", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("msfinancas_family_id")),
      shared,
    );
    await page.reload();
    await page.getByText("Outra pessoa", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("msfinancas_family_id")),
      shared,
    );
    // A switch in another tab must not silently alter this tab's request context.
    await page.evaluate(
      (own) => localStorage.setItem("msfinancas_family_id", own),
      own,
    );
    await page.reload();
    await page.getByText("Outra pessoa", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Tenho um convite", exact: true })
      .click();
    await page.getByLabel("Link ou código de convite").fill("invalid-token");
    await page
      .getByRole("button", { name: "Aceitar e abrir espaço", exact: true })
      .click();
    await page
      .getByRole("alert")
      .getByText("Convite destinado a outro usuário")
      .waitFor();
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem("msfinancas_family_id")),
      shared,
    );
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Abrir navegação", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Trocar espaço financeiro", exact: true })
      .click();
    await page
      .locator(".space-menu")
      .getByRole("button", { name: "Meu espaço Só você", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Meu espaço", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Abrir navegação", exact: true })
        .getAttribute("aria-expanded"),
      "false",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "Mobile page must not overflow horizontally",
    );
    families[1].role = "MEMBER";
    await page
      .getByRole("button", { name: "Abrir navegação", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Trocar espaço financeiro", exact: true })
      .click();
    await page
      .locator(".space-menu")
      .getByRole("button", {
        name: "Casa compartilhada 2 pessoas · Compartilhado",
        exact: true,
      })
      .click();
    await page.reload();
    await page.getByText("Outra pessoa", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Convidar pessoa", exact: true })
        .count(),
      0,
    );
    await page.goto(origin + "/settings");
    await page
      .getByRole("heading", { name: "Preferências do espaço", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Nova categoria", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
  }
});
