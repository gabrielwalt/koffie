/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-logos.
 * Base: cards. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Container block: Each brand logo = 1 row with [image | text]
 * Source selector: .brand-abo-gmi, .brand-abo-illy, .brand-abo-lavazza, .brand-abo-cdo
 * Generated: 2026-03-25
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

  // element = .brand-abo-gmi, .brand-abo-illy, .brand-abo-lavazza, or .brand-abo-cdo
  // Navigate to the column-line that holds all brand logo columns
  const columnLine = element.closest('.pagebuilder-column-line') || element.parentElement;
  if (!columnLine) return;

  // Find all brand columns
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

    // Text cell with field hint (brand name from alt or class)
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    const brandName = img.alt || col.className.replace('pagebuilder-column', '').trim();
    if (brandName) {
      const p = document.createElement('p');
      p.textContent = brandName;
      textFrag.appendChild(p);
    }

    cells.push([imageFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'cards-logos', cells });

  // Remove sibling columns that aren't the matched element
  columns.forEach((col) => {
    if (col !== element && col.parentElement) col.remove();
  });

  // Replace the matched element itself with the block
  element.replaceWith(block);
}
