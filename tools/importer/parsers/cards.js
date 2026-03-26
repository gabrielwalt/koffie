/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards block.
 * Base: cards. Source: koffievoordeel.nl slick-slider carousel (brand landing GMI cards).
 *
 * UE Model (cards-card): image (reference), text (richtext)
 * Target: Cards table with 2 columns per row (image | text), one row per card.
 *
 * Source DOM: .slick-slider > .slick-list > .slick-track > .slick-slide (each = 1 card)
 *   Each card contains:
 *     - figure > a? > .image-wrapper > img (card image)
 *     - h5 (card title)
 *     - div > p (card description)
 *     - div > a.pagebuilder-button-link (CTA button)
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
  // Find all slide items (cards)
  let slides = Array.from(element.querySelectorAll('.slick-slide'));
  if (slides.length === 0) {
    // Fallback: direct column children
    slides = Array.from(element.querySelectorAll('.pagebuilder-column'));
  }

  // Filter out cloned slides (Slick duplicates for infinite scroll)
  slides = slides.filter((s) => !s.classList.contains('slick-cloned'));

  if (slides.length === 0) return;

  const cells = [];

  slides.forEach((slide) => {
    // Image cell
    const img = slide.querySelector('figure img, .image-wrapper img, picture img, img');
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    if (img) {
      // Use only one image (skip mobile duplicates)
      const imgClone = img.cloneNode(true);
      imgFrag.appendChild(imgClone);
    }

    // Text cell: title + description + CTA
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));

    const title = slide.querySelector('h5, h4, h3, h2');
    if (title) {
      const titleEl = title.cloneNode(true);
      textFrag.appendChild(titleEl);
    }

    // Description paragraphs
    const descParas = slide.querySelectorAll(':scope > div > p, :scope > div > div > p');
    descParas.forEach((p) => {
      if (p.textContent.trim()) {
        textFrag.appendChild(p.cloneNode(true));
      }
    });

    // CTA link
    const cta = slide.querySelector('a.pagebuilder-button-link, a[class*="button"]');
    if (cta) {
      const ctaClone = cta.cloneNode(true);
      textFrag.appendChild(ctaClone);
    }

    cells.push([imgFrag, textFrag]);
  });

  const block = createBlockHelper(document, { name: 'cards', cells });
  element.replaceWith(block);
}
