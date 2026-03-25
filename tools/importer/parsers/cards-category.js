/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-category.
 * Base: cards. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per card): image (reference), text (richtext)
 * Container block: Each category = 1 row with [image | text]
 * Source selector: .coffeType-mobile-icon
 * Also collects brand logos (.brand-abo-*, .brand-starbucks) into same block.
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

  // element = .coffeType-mobile-icon column
  // Navigate to the column-line that holds all category columns
  const columnLine = element.closest('.pagebuilder-column-line') || element.parentElement;
  if (!columnLine) return;

  const columns = [...columnLine.querySelectorAll('.pagebuilder-column')];
  const cells = [];

  // Collect category items (image + link text)
  columns.forEach((col) => {
    const figure = col.querySelector('figure');
    if (!figure) return;
    const img = figure.querySelector('img');

    // Find text link: .icon-button-text and <a> are siblings inside a wrapper div
    const iconText = col.querySelector('.icon-button-text');
    let linkEl = null;
    let linkText = '';
    if (iconText) {
      // The <a> is a sibling of .icon-button-text within the same parent div
      const wrapper = iconText.parentElement;
      linkEl = wrapper ? wrapper.querySelector('a[href]') : null;
      if (!linkEl) {
        // Fallback: find any link in the column that isn't inside the figure
        const allLinks = [...col.querySelectorAll('a[href]')];
        linkEl = allLinks.find((l) => !figure.contains(l)) || allLinks[0];
      }
      linkText = iconText.textContent.trim();
    } else {
      // Fallback: find link not inside figure
      const allLinks = [...col.querySelectorAll('a[href]')];
      linkEl = allLinks.find((l) => !figure.contains(l)) || allLinks[0];
      if (linkEl) linkText = linkEl.textContent.trim();
    }

    // Image cell with field hint
    const imageFrag = document.createDocumentFragment();
    imageFrag.appendChild(document.createComment(' field:image '));
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      imageFrag.appendChild(newImg);
    }

    // Text cell with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (linkEl && linkText) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = linkEl.href;
      a.textContent = linkText;
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

  element.replaceWith(block);
}
