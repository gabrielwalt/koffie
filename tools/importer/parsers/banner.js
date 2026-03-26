/* eslint-disable */
/* global WebImporter */
import { createBlockHelper } from './utils.js';

/**
 * Parser for banner (art direction).
 * Source: https://www.koffievoordeel.nl/abonnement
 * Model fields: imageDesktop (reference), imageMobile (reference)
 * Single-row block with two image cells for responsive breakpoints.
 * Source selector: .column.main img[src*="1440x450_desk"]
 * Both desktop and mobile images are inside the same <figure>.
 */


export default function parse(element, { document }) {
  if (!element.parentElement) return;

  // element = img with src*="1440x450_desk"
  // Both desk and mob images are inside the same <figure>
  const figure = element.closest('figure') || element.parentElement;

  // Find desktop and mobile images
  let desktopImg = null;
  let mobileImg = null;
  const allImgs = figure.querySelectorAll('img');
  allImgs.forEach((img) => {
    const src = img.src || img.getAttribute('data-src') || '';
    if (src.includes('desk')) desktopImg = img;
    else if (src.includes('mob')) mobileImg = img;
  });

  // Fallback: the matched element itself is the desktop image
  if (!desktopImg) desktopImg = element;

  const cells = [];

  // Row 1: Desktop image
  if (desktopImg) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' field:imageDesktop '));
    const img = document.createElement('img');
    img.src = desktopImg.src || desktopImg.getAttribute('data-src') || '';
    img.alt = desktopImg.alt || '';
    frag.appendChild(img);
    cells.push([frag]);
  }

  // Row 2: Mobile image
  if (mobileImg) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' field:imageMobile '));
    const img = document.createElement('img');
    img.src = mobileImg.src || mobileImg.getAttribute('data-src') || '';
    img.alt = mobileImg.alt || '';
    frag.appendChild(img);
    cells.push([frag]);
  }

  if (cells.length === 0) return;

  const block = createBlockHelper(document, { name: 'banner', cells });

  // Replace the figure containing both images with the block
  figure.replaceWith(block);
}
