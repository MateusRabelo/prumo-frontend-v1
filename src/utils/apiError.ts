export function apiErrorMessage(error: any, fallback: string): string {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (!Array.isArray(detail)) return fallback;
  const labels: Record<string,string> = { preview_token:'Prévia do extrato',description:'Nome do lançamento',category_id:'Categoria',type:'Entrada ou saída',subscription_frequency:'Frequência',reviewed:'Conferência do extrato' };
  return detail.slice(0,3).map((item: any) => {
    const field = item.loc?.at(-1);
    const position = item.loc?.indexOf('entries');
    const row = position >= 0 && Number.isInteger(item.loc[position+1]) ? `Lançamento ${item.loc[position+1]+1}: ` : '';
    const message = item.type === 'missing' ? 'campo obrigatório' : item.type === 'string_too_long' ? `use até ${item.ctx?.max_length || 255} caracteres` : item.type === 'literal_error' ? 'selecione uma opção válida' : String(item.msg || 'valor inválido').replace(/^Value error,\s*/,'');
    return `${row}${labels[field] || 'Dados da importação'}: ${message}.`;
  }).join(' ') || fallback;
}
