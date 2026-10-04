import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, parseAmount } from '../src/utils/currencies';
import { FALLBACK_RATES, validRates, readCache, loadRates, CACHE_KEY } from '../src/utils/ratesService';

test('converts all currencies through GBP in both directions', () => {
  assert.equal(convert(2045, 'JMD', 'GBP', FALLBACK_RATES), 10);
  assert.equal(convert(10, 'GBP', 'JMD', FALLBACK_RATES), 2045);
  assert.equal(convert(131, 'USD', 'GBP', FALLBACK_RATES), 100);
  assert.equal(convert(118, 'EUR', 'USD', FALLBACK_RATES), 131);
});
test('amount parser rejects ambiguous, negative, excessive and malformed amounts', () => {
  for (const value of ['-1', '1.2.3', 'hello', '1,23', '1e3', 'Infinity', '1.234', '1000000000', '.']) assert.equal(parseAmount(value), null, value);
  for (const [value, expected] of [['', 0], ['0', 0], ['1,000.50', 1000.5], ['.50', 0.5], ['999999999.99', 999999999.99]] as const) assert.equal(parseAmount(value), expected);
});
test('validates complete, positive GBP-based rates and handles corrupt or blocked cache', () => {
  assert.ok(validRates(FALLBACK_RATES));
  for (const value of [{...FALLBACK_RATES, GBP:2}, {...FALLBACK_RATES, JMD:0}, {...FALLBACK_RATES, USD:Infinity}, {...FALLBACK_RATES, EUR:'1.18'}, null]) assert.equal(validRates(value),false);
  assert.equal(readCache({getItem: () => '{bad'}),null);
  assert.equal(readCache({getItem: () => { throw new Error('Blocked'); }}),null);
  assert.equal(readCache({getItem: () => JSON.stringify({rates:FALLBACK_RATES, fetchedAt:Date.now()+100000, updatedAt:Date.now()})}),null);
});
test('rate loading covers cache, offline, failed API and storage failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let online = true;
  let stored: string | null = null;
  let requests = 0;
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get onLine(){return online;}}});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(key:string,value:string)=>{assert.equal(key,CACHE_KEY);stored=value;}}});
  globalThis.fetch = (async () => {requests++;return new Response(JSON.stringify({result:'success',base_code:'GBP',rates:FALLBACK_RATES,time_last_update_unix:Math.floor(Date.now()/1000)}));}) as typeof fetch;
  try {
    assert.equal((await loadRates()).mode,'current');
    assert.equal(requests,1);
    assert.equal((await loadRates()).mode,'current');
    assert.equal(requests,1);
    online = false;
    assert.equal((await loadRates()).mode,'cached');
    assert.equal(requests,1);
    stored = null;
    assert.equal((await loadRates()).mode,'fallback');
    online = true;
    globalThis.fetch = (async () => new Response('{"result":"error"}')) as typeof fetch;
    const failed = await loadRates();
    assert.equal(failed.mode,'fallback');
    assert.equal(failed.failed,true);
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
    assert.equal((await loadRates()).mode,'fallback');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis,'navigator',originalNavigator);
    Reflect.deleteProperty(globalThis,'localStorage');
  }
});
