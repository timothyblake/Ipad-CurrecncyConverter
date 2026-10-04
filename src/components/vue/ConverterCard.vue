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
const rateLine = computed(() => `1 ${source.value} = ${convert(1, source.value, target.value, state.value.snapshot.rates).toLocaleString('en-GB', { maximumFractionDigits: 5 })} ${target.value}`);
const rateDate = computed(() => state.value.snapshot.updatedAt ? new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(state.value.snapshot.updatedAt) : '');
const status = computed(() => loading.value ? 'Checking rates' : state.value.mode === 'fallback' ? 'Estimated rates' : offline.value ? 'Offline rates' : state.value.mode === 'cached' ? 'Saved rates' : 'Rates up to date');
const warning = computed(() => {
  if (loading.value) return '';
  if (state.value.mode === 'fallback') return `${offline.value ? 'Offline — ' : 'Live rates unavailable — '}using example rates from the project specification. These are estimates, not current market rates.`;
  if (offline.value) return `Offline mode — using saved rates from ${rateDate.value}. Your conversions still work.`;
  if (state.value.failed || state.value.mode === 'cached') return `Could not get current rates. Using saved rates from ${rateDate.value}.`;
  return '';
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
  <section class="currency-converter" aria-label="Currency calculator">
    <div class="currency-converter__header">
      <span class="currency-converter__eyebrow">A LITTLE CLARITY, WHEREVER YOU GO</span>
      <span class="currency-converter__status" :class="{'currency-converter__status--warning': warning}" role="status"><span class="currency-converter__status-dot"></span>{{ status }}</span>
    </div>
    <div class="currency-converter__grid">
      <div class="currency-converter__field">
        <label for="source-amount" class="currency-converter__label">You enter</label>
        <div class="currency-converter__input-group">
          <CurrencyDropdown v-if="!reversed" v-model="selectedForeign" label="Select source currency" />
          <div v-else class="currency-converter__tag"><span aria-hidden="true">🇬🇧</span> GBP <span class="currency-converter__currency-name">· British Pound</span></div>
          <div class="currency-converter__amount-row"><span class="currency-converter__symbol" aria-hidden="true">{{ currencies[source].symbol }}</span><input id="source-amount" v-model="sourceAmount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="20" placeholder="0" :aria-label="`Amount in ${currencies[source].name}`" :aria-invalid="numericAmount === null" :aria-describedby="numericAmount === null ? 'amount-error' : undefined" class="currency-converter__input" @focus="selectAmount" /></div>
          <span class="currency-converter__field-note">{{ currencies[source].name }}</span>
        </div>
      </div>
      <button class="currency-converter__switch" type="button" aria-label="Switch conversion direction" @click="reversed = !reversed"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5"/></svg></button>
      <div class="currency-converter__field">
        <label class="currency-converter__label" for="converted-amount">You get <span class="currency-converter__estimate">ESTIMATED</span></label>
        <div class="currency-converter__input-group currency-converter__input-group--output">
          <CurrencyDropdown v-if="reversed" v-model="selectedForeign" label="Select target currency" />
          <div v-else class="currency-converter__tag"><span aria-hidden="true">🇬🇧</span> GBP <span class="currency-converter__currency-name">· British Pound</span></div>
          <output id="converted-amount" for="source-amount" class="currency-converter__output" aria-live="polite" aria-atomic="true"><span class="currency-converter__symbol">{{ currencies[target].symbol }}</span><span class="currency-converter__value">{{ result === null ? '—' : formatAmount(result) }}</span></output>
          <span class="currency-converter__field-note">{{ currencies[target].name }}</span>
        </div>
      </div>
    </div>
    <p v-if="numericAmount === null" id="amount-error" class="currency-converter__error" role="alert">Enter an amount from 0 to 999,999,999.99 with up to two decimal places.</p>
    <div class="currency-converter__rate"><span class="currency-converter__rate-icon" aria-hidden="true">↗</span>{{ rateLine }}<span class="currency-converter__rate-note">{{ state.mode === 'fallback' ? 'Example exchange rate' : 'Indicative exchange rate' }}</span></div>
    <MultiRatesGrid :amount="numericAmount" :source="source" :rates="state.snapshot.rates" @select="selectInputCurrency" />
    <p v-if="warning" class="currency-converter__warning" role="status">{{ warning }}</p>
    <div class="currency-converter__footer"><div><span class="currency-converter__date">{{ state.mode === 'fallback' ? 'Example rates · available offline' : `Rates updated ${rateDate} · saved on this device` }}</span><span class="currency-converter__disclaimer">For a little perspective. Your bank or exchange provider may charge different rates and fees.</span></div><button class="currency-converter__refresh" :disabled="loading || offline" @click="refresh(true)" aria-label="Refresh exchange rates"><span aria-hidden="true">↻</span> {{ loading ? 'Checking' : 'Refresh' }}</button></div>
  </section>
</template>
<style scoped>
.currency-converter {max-width:960px;margin:0 auto;padding:36px 40px 16px;background:var(--bg-card);border:5px solid #ffffff;border-radius:var(--radius-card);background:linear-gradient(135deg,#f4f9ff,#f5f3ff);box-shadow:0 24px 80px #346aa00c;}
.currency-converter__header {display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:28px;}
.currency-converter__eyebrow {font-size:10px;letter-spacing:1.5px;font-weight:600;color:var(--text-muted);}
.currency-converter__status {padding:7px 10px;background:#ffffff;border-radius:999px;display:flex;align-items:center;gap:7px;color:#32725c;font-size:12px;white-space:nowrap;}
.currency-converter__status-dot {height:6px;width:6px;background:currentColor;border-radius:99px;}
.currency-converter__status--warning {color:#8a590d;}
.currency-converter__grid {display:grid;grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:16px;align-items:center;}
.currency-converter__field {min-width:0;}
.currency-converter__label {display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:500;margin-bottom:12px;}
.currency-converter__estimate {font-size:9px;letter-spacing:1.2px;color:#5d79a1;}
.currency-converter__input-group {background:var(--bg-input);border:3px solid #ffffff;border-radius:var(--radius-input);padding:4px 20px 20px;min-width:0;}
.currency-converter__input-group:focus-within {border-color:var(--border-focus);box-shadow:0 0 0 3px #3b82f630;}
.currency-converter__input-group--output {background:#ffffff;border-color:#ffffff;box-shadow:0 4px 18px #327ade06;}
.currency-converter__tag {display:flex;gap:9px;align-items:center;min-height:64px;font-size:19px;font-weight:600;white-space:nowrap;}
.currency-converter__tag>span:first-child {font-size:28px;}
.currency-converter__currency-name {font-size:16px;font-weight:400;}
.currency-converter__amount-row,.currency-converter__output {display:flex;gap:8px;align-items:baseline;min-height:68px;padding-top:10px;}
.currency-converter__symbol {font-size:32px;font-weight:500;flex-shrink:0;}
.currency-converter__input {width:100%;min-width:0;padding:0;height:64px;background:transparent;border:0;color:var(--text-primary);font-size:36px;font-weight:600;font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-1px;outline:none;}
.currency-converter__input:focus-visible {outline:none;}
.currency-converter__output {color:var(--accent-green);}
.currency-converter__value {font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;font-size:48px;font-weight:600;line-height:58px;letter-spacing:-2px;overflow-wrap:anywhere;min-width:0;}
.currency-converter__field-note {display:block;font-size:13px;color:var(--text-muted);margin-top:8px;}
.currency-converter__input-group--output .currency-converter__field-note {color:#617898;}
.currency-converter__switch {display:grid;place-items:center;width:64px;height:64px;border:1px solid #6ca6f3;border-radius:999px;background:var(--accent-blue);color:white;box-shadow:0 4px 0 #d9e8fc,0 8px 18px #3184ee26;margin-top:32px;transition:background .15s,transform .15s;}
.currency-converter__switch:hover {background:var(--accent-blue-hover);transform:rotate(8deg);}
.currency-converter__rate {display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin:20px 0 26px;font-size:14px;color:#34445b;}
.currency-converter__rate-icon {color:var(--accent-green);font-size:20px;}
.currency-converter__rate-note {color:var(--text-muted);font-size:12px;margin-left:auto;}
.currency-converter__footer {display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid #e7ebf1;margin-top:28px;padding-top:12px;}
.currency-converter__date {display:block;color:#586779;font-size:12px;line-height:20px;}
.currency-converter__disclaimer {display:block;color:var(--text-muted);font-size:11px;line-height:18px;margin-top:4px;}
.currency-converter__refresh {display:flex;gap:8px;align-items:center;min-height:64px;flex-shrink:0;background:transparent;border:0;color:#586779;font-size:12px;padding:0 8px;}
.currency-converter__refresh span {font-size:22px;}
.currency-converter__warning,.currency-converter__error {padding:14px 16px;border:1px solid #ecd8b0;border-radius:10px;background:#fff8e9;color:#845c1a;font-size:14px;line-height:22px;margin:22px 0 0;}
.currency-converter__error {border-color:#efc7ce;color:#a33447;background:#fff2f4;}
@media(max-width:1000px){.currency-converter{padding:28px 28px 12px}.currency-converter__currency-name{display:none}.currency-converter__grid{gap:12px}.currency-converter__input-group{padding-left:14px;padding-right:14px}}
@media(max-width:700px){.currency-converter__grid{grid-template-columns:minmax(0,1fr);gap:14px}.currency-converter__switch{margin:0 auto;transform:rotate(90deg)}.currency-converter__switch:hover{transform:rotate(98deg)}.currency-converter__currency-name{display:inline}.currency-converter__header{flex-wrap:wrap;gap:14px}.currency-converter__eyebrow{font-size:9px}.currency-converter__rate-note{display:none}.currency-converter{padding:24px 20px 12px}.currency-converter__footer{align-items:flex-start}}
</style>
