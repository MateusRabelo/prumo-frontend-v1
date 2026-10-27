const banks: [string[], string][] = [
  [['nubank','nu pagamentos'], '18236120'], [['neon'], '20855875'], [['itau'], '60701190'],
  [['banco do brasil'], '00000000'], [['bradesco'], '60746948'], [['santander'], '90400888'],
  [['inter'], '00416968'], [['caixa'], '00360305'], [['c6'], '31872495'],
  [['xp'], '02332886'], [['btg'], '30306294'], [['picpay'], '22896431'],
  [['mercado pago'], '10573521'], [['sicredi'], '01181521'], [['sicoob'], '02038232'],
];
export function bankLogo(name: string): string | undefined {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const bank = banks.find(([aliases]) => aliases.some(alias => new RegExp(`(^|\\s)${alias}(\\s|$)`).test(normalized)));
  return bank ? `/banks/${bank[1]}.png` : undefined;
}
