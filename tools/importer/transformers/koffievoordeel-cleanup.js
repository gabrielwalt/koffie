/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: koffievoordeel cleanup.
 * Removes non-authorable content from koffievoordeel.nl pages.
 * Selectors from captured DOM (migration-work/cleaned.html).
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
    // Cookie consent dialog - found: <div id="cookie_consent_dialog" class="cookie-consent-dialog">
    // Cookie status message - found: <div class="cookie-status-message" id="cookie-status">
    removeSelectors(element, [
      '#cookie_consent_dialog',
      '#cookie-status',
      '.cookie-consent-dialog',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Header - found: <header class="page-header">
    // Footer - found: <footer class="page-footer">
    // Search forms - found: <form class="form minisearch" id="search_mini_form">
    // Coupon message block - found: <div id="coupon-message-block">
    removeSelectors(element, [
      'header.page-header',
      'footer.page-footer',
      'form.minisearch',
      '#search_autocomplete',
      '#search_autocomplete_mobile',
      '#search_autocomplete_sticky',
      '#coupon-message-block',
      'noscript',
      'iframe',
      'link',
    ]);

    // Remove data-* attributes and event handlers
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-container');
    });
  }
}
