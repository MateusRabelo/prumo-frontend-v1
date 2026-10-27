export const origin = process.env.FRONTEND_TEST_URL || "http://localhost:5174";
const id = (n) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
export const family = id(1),
  user = id(2),
  account = id(3),
  category = id(4),
  card = id(5),
  goal = id(6),
  plan = id(7);
const now = "2026-10-26",
  created = now + "T12:00:00Z";
const categories = [
  {
    id: category,
    family_id: family,
    name: "Mercado",
    type: "DESPESA",
    classification: "NECESSIDADE",
    color: "#0F5B4F",
    icon: "shopping-cart",
    is_active: true,
  },
  {
    id: id(14),
    name: "Salário",
    type: "RECEITA",
    classification: "NECESSIDADE",
    color: "#2E9E6B",
    is_active: true,
  },
];
const accounts = [
  {
    id: account,
    family_id: family,
    name: "Conta da casa",
    account_type: "CHECKING",
    bank_name: "Banco da família",
    initial_balance: 0,
    current_balance: 3482.1,
    initial_balance_date: now,
    color: "#0F5B4F",
    is_active: true,
    created_at: created,
  },
];
const cards = [
  {
    id: card,
    family_id: family,
    name: "Cartão da casa",
    card_type: "CREDIT",
    brand: "Visa",
    bank_name: "Banco da família",
    last_digits: "4281",
    credit_limit: 6500,
    used_limit: 1240.68,
    available_limit: 5259.32,
    current_invoice_total: 842.37,
    closing_day: 20,
    due_day: 28,
    color: "#0F5B4F",
    responsible_name: "Família",
    account_id: account,
    is_active: true,
  },
];
const transaction = {
  id: id(10),
  family_id: family,
  date: now,
  description: "Compra do mercado",
  type: "DESPESA",
  amount: 1080,
  category_id: category,
  category_name: "Mercado",
  category_color: "#0F5B4F",
  account_id: account,
  account_name: "Conta da casa",
  responsible_name: "Família",
  is_shared: true,
  classification: "NECESSIDADE",
  status: "REALIZADA",
  created_at: created,
};
const goals = [
  {
    id: goal,
    name: "Viagem de julho",
    family_id: family,
    target_amount: 9000,
    accumulated_amount: 3684,
    remaining_amount: 5316,
    progress_percentage: 40.93,
    target_date: "2027-07-01",
    responsible_name: "Família",
    is_shared: true,
    status: "EM_ANDAMENTO",
    contributions: [],
    created_at: created,
  },
];
const installments = [
  {
    id: id(8),
    installment_plan_id: plan,
    installment_number: 1,
    amount: 389.9,
    due_date: "2026-11-12",
    status: "PENDENTE",
  },
];
const plans = [
  {
    id: plan,
    family_id: family,
    description: "Geladeira da casa",
    category_id: category,
    category_name: "Casa",
    account_id: account,
    account_name: "Conta da casa",
    responsible_name: "Família",
    is_shared: true,
    total_amount: 3899,
    installments_count: 10,
    purchase_date: now,
    first_due_date: "2026-11-12",
    status: "ACTIVE",
    paid_amount: 0,
    remaining_amount: 3899,
    installments,
    created_at: created,
  },
];
const categoriesReport = [
  {
    category_id: category,
    category_name: "Mercado",
    color: "#0F5B4F",
    total_amount: 1080,
    amount: 1080,
    percentage: 62.87,
    classification: "NECESSIDADE",
  },
];
const metrics = {
  period_label: "Outubro de 2026",
  realized_income: 5200,
  realized_expense: 1717.9,
  net_result: 3482.1,
  pending_income: 0,
  pending_expense: 842.37,
  total_account_balance: 3482.1,
  savings_rate: 66.96,
  future_installments_total: 389.9,
  projected_net: 2249.83,
  category_spending: categoriesReport,
  responsible_spending: [
    {
      responsible_name: "Família",
      is_shared: true,
      income: 5200,
      amount: 1717.9,
      percentage: 100,
    },
  ],
  classification_spending: [
    { classification: "NECESSIDADE", amount: 1717.9, percentage: 100 },
  ],
  top_expenses: [transaction],
  cash_flow_timeline: [
    { label: "Set/26", realized_income: 4980, realized_expense: 1934 },
    { label: "Out/26", realized_income: 5200, realized_expense: 1717.9 },
  ],
  future_commitments: [],
};
const invoice = {
  id: id(11),
  card_id: card,
  year: 2026,
  month: 10,
  period_label: "Outubro / 2026",
  cycle_start_date: "2026-09-21",
  closing_date: "2026-10-20",
  due_date: "2026-10-28",
  total_amount: 842.37,
  paid_amount: 0,
  remaining_amount: 842.37,
  status: "FECHADA",
  items_count: 1,
  is_current: true,
  items: [{ ...transaction, date: now, amount: 842.37, is_installment: false }],
};
export async function mockPrumo(context) {
  const writes = [];
  await context.addInitScript(
    ({ family }) => {
      localStorage.setItem("msfinancas_token", "test-token");
      localStorage.setItem("msfinancas_family_id", family);
    },
    { family },
  );
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace(/\/$/, "");
    let data = [];
    if (request.method() !== "GET") {
      writes.push({ path, body: request.postDataJSON() });
      data = { ...transaction, ...request.postDataJSON() };
    } else if (path.endsWith("/auth/me"))
      data = {
        id: user,
        full_name: "Pessoa de teste",
        email: "pessoa@example.com",
        is_active: true,
      };
    else if (path.endsWith("/auth/my-families"))
      data = [
        {
          id: family,
          name: "Espaço da casa",
          owner_id: user,
          currency: "BRL",
          role: "OWNER",
          members_count: 1,
        },
      ];
    else if (path.endsWith("/family/members"))
      data = [
        {
          id: id(12),
          user_id: user,
          full_name: "Pessoa de teste",
          alias_name: "Pessoa",
          email: "pessoa@example.com",
          role: "OWNER",
        },
      ];
    else if (path.endsWith("/settings/accounts")) data = accounts;
    else if (path.endsWith("/settings/categories")) data = categories;
    else if (path.endsWith("/settings/responsibles"))
      data = [
        { id: id(13), name: "Família", is_shared: true, is_active: true },
      ];
    else if (path.endsWith("/settings/payment-methods"))
      data = [{ id: id(15), name: "Pix", is_active: true }];
    else if (path.endsWith("/cards/invoices/overview")) data = {
      bank_balance: 3482.1, available_for_payment: 3482.1, total_amount: 842.37,
      paid_amount: 0, remaining_amount: 842.37, shortfall: 0, balance_after_payment: 2639.73,
      invoices: [{card_name: cards[0].name, invoice}],
    };
    else if (path.endsWith("/cards")) data = cards;
    else if (/\/cards\/[^/]+\/invoices$/.test(path)) data = [invoice];
    else if (/\/cards\/[^/]+\/invoices\/\d+\/\d+$/.test(path)) data = invoice;
    else if (path.endsWith("/transactions"))
      data = {
        items: [transaction],
        total: 1,
        skip: 0,
        limit: 50,
        summary: {
          total_realized_income: 5200,
          total_realized_expense: 1717.9,
          realized_net: 3482.1,
          total_pending_income: 0,
          total_pending_expense: 842.37,
          count: 1,
        },
      };
    else if (path.endsWith("/dashboard/metrics")) data = metrics;
    else if (path.endsWith("/goals")) data = goals;
    else if (path.endsWith("/contributions")) data = [];
    else if (path.endsWith("/installments")) data = plans;
    else if (path.endsWith("/calendar/overview"))
      data = [
        {
          year: 2026,
          month: 11,
          total_due: 389.9,
          total_paid: 0,
          total_pending: 389.9,
          items: [],
        },
      ];
    else if (path.endsWith("/budgets/503020"))
      data = {
        id: id(16),
        year: 2026,
        month: 10,
        estimated_income: 5200,
        needs_percentage: 50,
        wants_percentage: 30,
        savings_percentage: 20,
        needs_allocated: 2600,
        wants_allocated: 1560,
        savings_allocated: 1040,
        needs_spent: 1717.9,
        wants_spent: 0,
        savings_spent: 0,
      };
    else if (path.endsWith("/budgets/custom")) data = [];
    else if (path.endsWith("/reports/monthly"))
      data = {
        ...metrics,
        year: 2026,
        month: 10,
        categories: categoriesReport,
        responsibles: [
          {
            responsible_name: "Família",
            total_amount: 1717.9,
            percentage: 100,
          },
        ],
        classifications: [
          {
            classification: "NECESSIDADE",
            total_amount: 1717.9,
            percentage: 100,
          },
        ],
        total_transactions_count: 2,
      };
    else if (path.endsWith("/reports/annual"))
      data = {
        year: 2026,
        total_income: 52000,
        total_expense: 23000,
        net_result: 29000,
        average_monthly_income: 5200,
        average_monthly_expense: 2300,
        months: [
          {
            month: 10,
            month_name: "Outubro",
            income: 5200,
            expense: 1717.9,
            net: 3482.1,
            savings_rate: 66.96,
          },
        ],
        top_categories: categoriesReport,
      };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  return writes;
}
