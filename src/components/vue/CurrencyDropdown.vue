<script setup lang="ts">
import { currencies, foreignCurrencies, type ForeignCurrency } from '../../utils/currencies';
defineProps<{ modelValue: ForeignCurrency; label: string }>();
defineEmits<{ 'update:modelValue': [value: ForeignCurrency] }>();
</script>
<template>
  <div class="currency-dropdown">
    <span class="currency-dropdown__flag" aria-hidden="true">{{ currencies[modelValue].flag }}</span>
    <select class="currency-dropdown__select" :value="modelValue" :aria-label="label" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as ForeignCurrency)">
      <option v-for="code in foreignCurrencies" :key="code" :value="code">{{ code }} · {{ currencies[code].name }}</option>
    </select>
    <span class="currency-dropdown__display" aria-hidden="true">{{ modelValue }}<span class="currency-dropdown__name"> · {{ currencies[modelValue].name }}</span></span>
    <span class="currency-dropdown__chevron" aria-hidden="true">⌄</span>
  </div>
</template>
<style scoped>
.currency-dropdown {display:flex;align-items:center;position:relative;min-width:0;}
.currency-dropdown__flag {position:absolute;left:0;pointer-events:none;font-size:28px;}
.currency-dropdown__select {appearance:none;min-width:0;width:100%;height:64px;padding:0 25px 0 44px;opacity:0;border:0;background:transparent;color:var(--text-primary);font-size:19px;font-weight:600;cursor:pointer;}
.currency-dropdown__select option {background:var(--bg-card);}
.currency-dropdown__display {position:absolute;left:44px;right:25px;pointer-events:none;font-size:22px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.currency-dropdown__name {font-size:16px;font-weight:400;}
@media(min-width:701px) and (max-width:1000px){.currency-dropdown__name{display:none}}
.currency-dropdown__chevron {position:absolute;right:0;pointer-events:none;color:var(--text-muted);font-size:24px;}
@media(max-width:450px){.currency-dropdown__name{display:none}}
</style>
