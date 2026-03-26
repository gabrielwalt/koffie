/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs (section-based auto-blocking).
 * Source: https://www.koffievoordeel.nl/abonnement
 * Instead of creating a single block table, outputs each tab panel as
 * its own section with Section Metadata containing tabTitle.
 * Each tab section contains a "Bekijk alle" link (default content)
 * followed by a cards-product block with [image | text] rows.
 * The frontend auto-blocking code detects consecutive tab-title sections
 * and combines them into a synthetic tabs block at render time.
 *
 * Source selector: .tab-align-left
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

function createSectionMetadata(doc, props) {
  if (typeof WebImporter !== 'undefined' && WebImporter.Blocks) {
    const cells = Object.entries(props).map(([key, value]) => [key, value]);
    return WebImporter.Blocks.createBlock(doc, { name: 'Section Metadata', cells });
  }
  const table = doc.createElement('table');
  const headerRow = doc.createElement('tr');
  const th = doc.createElement('th');
  th.colSpan = 100;
  th.textContent = 'Section Metadata';
  headerRow.appendChild(th);
  table.appendChild(headerRow);
  Object.entries(props).forEach(([key, value]) => {
    const tr = doc.createElement('tr');
    const tdKey = doc.createElement('td');
    tdKey.textContent = key;
    tr.appendChild(tdKey);
    const tdVal = doc.createElement('td');
    tdVal.textContent = value;
    tr.appendChild(tdVal);
    table.appendChild(tr);
  });
  return table;
}

function buildProductCard(product, document) {
  const productImg = product.querySelector('.product-image-photo.photo');
  const nameLink = product.querySelector('.product-item-link');
  const strengthLabel = product.querySelector('.strength-label');
  const description = product.querySelector('.product-item-description');
  const specialPrice = product.querySelector('.special-price .price');
  const oldPrice = product.querySelector('.old-price .price');
  const ctaLink = product.querySelector('.actions-primary a');

  // Image cell
  const imageFrag = document.createDocumentFragment();
  imageFrag.appendChild(document.createComment(' field:image '));
  if (productImg && !/placeholder/i.test(productImg.src)) {
    const img = document.createElement('img');
    img.src = productImg.src;
    img.alt = productImg.alt || '';
    imageFrag.appendChild(img);
  }

  // Text cell (richtext)
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));

  if (nameLink) {
    const h3 = document.createElement('h3');
    const a = document.createElement('a');
    a.href = nameLink.href;
    a.textContent = nameLink.textContent.trim();
    h3.appendChild(a);
    textFrag.appendChild(h3);
  }

  if (strengthLabel) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Intensiteit ' + strengthLabel.textContent.trim() + '/12';
    p.appendChild(strong);
    textFrag.appendChild(p);
  }

  if (description) {
    const p = document.createElement('p');
    p.textContent = description.textContent.trim().replace(/\s+/g, ' ');
    textFrag.appendChild(p);
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
    textFrag.appendChild(p);
  }

  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    p.appendChild(a);
    textFrag.appendChild(p);
  }

  return [imageFrag, textFrag];
}

export default function parse(element, { document }) {
  if (!element.parentElement) return;

  // element = .tab-align-left (the Magento tabs container)
  const tabPanels = element.querySelectorAll('[role="tabpanel"]');
  const tabHeaders = element.querySelectorAll('[role="tab"]');

  if (tabPanels.length === 0) return;

  const frag = document.createDocumentFragment();

  // Emit the tabs title heading (e.g. "Populair bij abonnees") if present
  const tabsTitle = element.querySelector('.tabs-title');
  if (tabsTitle) {
    const h2 = document.createElement('h2');
    h2.textContent = tabsTitle.textContent.trim();
    frag.appendChild(h2);
  }

  // Output each tab panel as its own section
  tabPanels.forEach((panel, i) => {
    const tabHeader = tabHeaders[i];
    const label = panel.getAttribute('data-tab-name')
      || (tabHeader ? tabHeader.textContent.trim() : `Tab ${i + 1}`);

    // Section break before each tab section
    frag.appendChild(document.createElement('hr'));

    // "Bekijk alle" link as default content
    const viewAllLink = panel.querySelector('.tab-link a');
    if (viewAllLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = viewAllLink.href;
      a.textContent = viewAllLink.textContent.trim();
      p.appendChild(a);
      frag.appendChild(p);
    }

    // Products as a cards-product block (limit to 3 per tab)
    const products = [...panel.querySelectorAll('.product-item')].slice(0, 3);
    if (products.length > 0) {
      const cells = products.map((product) => buildProductCard(product, document));
      frag.appendChild(createBlockHelper(document, { name: 'cards-product', cells }));
    }

    // Section Metadata with tabTitle for auto-blocking
    frag.appendChild(createSectionMetadata(document, { tabTitle: label }));
  });

  element.replaceWith(frag);
}
