/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed block.
 * Base: embed. Source: koffievoordeel.nl pagebuilder-video-container with Vimeo iframes.
 *
 * Source DOM: .pagebuilder-video-container > iframe[src*="vimeo"]
 * Target: Embed table with single cell containing a link to the Vimeo video URL.
 * The embed block JS detects Vimeo URLs and renders the appropriate player.
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
  const iframe = element.querySelector('iframe[src*="vimeo"], iframe[src*="youtube"]');
  if (!iframe) return;

  let src = iframe.getAttribute('src') || '';
  // Clean up Vimeo player URL to canonical format
  // Source: https://player.vimeo.com/video/838695939?title=0&byline=0&portrait=0
  // Target: https://vimeo.com/838695939
  const vimeoMatch = src.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoMatch) {
    src = `https://vimeo.com/${vimeoMatch[1]}`;
  }

  // Create a link element for the embed block
  const link = document.createElement('a');
  link.href = src;
  link.textContent = src;

  const cells = [[link]];
  const block = createBlockHelper(document, { name: 'embed', cells });
  element.replaceWith(block);
}
