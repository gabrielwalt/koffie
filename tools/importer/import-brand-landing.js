/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsParser from './parsers/columns.js';
import tabsParser from './parsers/tabs.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'columns': columnsParser,
  'tabs': tabsParser,
  'cards': cardsParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
];

const sectionTransformers = [
  sectionsTransformer,
];

/**
 * Helper to create a block table, using WebImporter when available.
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

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'brand-landing',
  description: 'Brand experience marketing page with multiple styled sections, alternating text and image layouts, tabbed product carousel, and CTA cards',
  urls: [
    'https://www.koffievoordeel.nl/gran-maestro-italiano-experience',
  ],
  blocks: [
    {
      name: 'hero',
      instances: ['.header-banner-illy'],
    },
    {
      name: 'columns',
      instances: ['.pagebuilder-column-group'],
    },
    {
      name: 'tabs',
      instances: ['.tab-align-left'],
    },
    {
      name: 'cards',
      instances: ['.slick-slider'],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero Banner',
      selector: '.header-banner-illy',
      style: 'brand-hero',
      blocks: ['hero-italia', 'hero'],
      defaultContent: [],
    },
    {
      id: 'section-3',
      name: 'Italian Quality',
      selector: '.content-gmi-1',
      headingMatch: 'Italiaanse kwaliteit',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-4',
      name: 'Exclusive at Koffievoordeel',
      selector: '.column.main .pagebuilder-column-group:nth-of-type(2)',
      headingMatch: 'Exclusief',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-5',
      name: 'Over smaak gesproken',
      selector: '.column.main > div:nth-of-type(5)',
      headingMatch: 'Over smaak gesproken',
      style: 'dark',
      blocks: ['columns'],
      defaultContent: ['h2'],
    },
    {
      id: 'section-6',
      name: 'Product Assortment Tabs',
      selector: '.tab-align-left',
      headingMatch: 'Ontdek het assortiment',
      style: null,
      blocks: ['tabs'],
      defaultContent: ['h2'],
    },
    {
      id: 'section-7',
      name: 'Coffee Finder CTA',
      selector: '.column.main > div:nth-of-type(7)',
      style: 'dark',
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-8',
      name: 'Sustainability',
      selector: '.column.main > div:nth-of-type(8)',
      headingMatch: 'Duurzaamheid',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-9',
      name: 'Discover GMI World',
      selector: '.slick-slider',
      headingMatch: 'Ontdek de wereld',
      style: null,
      blocks: ['cards'],
      defaultContent: ['h2', 'picture'],
    },
  ],
};

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
  if (hookName === 'afterTransform') {
    sectionTransformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
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
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

/**
 * Custom handling for the gran-maestro-italiano-experience dual heroes.
 *
 * Original page has two .header-banner-illy elements:
 *   1. First: GMI logo image over dark textured background → hero-italia (with flag ribbon via CSS)
 *   2. Second: Tuscan landscape background-image with "Premium koffie, verrassende prijs!" → hero
 *
 * The second hero's image is a CSS background (not an <img>), so we build both block tables
 * manually and remove them from the generic parsing loop.
 */
function handleDualHeroes(document, pageBlocks, bgImageMap) {
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
  // Empty text row (logo-only hero has no heading)
  const emptyText = document.createDocumentFragment();
  emptyText.appendChild(document.createComment(' field:text '));
  firstCells.push([emptyText]);
  const heroItaliaTable = createBlockTable(document, 'hero-italia', firstCells);
  firstEl.replaceWith(heroItaliaTable);

  // --- Second hero → hero (with background image + styled heading) ---
  const secondEl = heroBlocks[1].element;
  const bgUrl = bgImageMap.get(secondEl);
  const secondCells = [];

  // Row 1: Background image (extracted from CSS before cleanup removed <style> tags)
  if (bgUrl) {
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    const img = document.createElement('img');
    img.src = bgUrl;
    imgFrag.appendChild(img);
    secondCells.push([imgFrag]);
  }

  // Row 2: Heading text — "Premium koffie," (bold/beige) + line break + "verrassende prijs!" (white)
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
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // PRE-PROCESSING: Capture CSS background-image URLs from hero banners
    // before the cleanup transformer removes <style> tags that define them.
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

    executeTransformers('beforeTransform', main, payload);
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // Custom: handle dual heroes (hero-italia + hero) for this page
    handleDualHeroes(document, pageBlocks, bgImageMap);

    // Generic parsing for remaining blocks (columns, tabs, cards)
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
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

    executeTransformers('afterTransform', main, payload);

    // Post-transform: remove empty wrapper divs that would create empty sections.
    // Also merge orphaned section-metadata (sections with only metadata, no content).
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

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
