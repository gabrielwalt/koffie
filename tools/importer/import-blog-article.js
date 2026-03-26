/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsParser from './parsers/columns.js';
import cardsProductParser from './parsers/cards-product.js';
import accordionFaqParser from './parsers/accordion-faq.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// PARSER REGISTRY
const parsers = {
  'columns': columnsParser,
  'cards-product': cardsProductParser,
  'accordion-faq': accordionFaqParser,
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
  name: 'blog-article',
  description: 'Blog post with author metadata, hero image, long-form editorial content, FAQ accordion, and product recommendations',
  urls: [
    'https://www.koffievoordeel.nl/blog/de-wetenschap-achter-de-perfecte-kop-koffie',
  ],
  blocks: [
    {
      name: 'columns',
      instances: ['.amblog-content .pagebuilder-column-group'],
    },
    {
      name: 'cards-product',
      instances: ['.widget-product-carousel'],
    },
    {
      name: 'accordion-faq',
      instances: ['.amblog-content dl'],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Blog Hero & Intro',
      selector: '.amblog-content > div:first-child',
      style: null,
      blocks: ['columns'],
      defaultContent: ['h1'],
    },
    {
      id: 'section-2',
      name: 'Article Body',
      selector: '.amblog-content',
      style: null,
      blocks: [],
      defaultContent: ['hr', 'h3', 'p', 'ul', 'ol'],
    },
    {
      id: 'section-10',
      name: 'Product Recommendations',
      selector: '.widget-product-carousel',
      style: null,
      blocks: ['cards-product'],
      defaultContent: [],
    },
    {
      id: 'section-12',
      name: 'FAQ',
      selector: '.amblog-content dl',
      style: null,
      blocks: ['accordion-faq'],
      defaultContent: ['h2'],
    },
    {
      id: 'section-14',
      name: 'CTA Section',
      selector: '.amblog-content > div:last-child',
      style: null,
      blocks: [],
      defaultContent: ['h4', 'p', 'ul', 'a.button'],
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
