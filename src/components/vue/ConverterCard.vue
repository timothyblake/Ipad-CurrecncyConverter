<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import CurrencyDropdown from './CurrencyDropdown.vue';
import MultiRatesGrid from './MultiRatesGrid.vue';
import { currencies, foreignCurrencies, convert, formatAmount, parseAmount, type ForeignCurrency, type Currency } from '../../utils/currencies';
import { fallbackSnapshot, loadRates, readCache, CACHE_TTL, type RateState } from '../../utils/ratesService';
const INPUT_CURRENCY_KEY = 'currency_input_currency';
const INPUT_AMOUNT_KEY = 'currency_input_amount';
const FOREIGN_CURRENCY_KEY = 'currency_foreign_currency';
const selectedForeign = ref<ForeignCurrency>('JMD');
const reversed = ref(false);
const sourceAmount = ref('1000');
const offline = ref(false);
const loading = ref(true);
const state = ref<RateState>({ snapshot: fallbackSnapshot, mode: 'fallback', failed: false });
const source = computed<Currency>(() => reversed.value ? 'GBP' : selectedForeign.value);
const target = computed<Currency>(() => reversed.value ? selectedForeign.value : 'GBP');
const numericAmount = computed(() => parseAmount(sourceAmount.value));
const result = computed(() => numericAmount.value === null ? null : convert(numericAmount.value, source.value, target.value, state.value.snapshot.rates));
const resultText = computed(() => result.value === null ? '—' : formatAmount(result.value));
// Shrink very long results so they stay inside the output box.
const resultSize = computed(() => resultText.value.length > 13 ? 'xlong' : resultText.value.length > 9 ? 'long' : '');
const rateLine = computed(() => `£1 = ${currencies[selectedForeign.value].symbol}${state.value.snapshot.rates[selectedForeign.value].toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${selectedForeign.value}`);
const describe = (code: Currency) => `${currencies[code].plural} (${currencies[code].symbol})`;
const sourceLabel = computed(() => reversed.value ? 'You enter (£ GBP)' : `You pay (${selectedForeign.value})`);
const targetLabel = computed(() => `Equivalent in ${describe(target.value)}`);
const presets = computed(() => (source.value === 'JMD' ? [500, 1000, 2500, 5000, 10000] : [5, 10, 20, 50, 100, 250])
  .map(value => ({ value, label: currencies[source.value].symbol + value.toLocaleString('en-GB') })));
const formatDate = (time: number, withTime = false) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}), timeZone: 'UTC' }).format(time) + (withTime ? ' UTC' : '');
const rateDate = computed(() => state.value.snapshot.updatedAt ? formatDate(state.value.snapshot.updatedAt) : '');
const badge = computed(() => loading.value ? 'Checking rates' : state.value.mode === 'fallback' ? 'Estimated rates' : offline.value ? 'Offline rates' : state.value.mode === 'cached' ? 'Saved rates' : '');
const stamp = computed(() => {
  if (state.value.mode === 'fallback') return loading.value ? 'Checking for current rates…' : `${offline.value ? 'Offline mode' : 'Live rates unavailable'} · using example rates, not current market rates`;
  if (offline.value) return `Offline mode · using rates saved ${rateDate.value}`;
  if (state.value.failed) return `Could not get current rates · using rates saved ${rateDate.value}`;
  if (state.value.mode === 'cached') return `Using saved rates from ${rateDate.value}`;
  return `Rates updated ${formatDate(state.value.snapshot.updatedAt, true)} · cached for offline use`;
});
let busy = false;
let timer: ReturnType<typeof setInterval>;
async function refresh(force = false) {
  if (busy) return;
  busy = true;
  loading.value = true;
  offline.value = !navigator.onLine;
  try { state.value = await loadRates(force); } finally { loading.value = false; busy = false; }
}
function connectionChanged() { offline.value = !navigator.onLine; if (!offline.value) void refresh(); }
function selectInputCurrency(currency: Currency) {
  reversed.value = currency === 'GBP';
  if (currency !== 'GBP') selectedForeign.value = currency;
}
function selectAmount(event: FocusEvent) { (event.target as HTMLInputElement).select(); }
function checkOnReturn() { if (document.visibilityState === 'visible') void refresh(); }
onMounted(() => {
  try {
    const savedForeign = sessionStorage.getItem(FOREIGN_CURRENCY_KEY);
    if (foreignCurrencies.includes(savedForeign as ForeignCurrency)) selectedForeign.value = savedForeign as ForeignCurrency;
    const savedAmount = sessionStorage.getItem(INPUT_AMOUNT_KEY);
    if (savedAmount !== null && savedAmount.length <= 20) sourceAmount.value = savedAmount;
    const saved = sessionStorage.getItem(INPUT_CURRENCY_KEY);
    if (saved === 'GBP' || foreignCurrencies.includes(saved as ForeignCurrency)) {
      selectInputCurrency(saved as Currency);
    }
  } catch { /* Currency selection still works when storage is blocked. */ }
  watch([source, selectedForeign, sourceAmount], ([currency, foreign, amount]) => {
    try {
      sessionStorage.setItem(INPUT_CURRENCY_KEY, currency);
      sessionStorage.setItem(FOREIGN_CURRENCY_KEY, foreign);
      sessionStorage.setItem(INPUT_AMOUNT_KEY, amount);
    } catch { /* Storage is optional. */ }
  }, { immediate: true, flush: 'sync' });
  offline.value = !navigator.onLine;
  const cached = readCache();
  if (cached) state.value = { snapshot: cached, mode: 'cached', failed: false };
  void refresh();
  window.addEventListener('online', connectionChanged);
  window.addEventListener('offline', connectionChanged);
  document.addEventListener('visibilitychange', checkOnReturn);
  timer = setInterval(() => { if (Date.now() - state.value.snapshot.fetchedAt >= CACHE_TTL) void refresh(); }, 60000);
});
onUnmounted(() => {
  window.removeEventListener('online', connectionChanged);
  window.removeEventListener('offline', connectionChanged);
  document.removeEventListener('visibilitychange', checkOnReturn);
  clearInterval(timer);
});
</script>
<template>
  <main class="converter">
    <header class="converter__header">
      <h1 class="converter__title">Currency Converter</h1>
      <p class="converter__stamp">{{ stamp }}</p>
    </header>
    <section class="converter__card" aria-label="Currency calculator">
      <div class="converter__topline">
        <p class="converter__direction">Converting <strong>{{ describe(source) }}</strong> → <strong>{{ describe(target) }}</strong></p>
        <div class="converter__meta">
          <span class="converter__rate converter__rate--pill">{{ rateLine }}</span>
          <span role="status" class="converter__status">
            <span v-if="badge" class="converter__badge" :class="{'converter__badge--neutral': loading}">
              <svg v-if="badge === 'Offline rates'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="2" x2="22" y2="22" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M2 8.8a15 15 0 0 1 4.2-2.8" /><path d="M10.7 5.1A15 15 0 0 1 22 8.8" /><path d="M5 12.6a10 10 0 0 1 5.2-2.8" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
              {{ badge }}
            </span>
          </span>
        </div>
      </div>

      <div class="converter__grid">
        <div class="converter__side">
          <label for="source-amount" class="converter__label">{{ sourceLabel }}</label>
          <CurrencyDropdown v-if="!reversed" v-model="selectedForeign" label="Select source currency" class="converter__currency" />
          <div v-else class="converter__currency converter__tag"><span class="converter__tag-main">£&nbsp;<span class="converter__tag-long">British Pound · </span>GBP</span><span class="converter__tag-sub">British Pound</span></div>
          <div class="converter__amount"><span class="converter__symbol" aria-hidden="true">{{ currencies[source].symbol }}</span><input id="source-amount" v-model="sourceAmount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="20" placeholder="0" :aria-label="`Amount in ${currencies[source].name}`" :aria-invalid="numericAmount === null" :aria-describedby="numericAmount === null ? 'amount-error' : undefined" class="converter__input" @focus="selectAmount" /></div>
        </div>
        <div class="converter__switch-row">
          <button class="converter__switch" type="button" aria-label="Switch conversion direction" title="Switch conversion direction" @click="reversed = !reversed"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9" /><path d="M3 5h18" /><polyline points="7 23 3 19 7 15" /><path d="M21 19H3" /></svg></button>
        </div>
        <div class="converter__side">
          <span class="converter__label" id="target-label">{{ targetLabel }}</span>
          <CurrencyDropdown v-if="reversed" v-model="selectedForeign" label="Select target currency" class="converter__currency" />
          <div v-else class="converter__currency converter__tag"><span class="converter__tag-main">£&nbsp;<span class="converter__tag-long">British Pound · </span>GBP</span><span class="converter__tag-sub">British Pound</span></div>
          <output id="converted-amount" for="source-amount" class="converter__output" aria-labelledby="target-label" aria-live="polite" aria-atomic="true"><span class="converter__symbol converter__symbol--output">{{ currencies[target].symbol }}</span><span class="converter__value" :class="resultSize && `converter__value--${resultSize}`">{{ resultText }}</span></output>
          <span class="converter__rate converter__rate--below">{{ rateLine }}</span>
        </div>
      </div>
      <p v-if="numericAmount === null" id="amount-error" class="converter__error" role="alert">Enter an amount from 0 to 999,999,999.99 with up to two decimal places.</p>

      <div class="converter__quick">
        <span class="converter__quick-label" id="quick-label">Quick amounts</span>
        <div class="converter__quick-row" role="group" aria-labelledby="quick-label">
          <div class="converter__chips">
            <button v-for="preset in presets" :key="preset.value" type="button" class="converter__chip" @click="sourceAmount = String(preset.value)">{{ preset.label }}</button>
          </div>
          <button type="button" class="converter__chip converter__chip--clear" @click="sourceAmount = ''">Clear</button>
        </div>
      </div>

      <MultiRatesGrid :amount="numericAmount" :source="source" :rates="state.snapshot.rates" @select="selectInputCurrency">
        <div class="converter__footer">
          <p class="converter__footnote">{{ state.mode === 'fallback' ? 'Example rates · available offline' : 'Rates cached on this iPad for offline use' }} · <a href="https://www.exchangerate-api.com" rel="noreferrer">Rates by ExchangeRate-API</a><br /><span class="converter__disclaimer">Indicative only. Your bank or exchange provider may charge different rates and fees.</span></p>
          <button class="converter__refresh" type="button" :disabled="loading || offline" aria-label="Refresh exchange rates" @click="refresh(true)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><polyline points="21 3 21 9 15 9" /></svg>{{ loading ? 'Checking' : 'Refresh' }}</button>
        </div>
      </MultiRatesGrid>
    </section>
  </main>
</template>
<style scoped>
/* Default layout: iPad portrait. Landscape (≥1000px) and phone (≤600px) follow. */
.converter {display:flex;flex-direction:column;gap:28px;padding:48px 40px 40px;}
.converter__header {display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.converter__title {margin:0;font-size:44px;line-height:52px;font-weight:800;letter-spacing:-0.8px;}
.converter__stamp {margin:0;font-size:18px;line-height:24px;color:var(--text-muted);}
.converter__card {display:flex;flex-direction:column;gap:24px;width:100%;max-width:960px;margin:0 auto;padding:32px;background:var(--bg-card);border:2px solid var(--border-card);border-radius:var(--radius-card);box-shadow:0 1px 3px #0f172a0f,0 12px 32px #0f172a14;}
.converter__topline {display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.converter__direction {margin:0;font-size:18px;line-height:26px;color:var(--text-muted);}
.converter__direction strong {color:var(--text-primary);}
.converter__meta {display:flex;align-items:center;gap:10px;}
.converter__rate {font-family:var(--font-mono);font-size:15px;font-weight:600;}
.converter__rate--pill {display:none;padding:6px 14px;color:var(--text-strong);background:var(--bg-input);border:1px solid var(--border-card);border-radius:999px;}
.converter__rate--below {grid-column:1/-1;justify-self:end;color:var(--text-muted);}
.converter__status:empty {display:none;}
.converter__badge {display:inline-flex;align-items:center;gap:8px;padding:7px 14px;font-size:14px;font-weight:700;color:var(--warning-text);background:var(--warning-bg);border-radius:999px;white-space:nowrap;}
.converter__badge--neutral {color:var(--text-strong);background:var(--border-card);}

.converter__grid {display:flex;flex-direction:column;gap:24px;}
.converter__side {display:grid;grid-template-columns:220px minmax(0,1fr);gap:12px;min-width:0;}
.converter__label {grid-column:1/-1;font-size:18px;line-height:22px;font-weight:600;color:var(--text-strong);}
.converter__currency {min-height:96px;}
.converter__tag {display:flex;flex-direction:column;justify-content:center;gap:2px;padding:0 20px;color:var(--text-tag);background:var(--bg-tag);border:2px solid var(--border-tag);border-radius:var(--radius-input);}
.converter__tag-main {font-size:22px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.converter__tag-long {display:none;}
.converter__tag-sub {font-size:14px;font-weight:500;color:#0c4a6e;}
.converter__amount,.converter__output {display:flex;align-items:center;gap:10px;min-width:0;min-height:96px;padding:8px 22px;border:2px solid var(--border-control);border-radius:var(--radius-input);}
.converter__amount {background:var(--bg-input);}
.converter__amount:focus-within {border-color:var(--border-focus);box-shadow:0 0 0 4px #3b82f640;}
.converter__symbol {flex:none;font-family:var(--font-mono);font-size:32px;font-weight:700;color:var(--text-muted);}
.converter__input {flex:1;width:100%;min-width:0;height:76px;padding:0;background:transparent;border:0;outline:none;color:var(--text-primary);font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:36px;font-weight:700;text-align:right;}
.converter__input::placeholder {color:var(--text-muted);}
.converter__input:focus-visible {outline:none;}
.converter__output {justify-content:flex-end;color:var(--accent-green);background:var(--bg-output);border-color:var(--border-output);}
.converter__symbol--output {color:var(--accent-green);}
.converter__value {min-width:0;font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:48px;line-height:56px;font-weight:800;letter-spacing:-1px;text-align:right;overflow-wrap:anywhere;}
.converter__value--long {font-size:36px;line-height:44px;}
.converter__value--xlong {font-size:26px;line-height:34px;letter-spacing:-0.5px;}
.converter__switch-row {display:flex;align-items:center;gap:20px;}
.converter__switch-row::before,.converter__switch-row::after {content:'';flex:1;height:2px;background:var(--border-card);}
.converter__switch {display:grid;place-items:center;flex:none;width:64px;height:64px;padding:0;color:#fff;background:var(--accent-blue);border:0;border-radius:50%;box-shadow:0 4px 14px #3b82f666;transition:transform .2s ease,background-color .2s ease;}
.converter__switch:hover {background:var(--accent-blue-hover);}
.converter__switch:active {transform:scale(.95);}

.converter__error {margin:0;padding:14px 16px;font-size:14px;line-height:22px;color:var(--danger-text);background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:10px;}
.converter__quick {display:flex;flex-direction:column;gap:10px;padding-bottom:24px;border-bottom:2px solid var(--border-card);}
.converter__quick-label {font-size:16px;font-weight:600;color:var(--text-muted);}
.converter__quick-row,.converter__chips {display:flex;align-items:stretch;gap:10px;}
.converter__chips {flex:1;min-width:0;}
.converter__chip {flex:1 1 0;min-width:0;height:64px;padding:0 6px;font-family:var(--font-mono);font-size:18px;font-weight:700;white-space:nowrap;color:var(--text-primary);background:var(--bg-card);border:2px solid var(--border-control);border-radius:var(--radius-chip);}
.converter__chip:hover {background:#eff6ff;border-color:var(--border-focus);}
.converter__chip--clear {flex:none;padding:0 20px;font-family:'Inter',sans-serif;color:var(--danger-text);background:var(--danger-bg);border-color:var(--danger-border);}
.converter__chip--clear:hover {background:#fee2e2;border-color:#f87171;}
.converter__footer {display:flex;justify-content:space-between;align-items:center;gap:16px;}
.converter__footnote {margin:0;font-size:14px;line-height:22px;color:var(--text-muted);}
.converter__disclaimer {font-size:12px;}
.converter__refresh {display:inline-flex;align-items:center;gap:8px;flex:none;min-height:64px;padding:0 18px;font-size:16px;font-weight:600;color:var(--text-strong);background:var(--bg-card);border:2px solid var(--border-control);border-radius:var(--radius-chip);}
.converter__refresh:not(:disabled):hover {background:#eff6ff;border-color:var(--border-focus);}

/* iPad landscape: source | switch | target columns, rate as a pill. */
@media(min-width:1000px){
  .converter {gap:22px;padding:28px 24px 32px;}
  .converter__header {gap:6px;}
  .converter__title {font-size:42px;line-height:50px;}
  .converter__card {gap:26px;padding:32px 40px 36px;}
  .converter__rate--pill {display:inline-flex;}
  .converter__rate--below {display:none;}
  .converter__grid {display:grid;grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:20px;align-items:end;}
  .converter__side {grid-template-columns:minmax(0,1fr);}
  .converter__currency {min-height:64px;}
  .converter__tag-long {display:inline;}
  .converter__tag-sub {display:none;}
  .converter__switch-row {height:96px;justify-content:center;}
  .converter__switch-row::before,.converter__switch-row::after {display:none;}
  .converter__quick-row,.converter__chips {gap:12px;}
  .converter__chip {padding:0 8px;font-size:20px;}
  .converter__chip--clear {padding:0 28px;font-size:18px;}
}
/* Phone: stack everything into one column. */
@media(max-width:600px){
  .converter {gap:20px;padding:24px 16px 24px;}
  .converter__title {font-size:34px;line-height:42px;}
  .converter__stamp {font-size:15px;line-height:22px;}
  .converter__card {gap:20px;padding:20px;}
  .converter__direction {font-size:16px;line-height:24px;}
  .converter__side {grid-template-columns:minmax(0,1fr);}
  .converter__currency {min-height:64px;}
  .converter__tag-long {display:inline;}
  .converter__tag-sub {display:none;}
  .converter__amount,.converter__output {padding:8px 16px;}
  .converter__value {font-size:40px;line-height:48px;}
  .converter__value--long {font-size:30px;line-height:38px;}
  .converter__value--xlong {font-size:22px;line-height:30px;}
  .converter__quick-row {flex-direction:column;}
  .converter__chips {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));}
  .converter__footer {flex-direction:column;align-items:stretch;}
  .converter__refresh {justify-content:center;}
}
@media(max-width:380px){.converter__tag-long{display:none}}
</style>
