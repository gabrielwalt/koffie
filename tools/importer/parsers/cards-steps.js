/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-steps.
 * Base: cards. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Container block: Each step = 1 row with [image | text]
 * Source selector: .kv-steps-slider
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

  // element = .kv-steps-slider containing .kv-step items
  const steps = element.querySelectorAll('.kv-step');

  const cells = [];
  steps.forEach((step) => {
    const iconImg = step.querySelector('.kv-step-icon img');
    const stepText = step.querySelector('.kv-step-text');
    const stepNumber = step.querySelector('.kv-step-number');

    // Image cell with field hint
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    if (iconImg) {
      const img = document.createElement('img');
      img.src = iconImg.src;
      img.alt = iconImg.alt || '';
      imageFrag.appendChild(img);
    }

    // Text cell with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    const p = document.createElement('p');
    const parts = [];
    if (stepNumber) parts.push(stepNumber.textContent.trim());
    if (stepText) parts.push(stepText.textContent.trim());
    p.textContent = parts.join(' ');
    textFrag.appendChild(p);

    cells.push([imageFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'cards-steps', cells });
  element.replaceWith(block);
}
