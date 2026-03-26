/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsParser from './parsers/columns.js';
import cardsProductParser from './parsers/cards-product.js';
import tabsParser from './parsers/tabs.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// PARSER REGISTRY
const parsers = {
  'columns': columnsParser,
  'cards-product': cardsProductParser,
  'tabs': tabsParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
];

// Section transformer runs in afterTransform only
const sectionTransformers = [
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'content-article',
  description: 'Editorial content page with H1, alternating text and image sections, and optional product recommendations',
  urls: [
    'https://www.koffievoordeel.nl/drie-heerlijke-illy-iperespresso-recepten',
    'https://www.koffievoordeel.nl/terug-in-de-tijd-met-illy',
  ],
  blocks: [
    {
      name: 'columns',
      instances: ['.pagebuilder-column-group'],
    },
    {
      name: 'cards-product',
      instances: ['ol.product-items'],
    },
    {
      name: 'tabs',
      instances: ['.tab-align-left'],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Title and Intro',
      selector: '.column.main > div:first-of-type',
      style: null,
      blocks: [],
      defaultContent: ['h1', 'p'],
    },
    {
      id: 'section-2',
      name: 'Recipe Column',
      selector: '.column.main .pagebuilder-column-group',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-3',
      name: 'Inline Products',
      selector: 'ol.product-items',
      style: null,
      blocks: ['cards-product'],
      defaultContent: [],
    },
    {
      id: 'section-6',
      name: 'Recommendations Tabs',
      selector: '.tab-align-left',
      style: null,
      blocks: ['tabs'],
      defaultContent: ['h2'],
    },
  ],
};

/**
 * Execute page transformers for a specific hook
 */
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

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

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
