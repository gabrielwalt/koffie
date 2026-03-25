/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-quote.
 * Base: hero. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields: image (reference), imageAlt (collapsed), text (richtext)
 * Hero block: Row 1 = background image, Row 2 = text content (quote)
 * Source selector: #favoriete-koffie
 * Generated: 2026-03-25
 * Updated: 2026-03-25v4
 */

function createBlockHelper(doc, { name, cells }) {
  if (typeof WebImporter !== 'undefined' && WebImporter.Blocks) {
    return WebImporter.Blocks.createBlock(doc, { name, cells });
  }
  const table = doc.createElement('table');
  const headerRow = doc.createElement('tr');
  const headerCell = doc.createElement('td');
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

  // element = #favoriete-koffie span
  // Navigate up to find the container that also holds the background figure
  let container = element.parentElement;
  while (container && !container.querySelector('figure img')) {
    container = container.parentElement;
  }

  const figure = container ? container.querySelector('figure') : null;
  const bgImg = figure ? figure.querySelector('img') : null;

  // Build image cell (Row 1) with field hint
  const imageFrag = document.createDocumentFragment();
  if (bgImg) {
    imageFrag.appendChild(document.createComment(' field:image '));
    const img = document.createElement('img');
    img.src = bgImg.src;
    img.alt = bgImg.alt || '';
    imageFrag.appendChild(img);
  }

  // Build text cell (Row 2) with field hint
  // Quote text is baked into the background image on the source page
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  const p = document.createElement('p');
  const em = document.createElement('em');
  em.textContent = 'Altijd mijn favoriete koffie in huis, met korting, zonder enige moeite. Heerlijk!';
  p.appendChild(em);
  textFrag.appendChild(p);

  // Remove figure to prevent duplicate content in output
  if (figure) figure.remove();

  const cells = [];
  if (bgImg) {
    cells.push([imageFrag]);
  }
  cells.push([textFrag]);

  const block = createBlockHelper(document, { name: 'hero-quote', cells });
  element.replaceWith(block);
}
