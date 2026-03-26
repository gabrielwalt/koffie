/* eslint-disable */
/* global WebImporter */
import { createBlockHelper } from './utils.js';
/**
 * Parser for embed block.
 * Base: embed. Source: koffievoordeel.nl pagebuilder-video-container with Vimeo iframes.
 *
 * Source DOM: .pagebuilder-video-container > iframe[src*="vimeo"]
 * Target: Embed table with single cell containing a link to the Vimeo video URL.
 * The embed block JS detects Vimeo URLs and renders the appropriate player.
 */


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
