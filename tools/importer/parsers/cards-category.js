/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-category.
 * Base: cards. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Container block: Each category = 1 row with [image | text]
 * Source selector: .coffee-beans-button, .coffeType-mobile-icon
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
  // Skip if already processed (parent removed by earlier call)
  if (!element.parentElement) return;

  // element = .coffee-beans-button or .coffeType-mobile-icon
  // Navigate to the column-line that holds all category columns
  const columnLine = element.closest('.pagebuilder-column-line') || element.parentElement;
  if (!columnLine) return;

  // Find all category columns with icons
  const columns = [...columnLine.querySelectorAll('.pagebuilder-column')];

  const cells = [];
  columns.forEach((col) => {
    const figure = col.querySelector('figure');
    const iconText = col.querySelector('.icon-button-text');
    if (!figure && !iconText) return;

    // Image cell with field hint
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    const img = figure ? figure.querySelector('img') : null;
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      imageFrag.appendChild(newImg);
    }

    // Text cell with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    const link = iconText ? iconText.querySelector('a') : null;
    if (link) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    cells.push([imageFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'cards-category', cells });

  // Remove sibling columns that aren't the matched element
  columns.forEach((col) => {
    if (col !== element && col.parentElement) col.remove();
  });

  // Replace the matched element itself with the block
  element.replaceWith(block);
}
