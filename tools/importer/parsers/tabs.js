/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs.
 * Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per panel): label (text), content (richtext)
 * Container block: Each tab = 1 row with [label | content]
 * Source selector: .tab-align-left
 * Tab content includes "Bekijk alle" link + product cards as richtext.
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

function extractProductContent(product, document) {
  const frag = document.createDocumentFragment();

  const productImg = product.querySelector('.product-image-photo.photo');
  const nameLink = product.querySelector('.product-item-link');
  const strengthLabel = product.querySelector('.strength-label');
  const description = product.querySelector('.product-item-description');
  const specialPrice = product.querySelector('.special-price .price');
  const oldPrice = product.querySelector('.old-price .price');
  const ctaLink = product.querySelector('.actions-primary a');

  if (productImg && !/placeholder/i.test(productImg.src)) {
    const p = document.createElement('p');
    const img = document.createElement('img');
    img.src = productImg.src;
    img.alt = productImg.alt || '';
    p.appendChild(img);
    frag.appendChild(p);
  }

  if (nameLink) {
    const h3 = document.createElement('h3');
    const a = document.createElement('a');
    a.href = nameLink.href;
    a.textContent = nameLink.textContent.trim();
    h3.appendChild(a);
    frag.appendChild(h3);
  }

  if (strengthLabel) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Intensiteit ' + strengthLabel.textContent.trim() + '/12';
    p.appendChild(strong);
    frag.appendChild(p);
  }

  if (description) {
    const p = document.createElement('p');
    p.textContent = description.textContent.trim().replace(/\s+/g, ' ');
    frag.appendChild(p);
  }

  if (specialPrice) {
    const p = document.createElement('p');
    if (oldPrice) {
      const del = document.createElement('del');
      del.textContent = oldPrice.textContent.trim().replace(/\s+/g, '');
      p.appendChild(del);
      p.appendChild(document.createTextNode(' '));
    }
    const strong = document.createElement('strong');
    strong.textContent = specialPrice.textContent.trim().replace(/\s+/g, '');
    p.appendChild(strong);
    frag.appendChild(p);
  }

  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    p.appendChild(a);
    frag.appendChild(p);
  }

  return frag;
}

export default function parse(element, { document }) {
  if (!element.parentElement) return;

  // element = .tab-align-left (the Magento tabs container)
  const tabPanels = element.querySelectorAll('[role="tabpanel"]');
  const tabHeaders = element.querySelectorAll('[role="tab"]');

  const cells = [];

  tabPanels.forEach((panel, i) => {
    // Tab label
    const tabHeader = tabHeaders[i];
    const label = panel.getAttribute('data-tab-name')
      || (tabHeader ? tabHeader.textContent.trim() : `Tab ${i + 1}`);

    // Label cell (plain text for "text" component)
    const labelFrag = document.createDocumentFragment();
    labelFrag.appendChild(document.createComment(' field:label '));
    labelFrag.appendChild(document.createTextNode(label));

    // Content cell — richtext with "Bekijk alle" link + product cards
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(' field:content '));

    // "Bekijk alle" link
    const viewAllLink = panel.querySelector('.tab-link a');
    if (viewAllLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = viewAllLink.href;
      a.textContent = viewAllLink.textContent.trim();
      p.appendChild(a);
      contentFrag.appendChild(p);
    }

    // Product cards as richtext (limit to 3 per tab)
    const products = [...panel.querySelectorAll('.product-item')].slice(0, 3);
    products.forEach((product) => {
      contentFrag.appendChild(extractProductContent(product, document));
    });

    cells.push([labelFrag, contentFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'tabs', cells });
  element.replaceWith(block);
}
