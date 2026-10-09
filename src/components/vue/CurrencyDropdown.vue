<script setup lang="ts">
import { currencies, foreignCurrencies, type ForeignCurrency } from '../../utils/currencies';
defineProps<{ modelValue: ForeignCurrency; label: string }>();
defineEmits<{ 'update:modelValue': [value: ForeignCurrency] }>();
</script>
<template>
  <div class="currency-dropdown">
    <select class="currency-dropdown__select" :value="modelValue" :aria-label="label" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as ForeignCurrency)">
      <option v-for="code in foreignCurrencies" :key="code" :value="code">{{ currencies[code].symbol }} {{ currencies[code].name }} · {{ code }}</option>
    </select>
    <span class="currency-dropdown__display" aria-hidden="true">{{ currencies[modelValue].symbol }}&nbsp;<span class="currency-dropdown__name">{{ currencies[modelValue].name }} · </span>{{ modelValue }}</span>
    <svg class="currency-dropdown__chevron" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
  </div>
</template>
<style scoped>
.currency-dropdown {position:relative;display:flex;align-items:center;min-width:0;min-height:64px;padding:0 56px 0 20px;background:var(--bg-card);border:2px solid var(--border-control);border-radius:var(--radius-input);color:var(--text-primary);}
.currency-dropdown:focus-within {border-color:var(--border-focus);box-shadow:0 0 0 4px #3b82f640;}
.currency-dropdown__select {position:absolute;inset:0;width:100%;height:100%;min-height:64px;appearance:none;-webkit-appearance:none;opacity:0;border:0;background:transparent;font-size:22px;cursor:pointer;}
.currency-dropdown__select:focus-visible {outline:none;}
.currency-dropdown__display {pointer-events:none;font-size:22px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.currency-dropdown__chevron {position:absolute;right:18px;top:50%;margin-top:-11px;pointer-events:none;color:var(--text-muted);}
/* iPad portrait: compact "J$ JMD" tile beside the amount. */
@media(min-width:601px) and (max-width:999px){.currency-dropdown__name{display:none}}
@media(max-width:440px){.currency-dropdown__name{display:none}}
</style>
