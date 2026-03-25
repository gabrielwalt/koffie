/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroSubscriptionParser from './parsers/hero-subscription.js';
import cardsStepsParser from './parsers/cards-steps.js';
import cardsCategoryParser from './parsers/cards-category.js';
import cardsLogosParser from './parsers/cards-logos.js';
import heroQuoteParser from './parsers/hero-quote.js';
import cardsProductParser from './parsers/cards-product.js';
import accordionFaqParser from './parsers/accordion-faq.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-subscription': heroSubscriptionParser,
  'cards-steps': cardsStepsParser,
  'cards-category': cardsCategoryParser,
  'cards-logos': cardsLogosParser,
  'hero-quote': heroQuoteParser,
  'cards-product': cardsProductParser,
  'accordion-faq': accordionFaqParser,
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
  name: 'abonnement-page',
  description: 'Subscription landing page promoting coffee subscription plans',
  urls: [
    'https://www.koffievoordeel.nl/abonnement',
  ],
  blocks: [
    {
      name: 'hero-subscription',
      instances: ['.column.main .pagebuilder-column.shadow-cards'],
    },
    {
      name: 'cards-steps',
      instances: ['.kv-steps-slider'],
    },
    {
      name: 'cards-category',
      instances: ['.column.main .coffee-beans-button', '.column.main .coffeType-mobile-icon'],
    },
    {
      name: 'cards-logos',
      instances: ['.column.main .brand-abo-gmi', '.column.main .brand-abo-illy', '.column.main .brand-abo-lavazza', '.column.main .brand-abo-cdo'],
    },
    {
      name: 'hero-quote',
      instances: ['#favoriete-koffie'],
    },
    {
      name: 'cards-product',
      instances: ['.tabs-style-theme-related .product-items'],
    },
    {
      name: 'accordion-faq',
      instances: ['.column.main [data-collapsible="true"]'],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero',
      selector: '.column.main > div:first-of-type',
      style: null,
      blocks: ['hero-subscription'],
      defaultContent: [],
    },
    {
      id: 'section-2',
      name: 'How It Works',
      selector: '.column.main > div:nth-of-type(2)',
      style: null,
      blocks: ['cards-steps'],
      defaultContent: ['#DYDDJVR'],
    },
    {
      id: 'section-3',
      name: 'Choose Your Coffee',
      selector: '.column.main > div:nth-of-type(3)',
      style: null,
      blocks: ['cards-category'],
      defaultContent: ['#PWJHN6R'],
    },
    {
      id: 'section-4',
      name: 'Brand Logos',
      selector: ['.brand-abo-gmi', '.brand-abo-illy'],
      style: null,
      blocks: ['cards-logos'],
      defaultContent: [],
    },
    {
      id: 'section-5',
      name: 'Quote Banner',
      selector: '#favoriete-koffie',
      style: null,
      blocks: ['hero-quote'],
      defaultContent: [],
    },
    {
      id: 'section-6',
      name: 'Popular Products',
      selector: '.tab-align-left',
      style: null,
      blocks: ['cards-product'],
      defaultContent: ['.tabs-title'],
    },
    {
      id: 'section-7',
      name: 'Subscription Explanation',
      selector: '#uitleg',
      style: null,
      blocks: [],
      defaultContent: ['#uitleg ~ div h2', '#uitleg ~ div p'],
    },
    {
      id: 'section-8',
      name: 'FAQ',
      selector: '#YDF0B3T',
      style: null,
      blocks: ['accordion-faq'],
      defaultContent: ['#YDF0B3T'],
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

  // Section transformers only run in afterTransform
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

/**
 * Find all blocks on the page based on the embedded template configuration
 */
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

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
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

    // 4. Execute afterTransform transformers (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
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
