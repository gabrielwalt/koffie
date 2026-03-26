/* eslint-disable */
/* global WebImporter */
import { createBlockHelper } from './utils.js';

/**
 * Parser for cards-product block.
 * Base: cards. Model fields (per card): image (reference), text (richtext)
 * Container block: Each product = 1 row with [image | text]
 * Source selectors: .product-items (ol/ul), .widget-product-carousel .product-items
 *
 * Handles Magento product list markup with fallbacks for common patterns:
 *   - Product image: .product-image-photo, img inside product link
 *   - Product name: .product-item-link, h2/h3 inside product item
 *   - Price: .special-price .price / .old-price .price, or .price alone
 *   - CTA: .actions-primary a, or any link inside actions container
 */


export default function parse(element, { document }) {
  if (!element.parentElement) return;

  // Skip product lists inside tab containers — those are handled by the tabs parser
  if (element.closest('[role="tabpanel"], .tab-align-left, .tabs-content, .ui-tabs-panel')) return;

  // element = product list container (ol/ul/div) with product items
  let products = element.querySelectorAll('.product-item');
  if (products.length === 0) {
    products = element.querySelectorAll('li, [class*="product"]');
  }

  // Limit to 3 products to match the visible carousel items on the original page
  products = [...products].slice(0, 3);

  const cells = [];
  products.forEach((product) => {
    // Product image — Magento classes, then generic img inside photo/image link
    const productImg = product.querySelector('.product-image-photo.photo')
      || product.querySelector('.product-item-photo img')
      || product.querySelector('[class*="product-image"] img')
      || product.querySelector('a img');

    // Product type + weight from the details-top area
    // Type text (e.g. "koffiebonen") is extracted by subtracting weight from full text
    const detailsTop = product.querySelector('.product-item-details-top .small')
      || product.querySelector('.product-item-details-top');
    let typeText = null;
    let weightText = null;
    if (detailsTop) {
      const fullText = detailsTop.textContent.replace(/\s+/g, ' ').trim();
      const weightDiv = detailsTop.querySelector('div');
      weightText = weightDiv ? weightDiv.textContent.replace(/\s+/g, ' ').trim() : null;
      if (weightText && fullText.length > weightText.length) {
        typeText = fullText.replace(weightText, '').trim();
      }
    }

    // Product details — specific Magento, then generic heading/link
    const nameLink = product.querySelector('.product-item-link')
      || product.querySelector('h2 a, h3 a, [class*="product-name"] a');
    const strengthLabel = product.querySelector('.strength-label');
    const description = product.querySelector('.product-item-description');
    const specialPrice = product.querySelector('.special-price .price')
      || product.querySelector('.price');
    const oldPrice = product.querySelector('.old-price .price');
    const ctaLink = product.querySelector('.actions-primary a')
      || product.querySelector('[class*="actions"] a, .tocart');

    // Image cell with field hint
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    if (productImg) {
      const img = document.createElement('img');
      img.src = productImg.src;
      img.alt = productImg.alt || '';
      imageFrag.appendChild(img);
    }

    // Text cell with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    // Product type + weight combined (e.g. "koffiebonen · 1 kg | 22,49/kg")
    if (typeText || weightText) {
      const p = document.createElement('p');
      const parts = [typeText, weightText].filter(Boolean);
      p.textContent = parts.join(' · ');
      textFrag.appendChild(p);
    }

    // Product name as heading
    if (nameLink) {
      const h3 = document.createElement('h3');
      const a = document.createElement('a');
      a.href = nameLink.href;
      a.textContent = nameLink.textContent.trim();
      h3.appendChild(a);
      textFrag.appendChild(h3);
    }

    // Strength
    if (strengthLabel) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Intensiteit ' + strengthLabel.textContent.trim() + '/12';
      p.appendChild(strong);
      textFrag.appendChild(p);
    }

    // Description
    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim().replace(/\s+/g, ' ');
      textFrag.appendChild(p);
    }

    // Price
    if (specialPrice) {
      const p = document.createElement('p');
      const priceText = specialPrice.textContent.trim().replace(/\s+/g, '');
      if (oldPrice) {
        const del = document.createElement('del');
        del.textContent = oldPrice.textContent.trim().replace(/\s+/g, '');
        p.appendChild(del);
        p.appendChild(document.createTextNode(' '));
      }
      const strong = document.createElement('strong');
      strong.textContent = priceText;
      p.appendChild(strong);
      textFrag.appendChild(p);
    }

    // CTA
    if (ctaLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = ctaLink.href;
      a.textContent = ctaLink.textContent.trim();
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imageFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'cards-product', cells });
  element.replaceWith(block);
}
