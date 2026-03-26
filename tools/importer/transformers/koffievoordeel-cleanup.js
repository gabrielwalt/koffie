/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: koffievoordeel cleanup.
 * Removes non-authorable content, converts unsupported elements,
 * eliminates hidden/duplicate content from koffievoordeel.nl pages.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };


function removeSelectors(el, selectors) {
  if (typeof WebImporter !== 'undefined' && WebImporter.DOMUtils) {
    WebImporter.DOMUtils.remove(el, selectors);
  } else {
    selectors.forEach((sel) => {
      el.querySelectorAll(sel).forEach((node) => node.remove());
    });
  }
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie consent
    removeSelectors(element, [
      '#cookie_consent_dialog',
      '#cookie-status',
      '.cookie-consent-dialog',
    ]);

    // Breadcrumbs (hidden by CSS on source page but still in DOM)
    removeSelectors(element, ['.breadcrumbs']);

    // Convert blockquote to div (blockquote not supported in EDS)
    element.querySelectorAll('blockquote').forEach((bq) => {
      const doc = element.ownerDocument || document;
      const div = doc.createElement('div');
      while (bq.firstChild) div.appendChild(bq.firstChild);
      bq.replaceWith(div);
    });

    // Remove hidden desktop containers (duplicate of visible mobile versions)
    // These are .column.main > div wrappers whose first child has class "desktop"
    // Keep containers with brand logos (brand-abo-*, brand-starbucks)
    const mainColBefore = element.querySelector('.column.main');
    if (mainColBefore) {
      [...mainColBefore.children].forEach((child) => {
        const fc = child.firstElementChild;
        if (fc && fc.classList.contains('desktop')) {
          const hasBrandLogos = child.querySelector('[class*="brand-"]');
          if (!hasBrandLogos) {
            child.remove();
          }
        }
      });
    }

    // Remove hidden desktop step duplicates (column-groups near .kv-steps-slider)
    element.querySelectorAll('.kv-steps-slider').forEach((slider) => {
      let rowInner = slider.parentElement;
      while (rowInner && !rowInner.classList.contains('row-full-width-inner')) {
        rowInner = rowInner.parentElement;
      }
      if (!rowInner) return;
      [...rowInner.querySelectorAll('.pagebuilder-column-group')].forEach((group) => {
        if (group.querySelector('.kv-steps-slider')) return;
        if (group.querySelector('h1, h2, h3')) return;
        group.remove();
      });
    });

    // Remove hidden form after FAQ section
    removeSelectors(element, ['#amhideprice-form', 'form.amhideprice-form']);
  }

  if (hookName === TransformHook.afterTransform) {
    removeSelectors(element, [
      // Header/footer
      'header.page-header',
      'footer.page-footer',
      // Search
      'form.minisearch',
      '#search_autocomplete',
      '#search_autocomplete_mobile',
      '#search_autocomplete_sticky',
      // Non-content elements
      '#coupon-message-block',
      'noscript',
      'iframe',
      'link',
      // Hidden empty anchor (hero-quote source)
      '#favoriete-koffie',
      // Coffee Finder floating button
      '.ribbon-button',
      // Tracking pixels
      'img[src*="bat.bing.com"]',
    ]);

    // Clean up .column.main direct children: remove hidden/empty/style-only elements
    const mainCol = element.querySelector('.column.main');
    if (mainCol) {
      [...mainCol.children].forEach((child) => {
        const tag = child.tagName;
        // Remove standalone <style> and hidden <input> elements
        if (tag === 'STYLE' || tag === 'INPUT') {
          child.remove();
          return;
        }
        // Remove divs/forms with only <style> children or completely empty
        if (tag === 'DIV' || tag === 'FORM') {
          const kids = [...child.children];
          const onlyStyles = kids.length > 0 && kids.every((c) => c.tagName === 'STYLE');
          const isEmpty = kids.length === 0 && child.textContent.trim() === '';
          if (onlyStyles || isEmpty) {
            child.remove();
          }
        }
      });

      // Remove all content after the last block table in .column.main
      // (block tables are <table> elements with a single-cell header row)
      let lastBlockTable = null;
      mainCol.querySelectorAll('table').forEach((t) => {
        const header = t.querySelector('tr:first-child th') || t.querySelector('tr:first-child td');
        if (header) {
          lastBlockTable = t;
        }
      });
      if (lastBlockTable) {
        // Remove siblings after the last block table within its parent
        let next = lastBlockTable.nextElementSibling;
        while (next) {
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }
        // Remove .column.main children after the block table's container div
        let containerDiv = lastBlockTable.parentElement;
        while (containerDiv && containerDiv.parentElement !== mainCol) {
          containerDiv = containerDiv.parentElement;
        }
        if (containerDiv) {
          let parentNext = containerDiv.nextElementSibling;
          while (parentNext) {
            const toRemove = parentNext;
            parentNext = parentNext.nextElementSibling;
            toRemove.remove();
          }
        }
      }
    }

    // Remove duplicate consecutive images (Magento lazy-load creates two identical <img> tags)
    element.querySelectorAll('p, div, figure').forEach((container) => {
      const imgs = container.querySelectorAll('img');
      if (imgs.length < 2) return;
      const seen = new Set();
      imgs.forEach((img) => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (seen.has(src)) {
          img.remove();
        } else {
          seen.add(src);
        }
      });
    });

    // Remove empty headings (e.g. <h3 id=""></h3>)
    element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      if (h.textContent.trim() === '') h.remove();
    });

    // Remove data-* attributes and event handlers
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-container');
    });
  }
}
