import type { CreditCard } from '@/types';
export function cardCycle(card: CreditCard, rawDate: string) {
  const [year, month, day] = rawDate.split('-').map(Number);
  let offset = day <= card.closing_day ? 0 : 1;
  if (card.due_day <= card.closing_day) offset++;
  const first = new Date(year, month - 1 + offset, 1);
  const y = first.getFullYear(), m = first.getMonth();
  const due = new Date(y, m, Math.min(card.due_day, new Date(y, m + 1, 0).getDate()));
  return { year: y, month: m + 1, dueDate: `${y}-${String(m+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`, label: first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
}
