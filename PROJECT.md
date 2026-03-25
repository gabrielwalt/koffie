# Project reference — **kv** (Koffievoordeel → EDS Crosswalk)

Living inventory: environments, source pages, blocks, tokens, import tooling, and migration status.

## Environments

| Role | URL |
|------|-----|
| **GitHub** | [https://github.com/gabrielwalt/kv](https://github.com/gabrielwalt/kv) |
| **AEM Author** (content) | [https://author-p189820-e1977856.adobeaemcloud.com/content/kv/index.html](https://author-p189820-e1977856.adobeaemcloud.com/content/kv/index.html) |
| **EDS preview** | [https://main--kv--gabrielwalt.aem.page/](https://main--kv--gabrielwalt.aem.page/) |
| **EDS live** | `https://main--kv--gabrielwalt.aem.live/` |

Local preview: `aem up` → typically `http://localhost:3000` (see [AGENTS.md](./AGENTS.md)).

### `fstab.yaml` alignment

Mountpoints must use your org’s **Franklin delivery** URL (Code Sync), not the browser `/content/...` path. If preview or sync fails, confirm `mountpoints./.url` matches `https://<author-host>/bin/franklin.delivery/gabrielwalt/kv/<branch>` (or your team’s equivalent). The checked-in file may still reflect boilerplate; update it when wiring this repo to the Author instance above.

| Field | Value |
|--------|--------|
| **Source site** | [https://www.koffievoordeel.nl/](https://www.koffievoordeel.nl/) |
| **Import scope** | Six pages listed under [Migration status](#migration-status) |
| **Content path prefix** | As modeled under `/content/kv/` in AEM (confirm with your implementation) |
| **Local import output** | Optional `/content/` or `.plain.html` scratch — usually **not** Git-tracked if AEM is system of record |

---

## Source site — koffievoordeel.nl

- **Platform**: Magento 2 (Adobe Commerce) with PageBuilder
- **Main content regions**: `.column.main` — primary content column; PageBuilder `div` rows inside
- **Sections**: Visual bands map to direct children of `.column.main`; some use `#id` anchors (`#uitleg`), others identified by heading text
- **Images / CDN**: Product images at `koffievoordeel.nl/media/catalog/product/`; PageBuilder uploads at `koffievoordeel.nl/media/`
- **Special cases**: RequireJS globals interfere with UMD imports; cookie consent auto-dismissed; `.desktop`/`.mobile` visibility wrappers for responsive content; Magento placeholder images for missing products

### CDN / assets

| Source | Domain / pattern | Notes |
|--------|------------------|--------|
| Product images | `koffievoordeel.nl/media/catalog/product/` | Real product photos with `?quality=95&fit=bounds` params |
| Placeholder | `Magento_Catalog/images/product/placeholder/small_image.jpg` | Missing product images — skip in parsers |
| PageBuilder | `koffievoordeel.nl/media/` | CMS-uploaded assets (banners, icons) |

---

## Brand and design tokens

Boilerplate defaults live in `styles/styles.css` until replaced with Koffievoordeel brand values.

| Property | Current value | Notes |
|----------|-----------------|--------|
| Background | `white` (`--background-color`) | |
| Text | `#131313` | |
| Accent / links | `#3b63fb` | |
| Muted surfaces | `#f8f8f8` (`--light-color`) | Used by section styles below |
| Body font | Roboto (+ fallback) | `@font-face` fallbacks in `styles/styles.css` |
| Heading font | Roboto Condensed (+ fallback) | |

### Section styles

| Style (UE) | Class on section | CSS | Used on |
|--------------|------------------|-----|---------|
| Highlight | `highlight` → `.section.highlight` | `styles/styles.css` — light background | General |
| Beige | `beige` → `.section.beige` | `styles/styles.css` — `background-color: #f5f0eb` | Abonnement section 5 |

The section model’s multiselect (`models/_section.json`) exposes **Highlight** and **Beige**.

---

## Block reference

Blocks registered in the main section filter (`models/_section.json` → `section` filter): `text`, `image`, `button`, `title`, `hero`, `cards`, `cards-category`, `cards-product`, `cards-steps`, `columns`, `fragment`, `hero-subscription`, `accordion-faq`, `banner`, `tabs`.

Default content types come from `models/` spreads.

### Boilerplate blocks

| Block | Location | Notes |
|-------|----------|-------|
| `hero` | `blocks/hero/` | Standard EDS hero (`_hero.json`, `hero.js`, `hero.css`) |
| `cards` | `blocks/cards/` | Standard EDS cards |
| `columns` | `blocks/columns/` | Standard EDS columns |
| `fragment` | `blocks/fragment/` | Standard EDS fragment |
| `header` / `footer` | `blocks/header/`, `blocks/footer/` | Chrome blocks (not in section filter) |

### Custom blocks (created for migration)

| Block | Variants | Purpose | Import selector |
|-------|----------|---------|-----------------|
| `hero-subscription` | — | Subscription hero with bg image + feature cards | `.column.main .pagebuilder-column.shadow-cards` |
| `cards-steps` | — | Horizontal step cards ("Hoe werkt het") | `.kv-steps-slider` |
| `cards-category` | Default, **Brands** | Category icons / brand logos grid | `.coffeType-mobile-icon` / `.desktop [class*="brand-abo"]` |
| `cards-product` | — | Product card (image, name, intensity, price, CTA) | _(used as richtext inside tabs)_ |
| `banner` | — | Art-directed responsive banner (desktop + mobile `<picture>`) | `img[src*="1440x450_desk"]` |
| `tabs` | — | ARIA tab navigation (container with label + richtext panels) | `.tab-align-left` |
| `accordion-faq` | — | FAQ accordion (`<details>/<summary>`) | `[data-collapsible="true"]` |
| `hero-quote` | — | Hero with quote styling | _(not used on abonnement)_ |

### Default content (`models/`)

`_text.json`, `_title.json`, `_image.json`, `_button.json` — merged into component definition/models/filters via `npm run build:json`.

---

## Import infrastructure

**Status**: Active — abonnement-page template complete and importing successfully.

### Templates

| Template | Import script | URL list | Status |
|----------|--------------|----------|--------|
| `abonnement-page` | `import-abonnement-page.js` | `urls-abonnement-page.txt` | Working |

### Parsers

| Parser | File | Block | Source selector |
|--------|------|-------|-----------------|
| hero-subscription | `parsers/hero-subscription.js` | hero-subscription | `.pagebuilder-column.shadow-cards` |
| cards-steps | `parsers/cards-steps.js` | cards-steps | `.kv-steps-slider` |
| cards-category | `parsers/cards-category.js` | cards-category | `.coffeType-mobile-icon` |
| cards-category-brands | `parsers/cards-category-brands.js` | cards-category (brands) | `.desktop [class*="brand-abo"]` |
| banner | `parsers/banner.js` | banner | `img[src*="1440x450_desk"]` |
| tabs | `parsers/tabs.js` | tabs | `.tab-align-left` |
| cards-product | `parsers/cards-product.js` | cards-product | _(available, not in abonnement template)_ |
| accordion-faq | `parsers/accordion-faq.js` | accordion-faq | `[data-collapsible="true"]` |

### Transformers

| Transformer | File | Hook | Purpose |
|-------------|------|------|---------|
| koffievoordeel-cleanup | `transformers/koffievoordeel-cleanup.js` | `beforeTransform` | Remove tracking, scripts, empty elements, post-FAQ junk |
| koffievoordeel-sections | `transformers/koffievoordeel-sections.js` | `afterTransform` | Insert `<hr>` section breaks + section-metadata via multi-strategy anchor finding |

### Bundling

**Always use `aem-import-bundle.sh`** (not raw esbuild with `--format=esm`):
```bash
bash $SCRIPTS_DIR/aem-import-bundle.sh --importjs tools/importer/import-abonnement-page.js
```
This creates IIFE format (`var CustomImportScript = ...`) required by `run-bulk-import.js`.

---

## Migration status

### Pages (initial scope)

| Page | Source URL | Template | Status |
|------|------------|----------|--------|
| Abonnement | [/abonnement](https://www.koffievoordeel.nl/abonnement) | `abonnement-page` | **Imported** — 22 blocks, 7 sections |
| Illy Iperespresso recepten | [/drie-heerlijke-illy-iperespresso-recepten](https://www.koffievoordeel.nl/drie-heerlijke-illy-iperespresso-recepten) | — | Not started |
| Abonnement wijzigen | [/abonnement-wijzigen](https://www.koffievoordeel.nl/abonnement-wijzigen) | — | Not started |
| Terug in de tijd met Illy | [/terug-in-de-tijd-met-illy](https://www.koffievoordeel.nl/terug-in-de-tijd-met-illy) | — | Not started |
| Gran Maestro Italiano | [/gran-maestro-italiano-experience](https://www.koffievoordeel.nl/gran-maestro-italiano-experience) | — | Not started |
| Blog — wetenschap koffie | [/blog/de-wetenschap-achter-de-perfecte-kop-koffie](https://www.koffievoordeel.nl/blog/de-wetenschap-achter-de-perfecte-kop-koffie) | — | Not started |

### Abonnement content verification

| Content | Captured | Details |
|---------|----------|---------|
| Hero / above-the-fold | Yes | hero-subscription with bg image + feature cards |
| Body copy & headings | Yes | Section headings, subscription explanation text |
| Images & alt text | Yes | Product images, brand logos, banner (art-directed). Placeholder images skipped. |
| CTAs / links | Yes | "Bekijk en bestel" product CTAs, "Bekijk alle" category links |
| Tabs | Yes | Koffiebonen (4 products) + Koffiecups (4 products) |
| FAQ | Yes | 8 accordion items |
| Section styling | Yes | Beige background on subscription explanation section |

---

## Fonts

| Font | Files / notes |
|------|----------------|
| Roboto | `fonts/` (see `styles/styles.css` `@font-face` and variables) |
| Roboto Condensed | `fonts/` |

---

## CSS custom properties (core)

Defined on `:root` in `styles/styles.css` — extend this table when you add brand tokens.

| Token | Usage |
|-------|--------|
| `--background-color`, `--text-color`, `--link-color`, `--link-hover-color` | Base page |
| `--body-font-family`, `--heading-font-family` | Typography |
| `--body-font-size-*`, `--heading-font-size-*` | Type scale |
| `--nav-height` | Header offset |
