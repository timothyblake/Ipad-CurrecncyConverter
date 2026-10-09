<script setup lang="ts">
import { allCurrencies, currencies, convert, formatAmount, type Currency, type Rates } from '../../utils/currencies';
defineProps<{ amount: number | null; source: Currency; rates: Rates }>();
defineEmits<{ select: [currency: Currency] }>();
const rate = (value: number) => value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
</script>
<template>
  <section class="multi-rates" aria-labelledby="summary-title">
    <div class="multi-rates__heading"><h2 id="summary-title" class="multi-rates__title">Multi-currency summary</h2><span class="multi-rates__caption">Base £1 · tap a currency to enter it</span></div>
    <div class="multi-rates__grid">
      <button type="button" v-for="code in allCurrencies" :key="code" class="multi-rates__item" :class="{'multi-rates__item--active': source === code}" :aria-pressed="source === code" :aria-label="`Use ${currencies[code].name} as input currency`" @click="$emit('select', code)">
        <span class="multi-rates__top"><span class="multi-rates__code">{{ code }}<span class="multi-rates__short"> · {{ currencies[code].name }}</span></span><span v-if="source === code" class="multi-rates__badge">Entered</span></span>
        <span class="multi-rates__value">{{ amount === null ? '—' : currencies[code].symbol + formatAmount(convert(amount, source, code, rates)) }}</span>
        <span v-if="code === 'GBP'" class="multi-rates__note"><span class="multi-rates__long">British Pound · base</span><span class="multi-rates__short">Base currency</span></span>
        <span v-else class="multi-rates__note"><span class="multi-rates__long">{{ currencies[code].name }} · </span>£1 = {{ currencies[code].symbol }}{{ rate(rates[code]) }}</span>
      </button>
    </div>
    <slot />
  </section>
</template>
<style scoped>
.multi-rates {display:flex;flex-direction:column;gap:14px;padding:22px;background:var(--bg-input);border:2px solid var(--border-card);border-radius:16px;}
.multi-rates__heading {display:flex;justify-content:space-between;align-items:baseline;gap:16px;}
.multi-rates__title {margin:0;font-size:18px;font-weight:700;color:var(--text-strong);}
.multi-rates__caption {font-size:14px;color:var(--text-muted);}
.multi-rates__grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
.multi-rates__item {display:flex;flex-direction:column;gap:6px;min-width:0;min-height:64px;padding:16px 18px;text-align:left;color:var(--text-primary);background:var(--bg-card);border:2px solid var(--border-card);border-radius:var(--radius-chip);transition:background .15s,border-color .15s;}
.multi-rates__item:hover {border-color:var(--border-focus);}
.multi-rates__item--active,.multi-rates__item--active:hover {background:var(--bg-output);border-color:var(--accent-green-strong);}
.multi-rates__top {display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:22px;}
.multi-rates__code {font-size:15px;font-weight:700;letter-spacing:.6px;color:var(--text-muted);}
.multi-rates__item--active .multi-rates__code {color:var(--accent-green);}
.multi-rates__badge {flex:none;padding:2px 8px;font-size:12px;font-weight:700;color:#022c22;background:var(--accent-green-strong);border-radius:999px;}
.multi-rates__value {font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:28px;line-height:36px;font-weight:700;overflow-wrap:anywhere;}
.multi-rates__note {font-size:14px;color:var(--text-muted);}
.multi-rates__long {display:none;}
/* iPad landscape: four cards in one row, names move into the note. */
@media(min-width:1000px){
  .multi-rates {padding:20px 22px 22px;}
  .multi-rates__grid {grid-template-columns:repeat(4,minmax(0,1fr));}
  .multi-rates__item {gap:4px;padding:14px 16px;}
  .multi-rates__code {font-size:14px;}
  .multi-rates__value {font-size:24px;line-height:32px;}
  .multi-rates__note {font-size:13px;}
  .multi-rates__short {display:none;}
  .multi-rates__long {display:inline;}
}
@media(max-width:600px){
  .multi-rates {padding:16px;}
  .multi-rates__grid {grid-template-columns:minmax(0,1fr);gap:10px;}
  .multi-rates__caption {display:none;}
  .multi-rates__value {font-size:24px;line-height:32px;}
}
</style>
