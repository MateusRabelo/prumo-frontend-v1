import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = parseISO(dateStr);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export const formatDate = formatDateBR;

export function formatPercentage(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num.toFixed(1).replace(".", ",")}%`;
}

export const formatPercent = formatPercentage;

export function formatEnum(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    RECEITA: "Receita",
    DESPESA: "Despesa",
    TRANSFERENCIA: "Transferência",
    AMBOS: "Receitas e despesas",
    NECESSIDADE: "Necessidades",
    DESEJO: "Desejos",
    INVESTIMENTO: "Investimentos",
    OUTRO: "Outros",
    REALIZADA: "Realizada",
    PENDENTE: "Pendente",
    VENCIDA: "Vencida",
    PAGA: "Paga",
    CANCELADA: "Cancelada",
    CONTRIBUICAO: "Aporte",
    RETIRADA: "Retirada",
    AJUSTE: "Ajuste",
  };
  return value ? labels[value] || value : "—";
}

export function parseMoney(value: string | number): number {
  if (typeof value === "number") return value;
  let normalized = value.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (normalized.includes(","))
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Number(normalized);
}
