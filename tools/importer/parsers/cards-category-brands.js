/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-category (brands) variant.
 * Base: cards-category. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Each brand = 1 row with [image | text:"brand"]
 * Source selector: .column.main .desktop [class*="brand-abo"]
 * Text is placeholder "brand" — CSS variant hides the text column.
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

  // element = first brand column (matched via [class*="brand-abo"])
  // Navigate to the parent column-line that holds all brand columns
  const columnLine = element.closest('.pagebuilder-column-line') || element.parentElement;
  if (!columnLine) return;

  const columns = [...columnLine.querySelectorAll('.pagebuilder-column')];
  const cells = [];

  columns.forEach((col) => {
    const figure = col.querySelector('figure');
    if (!figure) return;
    const img = figure.querySelector('img');
    if (!img) return;

    // Image cell with field hint
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    const newImg = document.createElement('img');
    newImg.src = img.src;
    newImg.alt = img.alt || '';
    imageFrag.appendChild(newImg);

    // Text cell with field hint — placeholder text for brands
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    const p = document.createElement('p');
    p.textContent = 'brand';
    textFrag.appendChild(p);

    cells.push([imageFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'cards-category (brands)', cells });

  // Remove sibling columns that aren't the matched element
  columns.forEach((col) => {
    if (col !== element && col.parentElement) col.remove();
  });

  // Place brands block after the last cards-category block table (if found)
  // so it appears after categories in the output, regardless of source DOM order.
  const main = document.querySelector('.column.main') || document.body;
  const tables = main.querySelectorAll('table');
  let lastCategoryTable = null;
  for (const t of tables) {
    const header = t.querySelector('tr:first-child th, tr:first-child td');
    if (header) {
      const text = header.textContent.trim().toLowerCase();
      if (text === 'cards-category' || text === 'cards category') {
        lastCategoryTable = t;
      }
    }
  }

  if (lastCategoryTable) {
    lastCategoryTable.after(block);
    element.remove();
  } else {
    element.replaceWith(block);
  }
}
