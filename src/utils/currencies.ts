export const currencies = {
  JMD: { name: 'Jamaican Dollar', symbol: 'J$', flag: '🇯🇲' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
} as const;
export type Currency = keyof typeof currencies;
export type ForeignCurrency = Exclude<Currency, 'GBP'>;
export type Rates = Record<Currency, number>;
export const foreignCurrencies: ForeignCurrency[] = ['JMD', 'EUR', 'USD'];
export const allCurrencies: Currency[] = ['JMD', 'GBP', 'EUR', 'USD'];
export function parseAmount(value: string): number | null {
  if (value.trim() === '') return 0;
  // Accept ungrouped decimals or correctly grouped en-GB amounts; never silently strip invalid characters.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d{0,2})?$/.test(value) || value === '.') return null;
  const amount = Number(value.replaceAll(',', ''));
  return Number.isFinite(amount) && amount >= 0 && amount <= 999999999.99 ? amount : null;
}
export function convert(amount: number, from: Currency, to: Currency, rates: Rates) {
  return amount / rates[from] * rates[to];
}
export function formatAmount(amount: number) {
  return amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
