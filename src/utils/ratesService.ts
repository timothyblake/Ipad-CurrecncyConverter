import type { Rates } from './currencies';
export const CACHE_KEY = 'currency_rates_cache';
export const CACHE_TTL = 12 * 60 * 60 * 1000;
export const FALLBACK_RATES: Rates = { GBP: 1, JMD: 204.5, USD: 1.31, EUR: 1.18 };
export interface RateSnapshot { rates: Rates; updatedAt: number; fetchedAt: number }
export type RateState = { snapshot: RateSnapshot; mode: 'current' | 'cached' | 'fallback'; failed: boolean };
export const fallbackSnapshot: RateSnapshot = { rates: FALLBACK_RATES, updatedAt: 0, fetchedAt: 0 };
export function validRates(value: unknown): value is Rates {
  if (!value || typeof value !== 'object') return false;
  const rates = value as Rates;
  return rates.GBP === 1 && ['JMD', 'USD', 'EUR'].every(code => typeof rates[code as keyof Rates] === 'number' && Number.isFinite(rates[code as keyof Rates]) && rates[code as keyof Rates] > 0);
}
export function readCache(storage?: Pick<Storage, 'getItem'>): RateSnapshot | null {
  try {
    const cached = JSON.parse((storage ?? localStorage).getItem(CACHE_KEY) ?? 'null');
    if (cached && validRates(cached.rates) && Number.isFinite(cached.updatedAt) && cached.updatedAt > 0 && Number.isFinite(cached.fetchedAt) && cached.fetchedAt > 0 && cached.fetchedAt <= Date.now() && cached.updatedAt <= Date.now() + 300000) return cached;
  } catch { /* Storage can be unavailable in private browsing. */ }
  return null;
}
export async function loadRates(force = false): Promise<RateState> {
  const cached = readCache();
  const backup = { snapshot: cached ?? fallbackSnapshot, mode: cached ? 'cached' : 'fallback', failed: false } as RateState;
  if (!navigator.onLine) return backup;
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) return { ...backup, mode: Date.now() - cached.updatedAt > 48 * 60 * 60 * 1000 ? 'cached' : 'current' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/GBP', { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Rates unavailable');
    const data = await response.json();
    if (data.result !== 'success' || data.base_code !== 'GBP' || !validRates(data.rates) || !Number.isFinite(data.time_last_update_unix) || data.time_last_update_unix <= 0 || data.time_last_update_unix * 1000 > Date.now() + 300000) throw new Error('Invalid rates');
    const { GBP, JMD, USD, EUR } = data.rates;
    const snapshot: RateSnapshot = { rates: { GBP, JMD, USD, EUR }, updatedAt: data.time_last_update_unix * 1000, fetchedAt: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* Conversion still works without persistent storage. */ }
    return { snapshot, mode: Date.now() - snapshot.updatedAt > 48 * 60 * 60 * 1000 ? 'cached' : 'current', failed: false };
  } catch { return { ...backup, failed: true }; }
  finally { clearTimeout(timeout); }
}
