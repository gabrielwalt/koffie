/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-product.
 * Base: cards. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Container block: Each product = 1 row with [image | text]
 * Source selector: .tabs-style-theme-related .product-items
 * Generated: 2026-03-25
 * Updated: 2026-03-25v4
 */

function createBlockHelper(doc, { name, cells }) {
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

export default function parse(element, { document }) {
  if (!element.parentElement) return;

  // element = .product-items (ol) containing .product-item (li) entries
  const products = element.querySelectorAll('.product-item');

  const cells = [];
  products.forEach((product) => {
    // Product image
    const photoLink = product.querySelector('.product-item-photo');
    const productImg = product.querySelector('.product-image-photo.photo');

    // Product details
    const nameLink = product.querySelector('.product-item-link');
    const strengthLabel = product.querySelector('.strength-label');
    const description = product.querySelector('.product-item-description');
    const specialPrice = product.querySelector('.special-price .price');
    const oldPrice = product.querySelector('.old-price .price');
    const ctaLink = product.querySelector('.actions-primary a');

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
