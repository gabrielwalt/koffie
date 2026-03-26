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
      blocks: ['hero'],
      defaultContent: [],
    },
    {
      id: 'section-2',
      name: 'Promotional Banner',
      selector: '.column.main > div:nth-of-type(2)',
      style: null,
      blocks: [],
      defaultContent: ['p > a > picture'],
    },
    {
      id: 'section-3',
      name: 'Italian Quality',
      selector: '.content-gmi-1',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-4',
      name: 'Exclusive at Koffievoordeel',
      selector: '.column.main .pagebuilder-column-group:nth-of-type(2)',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-5',
      name: 'Over smaak gesproken',
      selector: '.column.main > div:nth-of-type(5)',
      style: 'dark',
      blocks: ['columns'],
      defaultContent: ['h2'],
    },
    {
      id: 'section-6',
      name: 'Product Assortment Tabs',
      selector: '.tab-align-left',
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
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-9',
      name: 'Discover GMI World',
      selector: '.slick-slider',
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
