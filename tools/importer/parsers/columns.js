/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns block.
 * Base: columns. Source: koffievoordeel.nl pagebuilder-column-group.
 * Columns blocks do NOT require field hint comments (per xwalk hinting rules).
 *
 * Source DOM: .pagebuilder-column-group > .pagebuilder-column-line? > .pagebuilder-column (each = 1 column)
 * Target: Columns table with N columns per row, each cell containing the column's content.
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
  // Find all direct column children (may be nested under .pagebuilder-column-line)
  let columns = Array.from(element.querySelectorAll(':scope > .pagebuilder-column-line > .pagebuilder-column'));
  if (columns.length === 0) {
    columns = Array.from(element.querySelectorAll(':scope > .pagebuilder-column'));
  }
  if (columns.length === 0) {
    columns = Array.from(element.querySelectorAll('.pagebuilder-column'));
  }

  // Filter out empty columns (some are spacers with no content)
  const nonEmptyColumns = columns.filter((col) => {
    const text = col.textContent.trim();
    const hasImages = col.querySelector('img, picture');
    return text.length > 0 || hasImages;
  });

  if (nonEmptyColumns.length === 0) return;

  // Skip single-column groups — these are wrappers, not real columns blocks.
  // Unwrap the content so it becomes default content instead.
  if (nonEmptyColumns.length === 1) {
    const frag = document.createDocumentFragment();
    const col = nonEmptyColumns[0];
    while (col.firstChild) {
      frag.appendChild(col.firstChild);
    }
    element.replaceWith(frag);
    return;
  }

  // Build a single row with all columns
  const row = nonEmptyColumns.map((col) => {
    const frag = document.createDocumentFragment();
    while (col.firstChild) {
      frag.appendChild(col.firstChild);
    }
    return frag;
  });

  const cells = [row];
  const block = createBlockHelper(document, { name: 'columns', cells });
  element.replaceWith(block);
}
