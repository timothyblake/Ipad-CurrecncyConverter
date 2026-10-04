<script setup lang="ts">
import { foreignCurrencies, currencies, convert, formatAmount, type Currency, type Rates } from '../../utils/currencies';
defineProps<{ amount: number | null; source: Currency; rates: Rates }>();
defineEmits<{ select: [currency: Currency] }>();
</script>
<template>
  <section class="multi-rates" aria-labelledby="summary-title">
    <div class="multi-rates__heading"><h2 id="summary-title" class="multi-rates__title">Choose your input currency</h2><span class="multi-rates__caption">TAP A CURRENCY TO SWITCH</span></div>
    <div class="multi-rates__grid">
      <button type="button" v-for="code in foreignCurrencies" :key="code" class="multi-rates__item" :class="{'multi-rates__item--active': source === code}" :aria-pressed="source === code" :aria-label="`Use ${currencies[code].name} as input currency`" @click="$emit('select', code)">
        <span class="multi-rates__top"><span class="multi-rates__flag" aria-hidden="true">{{ currencies[code].flag }}</span><span class="multi-rates__code">{{ code }}</span><span v-if="source === code" class="multi-rates__badge">INPUT</span></span>
        <span class="multi-rates__name">{{ currencies[code].name }}</span>
        <span class="multi-rates__value">{{ amount === null ? '—' : currencies[code].symbol + formatAmount(convert(amount, source, code, rates)) }}</span>
      </button>
    </div>
  </section>
</template>
<style scoped>
.multi-rates {margin-top:32px;}
.multi-rates__heading {display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px;}
.multi-rates__title {font-size:18px;font-weight:700;margin:0;}
.multi-rates__caption {font-size:10px;letter-spacing:1.5px;color:var(--text-muted);}
.multi-rates__grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.multi-rates__item {text-align:left;color:var(--text-primary);min-height:64px;transition:background .15s,border-color .15s;border:2px solid #ffffff;border-radius:14px;background:#ffffff;padding:20px 16px;min-width:0;}
.multi-rates__item:hover {background:#f0f6ff;border-color:#9cbdf0;}
.multi-rates__item--active {border-color:#bed7fc;background:#e8f1ff;}
.multi-rates__top {display:flex;align-items:center;gap:9px;min-height:28px;}
.multi-rates__flag {font-size:23px;}
.multi-rates__code {font-size:18px;font-weight:600;}
.multi-rates__badge {font-size:9px;letter-spacing:1px;color:#2769bb;margin-left:auto;}
.multi-rates__name {display:block;color:var(--text-muted);font-size:12px;margin-top:8px;}
.multi-rates__value {display:block;font-family:'Inter',sans-serif;font-variant-numeric:tabular-nums;font-size:24px;line-height:34px;font-weight:600;letter-spacing:-1px;margin-top:20px;overflow-wrap:anywhere;}
@media(max-width:950px){.multi-rates__grid{grid-template-columns:repeat(3,minmax(0,1fr));}.multi-rates__value{margin-top:12px}}
@media(max-width:600px){.multi-rates__grid{grid-template-columns:minmax(0,1fr);}.multi-rates__caption{display:none}.multi-rates__item{padding:16px 12px}.multi-rates__value{font-size:22px}}
@media(max-width:450px){.multi-rates__value{font-size:18px;letter-spacing:-0.7px}.multi-rates__name{font-size:11px}.multi-rates__top{gap:6px}.multi-rates__code{font-size:16px}}
</style>
