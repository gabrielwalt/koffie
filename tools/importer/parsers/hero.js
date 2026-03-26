/* eslint-disable */
/* global WebImporter */
import { createBlockHelper } from './utils.js';
/**
 * Parser for hero block.
 * Base: hero. Source: koffievoordeel.nl hero banner containers.
 *
 * UE Model fields: image (reference), imageAlt (collapsed), text (richtext)
 * Target: Hero table with 2 rows:
 *   Row 1: Background image (field: image)
 *   Row 2: Text content - heading + subheading (field: text)
 *
 * Source DOM: Hero container (e.g. .header-banner-illy, generic banner div) contains:
 *   - img (background/hero image)
 *   - h1/h2 heading (main heading)
 *   - h2/h3 subheading (optional)
 */

export default function parse(element, { document }) {
  // Find the hero image — try common patterns: direct img, picture/figure, wrapper divs
  const bgImg = element.querySelector(':scope > img, :scope > a > img, picture img, figure img, .image-wrapper img, [class*="image"] img, [class*="banner"] img');

  // Find heading text — prefer h1 > h2, look inside text wrapper divs or directly
  const heading = element.querySelector('h1, h2');
  const subheading = heading
    ? element.querySelector(`${heading.tagName === 'H1' ? 'h2' : 'h3'}`)
    : null;

  const cells = [];

  // Row 1: Background image
  if (bgImg) {
    const imgFrag = document.createDocumentFragment();
    imgFrag.appendChild(document.createComment(' field:image '));
    // Clone the image to preserve it
    const imgClone = bgImg.cloneNode(true);
    imgFrag.appendChild(imgClone);
    cells.push([imgFrag]);
  }

  // Row 2: Text content (heading + optional subheading)
  const textFrag = document.createDocumentFragment();
  textFrag.appendChild(document.createComment(' field:text '));
  if (heading) {
    const h = heading.cloneNode(true);
    textFrag.appendChild(h);
  }
  if (subheading) {
    const sh = subheading.cloneNode(true);
    textFrag.appendChild(sh);
  }
  cells.push([textFrag]);

  const block = createBlockHelper(document, { name: 'hero', cells });
  element.replaceWith(block);
}
