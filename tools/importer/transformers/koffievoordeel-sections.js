/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: koffievoordeel sections.
 * Adds section breaks (<hr>) between sections based on template section selectors.
 * Runs in afterTransform only, uses payload.template.sections.
 * Selectors from page-templates.json (derived from captured DOM).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

function findSectionElement(element, selector) {
  if (Array.isArray(selector)) {
    for (const sel of selector) {
      const found = element.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
  return element.querySelector(selector);
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const template = payload && payload.template;
    if (!template || !template.sections || template.sections.length < 2) return;

    const { document } = element.ownerDocument ? { document: element.ownerDocument } : { document };
    const sections = template.sections;

    // Process sections in reverse order to preserve DOM positions
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const sectionEl = findSectionElement(element, section.selector);

      // Add section-metadata block if section has a style
      if (section.style && sectionEl) {
        const cells = { style: section.style };
        if (typeof WebImporter !== 'undefined' && WebImporter.Blocks) {
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: 'Section Metadata',
            cells,
          });
          sectionEl.after(metaBlock);
        }
      }

      // Add <hr> before each section (except first) when there is content before it
      if (i > 0 && sectionEl) {
        const hr = document.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
