/* eslint-disable */
/* global WebImporter */

/**
 * Parser for accordion-faq.
 * Base: accordion. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields (per item): summary (text), text (richtext)
 * Container block: Each FAQ item = 1 row with [summary | text]
 * Source selector: .column.main [data-collapsible="true"]
 * Generated: 2026-03-25
 * Updated: 2026-03-25v4
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
  // Skip if already processed (parent removed by earlier call)
  if (!element.parentElement) return;

  // element = div[data-collapsible="true"] (one FAQ item)
  // Navigate to parent to find all sibling FAQ items
  const faqContainer = element.parentElement;
  const allItems = faqContainer.querySelectorAll('[data-collapsible="true"]');

  const cells = [];
  allItems.forEach((item) => {
    // Magento accordion: [data-collapsible] > div[role="tablist"] > div[role="tab"] + div[role="tabpanel"]
    const tab = item.querySelector('[role="tab"]');
    const tabpanel = item.querySelector('[role="tabpanel"]');
    const contentDiv = tabpanel ? (tabpanel.querySelector('.content') || tabpanel) : null;

    // Summary cell with field hint (plain text — model field is "text" not "richtext")
    const summaryFrag = document.createDocumentFragment();
    summaryFrag.appendChild(document.createComment(' field:summary '));
    if (tab) {
      summaryFrag.appendChild(document.createTextNode(tab.textContent.trim()));
    }

    // Text cell with field hint
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (contentDiv) {
      const paragraphs = contentDiv.querySelectorAll('p');
      paragraphs.forEach((para) => {
        const p = document.createElement('p');
        p.innerHTML = para.innerHTML;
        textFrag.appendChild(p);
      });
    }

    cells.push([summaryFrag, textFrag]);
  });

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'accordion-faq', cells });
  faqContainer.replaceWith(block);
}
