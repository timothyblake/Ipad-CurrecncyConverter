# Currency Converter

An iPad-first Astro + Vue 3 travel utility for JMD, GBP, USD and EUR. Component-scoped BEM CSS, self-hosted Inter for text and JetBrains Mono for amounts, and no CSS framework. The layout follows the iPad design: three columns (source · switch · target) in landscape, stacked rows with a divider switch in portrait, and a single column on phones.

## Run locally

```sh
npm install
npm run dev
```

Production build and offline preview:

```sh
npm test
npm run build
npm run preview
```

The build creates `dist/`, including a content-versioned service worker. Offline reload works after the first successful online production visit has cached the shell. An entirely new device cannot load a website it has never downloaded; once loaded, the calculator can use embedded example rates even without rate-service access. Service workers require HTTPS or localhost. Development mode does not register one.

## Rates and input

The [ExchangeRate-API open endpoint](https://www.exchangerate-api.com/docs/free) supplies GBP-based JMD, USD and EUR rates without a key. It updates daily. The app caches validated rates for 12 hours under `currency_rates_cache`; refresh retries manually, on reconnection, and on returning to the app. If fetching fails, saved rates remain usable with a dated banner. Without saved data, the specification's example rates are visibly labelled estimates. These fallback values have no claimed market date.

The input currency is saved in tab-scoped `sessionStorage` under `currency_input_currency` and restored on reload. The entered text is also saved as `currency_input_amount`, including zero and an empty field. `currency_foreign_currency` preserves the target when converting from GBP. Invalid stored values fall back to JMD, and blocked storage does not prevent conversion.

All calculations normalize through GBP and display two decimal places. Switching direction retains the entered numeric amount, as in the specification. Inputs accept en-GB thousands separators and up to two decimal places, capped at 999,999,999.99; invalid inputs show an error instead of silently changing the amount. No amounts are transmitted to the rate provider.

The native select preserves iPad's accessible picker and keyboard behavior. Touch controls are at least 64px tall. Browser zoom stays available for accessibility; autofocus is intentionally avoided on page load so the software keyboard does not hide the initial result. Fonts are bundled locally by Vite from Fontsource packages with their licenses.

## Cloudflare Pages

Use the [Cloudflare Astro deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/): connect this repository, set build command to `npm run build`, and output directory to `dist`. Choose a supported current Node LTS version meeting Astro's package engine requirement. Repository connection and production hosting require a Cloudflare account and selected project; this repository does not assume either.

`public/_headers`, `robots.txt`, and document meta tags implement the requested no-index directives. These are crawler instructions, **not access control**: a public URL can still be visited or scraped. For actual privacy, configure Cloudflare Access before sharing a deployment.

## Verification

`npm test` covers arithmetic, malformed input, cache validation, API failure, offline rates and blocked storage. `npm run build` includes Astro/Vue type checking. The automated browser suite (`QA_URL=http://localhost:4321 node scripts/browser-qa.mjs`, after starting a production preview; install Chromium with `npx playwright install chromium`) covers source/target selection, switch, amount editing, long amounts, offline mode, reconnection and refresh failure at 810×1080, 834×1194, 1080×810, 1194×834 and 390×844. Set `QA_URL` to the actual local preview URL. Playwright's offline emulation also blocks service-worker cache responses on reload, so check offline reload by stopping the preview server after a first visit and reloading. Physical iPad Safari keyboard and Home Screen behavior should also be checked on a device.
