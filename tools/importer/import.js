/* eslint-disable */
/* global WebImporter */

/**
 * Universal importer for koffievoordeel.nl
 *
 * Single entry point for all page templates. Template detection matches URLs
 * to configurations from page-templates.json. Page-specific hooks handle
 * edge cases (e.g. brand-landing dual heroes). All shared logic (cleanup,
 * section breaks, empty-section removal) runs for every page.
 */

// ─── PARSER IMPORTS ─────────────────────────────────────────────────
import heroParser from './parsers/hero.js';
import heroSubscriptionParser from './parsers/hero-subscription.js';
import columnsParser from './parsers/columns.js';
import cardsParser from './parsers/cards.js';
import cardsStepsParser from './parsers/cards-steps.js';
import cardsCategoryParser from './parsers/cards-category.js';
import cardsCategoryBrandsParser from './parsers/cards-category-brands.js';
import cardsProductParser from './parsers/cards-product.js';
import bannerParser from './parsers/banner.js';
import tabsParser from './parsers/tabs.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import embedParser from './parsers/embed.js';

// ─── TRANSFORMER IMPORTS ────────────────────────────────────────────
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// ─── TEMPLATE CONFIGURATION ────────────────────────────────────────
import TEMPLATES_JSON from './page-templates.json';
const TEMPLATES = TEMPLATES_JSON.templates;

// ─── PARSER REGISTRY ────────────────────────────────────────────────
// Maps block names to their parser functions. A single block name always
// maps to the same parser, regardless of which template uses it.
const PARSER_REGISTRY = {
  'hero': heroParser,
  'hero-subscription': heroSubscriptionParser,
  'columns': columnsParser,
  'cards': cardsParser,
  'cards-steps': cardsStepsParser,
  'cards-category': cardsCategoryParser,
  'cards-category-brands': cardsCategoryBrandsParser,
  'cards-product': cardsProductParser,
  'banner': bannerParser,
  'tabs': tabsParser,
  'accordion-faq': accordionFaqParser,
  'embed': embedParser,
};

// ─── TRANSFORMER REGISTRY ───────────────────────────────────────────
const transformers = [cleanupTransformer];
const sectionTransformers = [sectionsTransformer];

// ─── TEMPLATE DETECTION ─────────────────────────────────────────────

/**
 * Match a URL to a template configuration.
 * Compares pathnames (ignoring trailing slashes and .html extensions).
 */
function findTemplate(url) {
  const path = normalizePath(url);
  return TEMPLATES.find((t) => t.urls.some((u) => {
    const tPath = normalizePath(u);
    return path === tPath;
  }));
}

function normalizePath(url) {
  try {
    return new URL(url).pathname.replace(/\/$/, '').replace(/\.html$/, '');
  } catch {
    return url.replace(/\/$/, '').replace(/\.html$/, '');
  }
}

// ─── SHARED PIPELINE FUNCTIONS ──────────────────────────────────────

function executeTransformers(hookName, element, payload) {
  transformers.forEach((fn) => {
    try {
      fn.call(null, hookName, element, payload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
  if (hookName === 'afterTransform') {
    sectionTransformers.forEach((fn) => {
      try {
        fn.call(null, hookName, element, payload);
      } catch (e) {
        console.error(`Section transformer failed:`, e);
      }
    });
  }
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Create a block table, using WebImporter when available, with manual fallback.
 */
function createBlockTable(doc, name, cells) {
  if (typeof WebImporter !== 'undefined' && WebImporter.Blocks) {
    return WebImporter.Blocks.createBlock(doc, { name, cells });
  }
  const table = doc.createElement('table');
  const headerRow = doc.createElement('tr');
  const headerCell = doc.createElement('th');
  headerCell.colSpan = 100;
  headerCell.textContent = name;
  headerRow.appendChild(headerCell);
  table.appendChild(headerRow);
  cells.forEach((row) => {
    const tr = doc.createElement('tr');
    const rowArr = Array.isArray(row) ? row : [row];
    rowArr.forEach((cell) => {
      const td = doc.createElement('td');
      if (cell instanceof Node) {
        td.appendChild(cell);
      } else if (typeof cell === 'string') {
        td.textContent = cell;
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  return table;
}

// ─── PAGE-SPECIFIC HOOKS ────────────────────────────────────────────
// Keyed by template name. Each hook object can define:
//   preTransform(main, document, payload)  — runs before any transformers
//   beforeParsing(document, pageBlocks, payload) — runs after findBlocksOnPage, before parsing
// Returns modified pageBlocks if beforeParsing changes them.

const PAGE_HOOKS = {
  'blog-article': {
    /**
     * Extract blog metadata (category, author, date) from the page and
     * wrap them together with the H1 into a Blog Header block table.
     *
     * DOM structure on koffievoordeel blogs:
     *   <main>
     *     <div class="page-title-wrapper"><h1>...</h1></div>
     *     <div class="amblog-element-block">
     *       <div class="amblog-post-container">
     *         <div class="amblog-features -post">
     *           .amblog-category > a.amblog-ref  → "Koffieweetjes"
     *           .amblog-item.-author > a          → "Beanie"
     *           .amblog-date                      → "01-09-2025"
     */
    beforeParsing(document, pageBlocks) {
      const h1 = document.querySelector('.page-title-wrapper h1')
        || document.querySelector('h1');
      if (!h1) return;

      // Extract metadata from the Amasty blog widget
      const metaBlock = document.querySelector('.amblog-element-block');
      const categoryText = metaBlock
        ? (metaBlock.querySelector('.amblog-category a') || {}).textContent || ''
        : '';
      const authorText = metaBlock
        ? (metaBlock.querySelector('.amblog-item.-author a, a[rel="author"]') || {}).textContent || ''
        : '';
      const dateText = metaBlock
        ? (metaBlock.querySelector('.amblog-date') || {}).textContent || ''
        : '';

      // Build single-cell content: h1, category, author, date as paragraphs
      const cellFrag = document.createDocumentFragment();
      const titleEl = document.createElement('h1');
      titleEl.textContent = h1.textContent.trim();
      cellFrag.appendChild(titleEl);

      if (categoryText.trim()) {
        const p = document.createElement('p');
        p.textContent = categoryText.trim();
        cellFrag.appendChild(p);
      }
      if (authorText.trim()) {
        const p = document.createElement('p');
        p.textContent = authorText.trim();
        cellFrag.appendChild(p);
      }
      if (dateText.trim()) {
        const p = document.createElement('p');
        p.textContent = dateText.trim();
        cellFrag.appendChild(p);
      }

      const blogHeaderTable = createBlockTable(document, 'Blog Header', [[cellFrag]]);

      // Insert before the amblog-element-block (which wraps both metadata and article).
      // We must NOT insert inside it since we remove the metadata parts below.
      if (metaBlock) {
        metaBlock.before(blogHeaderTable);
      } else {
        h1.before(blogHeaderTable);
      }

      // Remove the original h1 wrapper
      const titleWrapper = h1.closest('.page-title-wrapper');
      if (titleWrapper) titleWrapper.remove(); else h1.remove();

      // Remove only the metadata features, keep .amblog-content (article body)
      if (metaBlock) {
        const features = metaBlock.querySelector('.amblog-features');
        if (features) features.remove();
      }
    },
  },

  'brand-landing': {
    /**
     * Capture CSS background-image URLs from hero banners before cleanup
     * removes <style> tags that define them.
     */
    preTransform(main, document, payload) {
      const bgImageMap = new Map();
      main.querySelectorAll('.header-banner-illy').forEach((el) => {
        try {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') {
            const m = bg.match(/url\(["']?(.+?)["']?\)/);
            if (m) bgImageMap.set(el, m[1]);
          }
        } catch (e) { /* ignore */ }
      });
      payload._bgImageMap = bgImageMap;
    },

    /**
     * Handle dual heroes for the GMI experience page.
     * First hero → hero-italia (logo over dark bg with flag ribbon).
     * Second hero → hero (landscape bg-image with styled heading).
     */
    beforeParsing(document, pageBlocks, payload) {
      const bgImageMap = payload._bgImageMap || new Map();
      const heroBlocks = pageBlocks.filter((b) => b.name === 'hero');
      if (heroBlocks.length < 2) return;

      // --- First hero → hero-italia ---
      const firstEl = heroBlocks[0].element;
      const firstImg = firstEl.querySelector('picture img, figure img, .image-wrapper img, img');
      const firstCells = [];
      if (firstImg) {
        const imgFrag = document.createDocumentFragment();
        imgFrag.appendChild(document.createComment(' field:image '));
        imgFrag.appendChild(firstImg.cloneNode(true));
        firstCells.push([imgFrag]);
      }
      const emptyText = document.createDocumentFragment();
      emptyText.appendChild(document.createComment(' field:text '));
      firstCells.push([emptyText]);
      const heroItaliaTable = createBlockTable(document, 'hero-italia', firstCells);
      firstEl.replaceWith(heroItaliaTable);

      // --- Second hero → hero (with background image + styled heading) ---
      const secondEl = heroBlocks[1].element;
      const bgUrl = bgImageMap.get(secondEl);
      const secondCells = [];
      if (bgUrl) {
        const imgFrag = document.createDocumentFragment();
        imgFrag.appendChild(document.createComment(' field:image '));
        const img = document.createElement('img');
        img.src = bgUrl;
        imgFrag.appendChild(img);
        secondCells.push([imgFrag]);
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(' field:text '));
      const h2 = document.createElement('h2');
      const strong = document.createElement('strong');
      strong.textContent = 'Premium koffie,';
      h2.appendChild(strong);
      h2.appendChild(document.createElement('br'));
      h2.appendChild(document.createTextNode('verrassende prijs!'));
      textFrag.appendChild(h2);
      secondCells.push([textFrag]);
      const heroTable = createBlockTable(document, 'hero', secondCells);
      secondEl.replaceWith(heroTable);

      // Remove both hero entries from pageBlocks so the generic loop skips them
      for (let i = pageBlocks.length - 1; i >= 0; i--) {
        if (pageBlocks[i] === heroBlocks[0] || pageBlocks[i] === heroBlocks[1]) {
          pageBlocks.splice(i, 1);
        }
      }
    },
  },
};

// ─── POST-TRANSFORM CLEANUP ────────────────────────────────────────
// Runs for ALL templates after transformers + section breaks are applied.

function postTransformCleanup(main) {
  const mainCol = main.querySelector('.column.main') || main;
  [...mainCol.children].forEach((child) => {
    if (child.tagName !== 'DIV') return;
    // Remove completely empty divs
    if (!child.innerHTML.trim()) {
      child.remove();
      return;
    }
    // Merge divs that contain only section-metadata table(s) and no real content
    const kids = [...child.children];
    const onlyMeta = kids.length > 0 && kids.every((c) => {
      if (c.tagName === 'TABLE') {
        const th = c.querySelector('tr:first-child th, tr:first-child td');
        return th && th.textContent.trim().toLowerCase().replace(/-/g, ' ') === 'section metadata';
      }
      return false;
    });
    if (onlyMeta) {
      const prev = child.previousElementSibling;
      if (prev) {
        kids.forEach((k) => prev.appendChild(k));
        child.remove();
      }
    }
  });
}

// ─── MAIN TRANSFORM ─────────────────────────────────────────────────

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // Detect template from URL
    const template = findTemplate(params.originalURL || url);
    if (!template) {
      console.warn(`No template found for URL: ${params.originalURL || url}`);
      console.warn('Running generic cleanup only (no block parsing).');
    }
    const templateConfig = template || { name: 'unknown', blocks: [], sections: [] };
    const enhancedPayload = { ...payload, template: templateConfig };

    // Page-specific pre-transform hooks
    const hooks = template ? PAGE_HOOKS[template.name] : null;
    if (hooks && hooks.preTransform) {
      hooks.preTransform(main, document, enhancedPayload);
    }

    // 1. Execute beforeTransform transformers
    executeTransformers('beforeTransform', main, enhancedPayload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, templateConfig);

    // 3. Page-specific before-parsing hooks (e.g. dual heroes)
    if (hooks && hooks.beforeParsing) {
      hooks.beforeParsing(document, pageBlocks, enhancedPayload);
    }

    // 4. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = PARSER_REGISTRY[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 5. Execute afterTransform transformers (cleanup + section breaks)
    executeTransformers('afterTransform', main, enhancedPayload);

    // 6. Post-transform cleanup (runs for ALL templates)
    postTransformCleanup(main);

    // 7. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 8. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: templateConfig.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
