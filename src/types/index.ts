export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface FamilySpace {
  role?: "OWNER" | "ADMIN" | "MEMBER";
  members_count?: number;
  id: string;
  name: string;
  owner_id: string;
  currency: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  alias_name: string;
  joined_at: string;
  email?: string;
  full_name?: string;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  invited_email: string;
  role: string;
  status: string;
  token?: string;
  expires_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  family_id: string;
  name: string;
  color: string;
  icon: string;
  classification: "NECESSIDADE" | "DESEJO" | "INVESTIMENTO";
  type: "DESPESA" | "RECEITA" | "AMBOS";
  order_index: number;
  is_active: boolean;
}

export interface FinancialAccount {
  id: string;
  family_id: string;
  name: string;
  account_type:
    | "CHECKING"
    | "SAVINGS"
    | "WALLET"
    | "CREDIT_CARD"
    | "INVESTMENT";
  bank_name?: string;
  agency?: string;
  account_number?: string;
  initial_balance: number;
  initial_balance_date: string;
  color: string;
  is_active: boolean;
  current_balance?: number;
  created_at: string;
}

export interface CreditCard {
  id: string;
  family_id: string;
  name: string;
  card_type: "CREDIT" | "DEBIT" | "MULTIPLE" | "BENEFIT";
  brand: string;
  bank_name?: string;
  last_digits?: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  responsible_name?: string;
  responsible_id?: string;
  account_id?: string;
  is_active: boolean;
  used_limit?: number;
  available_limit?: number;
  current_invoice_total?: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  family_id: string;
  name: string;
  is_active: boolean;
}

export interface ResponsiblePerson {
  user_id?: string;
  is_system?: boolean;
  is_current_user?: boolean;
  id: string;
  family_id: string;
  name: string;
  is_shared: boolean;
  is_active: boolean;
}

export interface Transaction {
  recurrence_id?: string;
  is_invoice_payment?: boolean;
  card_last_digits?: string;
  invoice_year?: number;
  invoice_month?: number;
  payment_mode?: "ACCOUNT" | "CREDIT" | "DEBIT";
  invoice_id?: string;
  invoice_label?: string;
  id: string;
  family_id: string;
  date: string;
  description: string;
  type: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  amount: number;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  account_id: string;
  account_name?: string;
  destination_account_id?: string;
  destination_account_name?: string;
  card_id?: string;
  card_name?: string;
  responsible_name: string;
  is_shared: boolean;
  classification: "NECESSIDADE" | "DESEJO" | "INVESTIMENTO";
  payment_method_id?: string;
  payment_method_name?: string;
  status: "REALIZADA" | "PENDENTE" | "VENCIDA";
  notes?: string;
  installment_id?: string;
  created_at: string;
}

export interface TransactionSummary {
  total_realized_income: number;
  total_realized_expense: number;
  realized_net: number;
  total_pending_income: number;
  total_pending_expense: number;
  count: number;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  skip: number;
  limit: number;
  summary: TransactionSummary;
}

export interface Installment {
  id: string;
  installment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: "PENDENTE" | "PAGA" | "CANCELADA";
  payment_date?: string;
  transaction_id?: string;
}

export interface InstallmentPlan {
  imported_from_number?: number;
  id: string;
  family_id: string;
  description: string;
  category_id: string;
  category_name?: string;
  account_id?: string;
  account_name?: string;
  card_id?: string;
  card_name?: string;
  payment_method_id?: string;
  payment_method_name?: string;
  responsible_name: string;
  is_shared: boolean;
  total_amount: number;
  installments_count: number;
  purchase_date: string;
  first_due_date: string;
  notes?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  paid_amount: number;
  remaining_amount: number;
  installments: Installment[];
}

export interface InstallmentCalendarMonth {
  year: number;
  month: number;
  total_due: number;
  total_paid: number;
  total_pending: number;
  items: {
    installment_id: string;
    plan_id: string;
    description: string;
    category_name?: string;
    responsible_name: string;
    installment_number: number;
    installments_count: number;
    amount: number;
    due_date: string;
    status: string;
  }[];
}

export interface Budget503020 {
  id: string;
  year: number;
  month: number;
  estimated_income: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  needs_allocated: number;
  wants_allocated: number;
  savings_allocated: number;
  needs_spent: number;
  wants_spent: number;
  savings_spent: number;
}

export interface CustomBudget {
  id: string;
  year: number;
  month: number;
  category_id?: string;
  category_name?: string;
  responsible_name?: string;
  classification?: string;
  limit_amount: number;
  alert_threshold_percentage: number;
  realized_spent: number;
  remaining_amount: number;
  consumed_percentage: number;
  is_warning: boolean;
  is_exceeded: boolean;
  exceeded_amount: number;
}

export interface GoalContribution {
  is_reversed?: boolean;
  id: string;
  goal_id: string;
  date: string;
  type: "CONTRIBUICAO" | "RETIRADA" | "AJUSTE";
  amount: number;
  notes?: string;
  account_id?: string;
  account_name?: string;
  created_at: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  target_amount: number;
  accumulated_amount: number;
  current_amount?: number;
  remaining_amount: number;
  progress_percentage: number;
  target_date?: string;
  estimated_monthly_needed?: number;
  responsible_name: string;
  is_shared: boolean;
  status: "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  contributions: GoalContribution[];
}

export interface DashboardMetrics {
  start_date: string;
  end_date: string;
  period_label: string;
  realized_income: number;
  realized_expense: number;
  net_result: number;
  pending_income: number;
  pending_expense: number;
  projected_net: number;
  future_installments_total: number;
  savings_rate?: number;
  total_account_balance: number;
  category_spending: {
    category_id?: string;
    category_name: string;
    color: string;
    amount: number;
    percentage: number;
  }[];
  responsible_spending: {
    responsible_name: string;
    is_shared: boolean;
    amount: number;
    income: number;
    percentage: number;
  }[];
  classification_spending: {
    classification: string;
    amount: number;
    percentage: number;
  }[];
  cash_flow_timeline: {
    period: string;
    label: string;
    realized_income: number;
    realized_expense: number;
    net_result: number;
  }[];
  top_expenses: {
    id: string;
    description: string;
    category_name?: string;
    responsible_name: string;
    amount: number;
    date: string;
  }[];
  future_commitments: {
    period: string;
    label: string;
    amount: number;
    count: number;
  }[];
}

export interface MonthlyReportResponse {
  year: number;
  month: number;
  period_label: string;
  realized_income: number;
  realized_expense: number;
  net_result: number;
  savings_rate?: number | null;
  categories: {
    category_id?: string;
    category_name: string;
    color: string;
    total_amount: number;
    percentage: number;
    classification?: string;
  }[];
  responsibles: {
    responsible_id?: string;
    responsible_name: string;
    total_amount: number;
    percentage: number;
  }[];
  classifications: {
    classification: string;
    total_amount: number;
    percentage: number;
  }[];
  total_transactions_count: number;
}

export interface AnnualMonthSummary {
  month: number;
  month_name: string;
  income: number;
  expense: number;
  net: number;
  savings_rate?: number | null;
}

export interface AnnualReportResponse {
  year: number;
  total_income: number;
  total_expense: number;
  net_result: number;
  average_monthly_income: number;
  average_monthly_expense: number;
  months: AnnualMonthSummary[];
  top_categories: {
    category_id?: string;
    category_name: string;
    color: string;
    total_amount: number;
    percentage: number;
    classification?: string;
  }[];
}

export interface CardInvoiceItem {
  id: string;
  date: string;
  description: string;
  category_name?: string;
  category_color?: string;
  responsible_name: string;
  amount: number;
  is_installment: boolean;
  installment_text?: string;
  status: string;
}

export interface CardInvoiceResponse {
  external_settled?: boolean;
  external_paid_amount?: number;
  cycle_start_date: string;
  id?: string;
  card_id: string;
  year: number;
  month: number;
  period_label: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: "ABERTA" | "FECHADA" | "PAGA" | "VENCIDA";
  items_count: number;
  is_current?: boolean;
  payment_date?: string;
  payment_account_id?: string;
  payment_account_name?: string;
  items: CardInvoiceItem[];
  created_at?: string;
}

export interface InvoicePayRequest {
  account_id: string;
  payment_date?: string;
  amount?: number;
  notes?: string;
}
