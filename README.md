# API price history

A portable dashboard for exploring Anthropic and OpenAI API token prices in USD and AUD, with historical charts and monthly budget scenarios.

## Use the dashboard

Download or clone this repository and open **`api-price-charts.html`** in a browser. The page is self-contained: no installation, API key, server or network connection is needed to run it. Source links open external documentation when clicked.

```sh
git clone https://github.com/srepho/api-price-history.git
cd api-price-history
```

Enter monthly uncached input, cache-read and output volumes in millions of tokens. Compare selected model families, switch currency, set a spending cap, or allocate volumes across models with configurable planning headroom.

## Scope and evidence

- Pricing snapshot: **13 November 2026**. Stored FX observations end **11 November 2026**. This is not a live price feed.
- Current headline rates have official vendor sources. Historical records carry individual evidence notes; **provisional entries have not been fully verified**. Current pricing pages alone do not establish historical rates or effective dates.
- The comparison holds token counts fixed. It does not establish equal completed work, model quality or productivity. Best / Standard / Cheap are editorial family groupings.
- Calculations cover standard input, cache reads and output. Cache-write tokens and charges, long-context premiums, fast processing, tools, subscriptions, taxes and payment FX fees are excluded. Batch and negotiated discounts are excluded too.
- Default volumes, allocations and headroom are illustrative, not measured team usage. Shares apply equally to each token category. Headroom does not calculate excluded charges.
- AUD conversions use stored Frankfurter / ECB reference rates, carrying the latest observation through missing days. They are not bank conversion quotes.

The dashboard includes links to [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), dated releases and price sheets. Full row-level evidence is in `api-price-charts.sources.json`.

## Build and check

Use a modern Node.js release (Node 22 or later). No npm packages are required.

```sh
node build-price-charts.cjs
node test-price-charts.cjs
```

The build embeds FX and source metadata into the HTML and checks that every price observation has an evidence record. Tests cover currency conversion, cap round trips, mixed allocations, headroom, 48 chart configurations including zero usage, small values, URL fragment validation and generated-file parity. The tests use a small DOM fixture; they are not browser layout tests.

Desktop Chrome rendering and selected controls were checked manually. Mobile wrapping, touch interaction and light-mode appearance remain unverified.

## Files

| File | Purpose |
| --- | --- |
| `api-price-charts.html` | Ready-to-open dashboard |
| `api-price-charts.template.html` | Page, chart logic and price observations |
| `api-price-charts.fx.json` | Stored USD/AUD reference rates |
| `api-price-charts.sources.json` | Evidence statuses, notes and source links |
| `build-price-charts.cjs` | Reproducible HTML build |
| `test-price-charts.cjs` | Calculation and generated-markup regressions |

To refresh the snapshot, update prices, dates, evidence and FX together, rebuild, and rerun checks. Preserve the distinction between sourced observations and assumptions about the intervals between them.
