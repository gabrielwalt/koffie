/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-subscription.
 * Base: hero. Source: https://www.koffievoordeel.nl/abonnement
 * Model fields: image (reference), imageAlt (collapsed), text (richtext)
 * Hero block: Row 1 = background image, Row 2 = text content (heading, subtitle, benefits, CTA)
 * Source selector: .column.main .pagebuilder-column.shadow-cards
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
  // Extract background image from the figure preceding shadow-cards
  // Found: figure > a > div.image-wrapper > picture > img (line ~2429-2437)
  const heroContainer = element.closest('.pagebuilder-column-line') || element.parentElement;
  const figure = heroContainer ? heroContainer.querySelector('figure') : null;
  const bgImage = figure ? figure.querySelector('img') : null;

  // Remove the figure to prevent it appearing as duplicate default content
  if (figure && figure.parentElement) figure.remove();

  // Extract text content from .shadow-cards div
  // Found: h1, p with subtitle, benefit paragraphs, CTA button
  const heading = element.querySelector('.desktop h1') || element.querySelector('h1');
  const subtitle = element.querySelector('.desktop p em') || element.querySelector('p em');
  const benefitParagraphs = element.querySelectorAll(':scope > div:not(.desktop):not(.mobile) > p');
  const ctaLink = element.querySelector('a.pagebuilder-button-primary');

  // Build image cell (Row 1) with field hint
  const imageFrag = document.createDocumentFragment();
  if (bgImage) {
    imageFrag.appendChild(document.createComment(' field:image '));
    const img = document.createElement('img');
    img.src = bgImage.src;
    img.alt = bgImage.alt || '';
    imageFrag.appendChild(img);
  }

  // Build text cell (Row 2) with field hint
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));

  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = heading.textContent.trim();
    textFrag.appendChild(h1);
  }

  if (subtitle) {
    const p = document.createElement('p');
    const em = document.createElement('em');
    const strong = document.createElement('strong');
    strong.textContent = subtitle.textContent.trim();
    em.appendChild(strong);
    p.appendChild(em);
    textFrag.appendChild(p);
  }

  // Benefit list paragraphs
  benefitParagraphs.forEach((para) => {
    const p = document.createElement('p');
    p.innerHTML = para.innerHTML;
    textFrag.appendChild(p);
  });

  // CTA button
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    p.appendChild(a);
    textFrag.appendChild(p);
  }

  const cells = [];
  if (bgImage) {
    cells.push([imageFrag]);
  }
  cells.push([textFrag]);

  const block = createBlockHelper(document, { name: 'hero-subscription', cells });
  element.replaceWith(block);
}
