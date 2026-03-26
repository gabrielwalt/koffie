/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import embedParser from './parsers/embed.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/koffievoordeel-cleanup.js';
import sectionsTransformer from './transformers/koffievoordeel-sections.js';

// PARSER REGISTRY
const parsers = {
  'embed': embedParser,
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
  name: 'instructional-page',
  description: 'Instructional support page with hero banner, step-by-step text instructions, and embedded tutorial videos',
  urls: [
    'https://www.koffievoordeel.nl/abonnement-wijzigen',
  ],
  blocks: [
    {
      name: 'embed',
      instances: [".pagebuilder-video-container"],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero Banner',
      selector: '.column.main > div:first-of-type',
      style: null,
      blocks: [],
      defaultContent: ['p > a > picture'],
    },
    {
      id: 'section-2',
      name: 'Introduction',
      selector: '.column.main h1',
      style: null,
      blocks: [],
      defaultContent: ['h1', 'p'],
    },
    {
      id: 'section-3',
      name: 'Instruction Step: Datum aanpassen',
      selector: '.column.main',
      style: null,
      blocks: ['embed'],
      defaultContent: ['h2', 'ul', 'p'],
    },
    {
      id: 'section-4',
      name: 'Instruction Step: Aantal stuks aanpassen',
      selector: '.column.main',
      style: null,
      blocks: ['embed'],
      defaultContent: ['h2', 'ul'],
    },
    {
      id: 'section-5',
      name: 'Instruction Step: Pauzeren, reactiveren en opzeggen',
      selector: '.column.main',
      style: null,
      blocks: ['embed'],
      defaultContent: ['h2', 'ul'],
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
