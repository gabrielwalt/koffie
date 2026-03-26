/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: koffievoordeel sections.
 * Adds section breaks (<hr>) between sections based on template configuration.
 * Runs in afterTransform only, uses payload.template.sections.
 *
 * Uses a multi-strategy approach to find section anchors:
 *   1. Block tables (by header text) — works after parsers replace DOM elements
 *   2. Original section selector — works when DOM structure is preserved
 *   3. Default content selectors — fallback for content-only sections
 */

function findSectionElement(root, selector) {
  if (!selector) return null;
  if (Array.isArray(selector)) {
    for (const sel of selector) {
      try {
        const found = root.querySelector(sel);
        if (found) return found;
      } catch (e) { /* invalid selector */ }
    }
    return null;
  }
  try {
    return root.querySelector(selector);
  } catch (e) {
    return null;
  }
}

/**
 * Create a block table, using WebImporter when available, with manual fallback.
 */
function createBlock(doc, name, cells) {
  if (typeof WebImporter !== 'undefined' && WebImporter.Blocks) {
    return WebImporter.Blocks.createBlock(doc, { name, cells });
  }
  // Manual fallback
  const table = doc.createElement('table');
  const headerRow = doc.createElement('tr');
  const headerCell = doc.createElement('th');
  headerCell.colSpan = 100;
  headerCell.textContent = name;
  headerRow.appendChild(headerCell);
  table.appendChild(headerRow);
  if (cells && typeof cells === 'object' && !Array.isArray(cells)) {
    Object.entries(cells).forEach(([key, value]) => {
      const tr = doc.createElement('tr');
      const tdKey = doc.createElement('td');
      tdKey.textContent = key;
      tr.appendChild(tdKey);
      const tdVal = doc.createElement('td');
      tdVal.textContent = value;
      tr.appendChild(tdVal);
      table.appendChild(tr);
    });
  }
  return table;
}

/**
 * Normalize a block name for comparison: lowercase, hyphens → spaces, collapse whitespace.
 * Handles both kebab-case ("cards-category") and title case ("Cards Category").
 */
function normalizeBlockName(name) {
  return name.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Find a block table by its header text.
 * Parsers create <table> elements where the first row header contains the block name.
 * WebImporter.Blocks.createBlock converts "cards-category" → "Cards Category" in the header,
 * so we normalize both sides for comparison.
 */
function findBlockTable(root, blockName) {
  const normalName = normalizeBlockName(blockName);
  const tables = root.querySelectorAll('table');
  for (const table of tables) {
    const header = table.querySelector('tr:first-child th, tr:first-child td');
    if (header) {
      const headerText = normalizeBlockName(header.textContent);
      if (headerText === normalName) return table;
    }
  }
  return null;
}

/**
 * Find the anchor (first element) of a section using multiple strategies.
 */
function findSectionAnchor(root, section) {
  // Strategy 1: Find a heading by partial text match (headingMatch property)
  // Checked first because sections usually start with their heading, not the block table.
  if (section.headingMatch) {
    const needle = section.headingMatch.toLowerCase();
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const h of headings) {
      if (h.textContent.toLowerCase().includes(needle)) return h;
    }
  }

  // Strategy 2: Find the first block's table
  if (section.blocks && section.blocks.length > 0) {
    for (const blockName of section.blocks) {
      const table = findBlockTable(root, blockName);
      if (table) return table;
    }
  }

  // Strategy 3: Original section selector
  const el = findSectionElement(root, section.selector);
  if (el) return el;

  // Strategy 4: Default content selectors
  if (section.defaultContent) {
    for (const sel of section.defaultContent) {
      const found = findSectionElement(root, sel);
      if (found) return found;
    }
  }

  return null;
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;

  const template = payload && payload.template;
  if (!template || !template.sections || template.sections.length < 2) return;

  const doc = element.ownerDocument || document;
  const sections = template.sections;

  // Collect all anchors first
  const anchors = sections.map((s) => findSectionAnchor(element, s));

  // Resolve anchors: if an anchor is inside a block table, walk up to the table element.
  // This prevents inserting <hr> and section-metadata inside block cells.
  for (let i = 0; i < anchors.length; i++) {
    if (!anchors[i]) continue;
    let el = anchors[i];
    let parent = el.parentElement;
    while (parent && parent !== element) {
      if (parent.tagName === 'TABLE') {
        el = parent;
        break;
      }
      parent = parent.parentElement;
    }
    anchors[i] = el;
  }

  // Deduplicate anchors: if two adjacent sections resolve to the same element,
  // skip the later one to avoid empty sections (consecutive <hr><hr>).
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i] && anchors[i] === anchors[i - 1]) {
      anchors[i] = null;
    }
  }

  // Process forward: for each section boundary, insert hr + optional section-metadata
  for (let i = 1; i < sections.length; i++) {
    if (!anchors[i]) continue;

    // If previous section has a style, add section-metadata before this anchor
    // (placing it at the end of the previous section)
    if (sections[i - 1].style) {
      const metaBlock = createBlock(doc, 'Section Metadata', { style: sections[i - 1].style });
      anchors[i].before(metaBlock);
    }

    // Insert <hr> section break before this section's anchor
    const hr = doc.createElement('hr');
    anchors[i].before(hr);
  }

  // Handle last section's style (section-metadata at the end of the document)
  const lastIdx = sections.length - 1;
  if (sections[lastIdx].style) {
    const metaBlock = createBlock(doc, 'Section Metadata', { style: sections[lastIdx].style });
    element.appendChild(metaBlock);
  }

  // Post-process: remove empty sections.
  // An empty section is a span between two <hr> elements (or between start/end and <hr>)
  // that contains no meaningful content — only whitespace, comments, or section-metadata.
  // Orphaned section-metadata is moved into the preceding section before the <hr> is removed.
  cleanupEmptySections(element);
}

/**
 * Check whether a table element is a Section Metadata block table.
 */
function isSectionMetaTable(node) {
  if (!node || node.tagName !== 'TABLE') return false;
  const header = node.querySelector('tr:first-child th, tr:first-child td');
  return header && normalizeBlockName(header.textContent) === 'section metadata';
}

/**
 * Remove empty sections created by stray <hr> elements.
 * For each section (content between two <hr> elements), if it contains no
 * meaningful content (only whitespace, comments, or section-metadata tables),
 * merge it into the previous section by moving any section-metadata before
 * the <hr> and then removing the <hr>.
 */
function cleanupEmptySections(root) {
  // Find all <hr> elements at any depth and check for empty sections after each
  let changed = true;
  while (changed) {
    changed = false;
    const hrs = Array.from(root.querySelectorAll('hr'));
    for (const hr of hrs) {
      // Walk forward from this <hr> to the next <hr> at the same level (or end of parent)
      const contentNodes = [];
      const metaTables = [];
      let node = hr.nextSibling;
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'HR') break;
          if (isSectionMetaTable(node)) {
            metaTables.push(node);
          } else {
            contentNodes.push(node);
          }
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          contentNodes.push(node);
        }
        node = node.nextSibling;
      }

      if (contentNodes.length === 0) {
        // Section after this <hr> is empty — merge with previous section
        for (const meta of metaTables) {
          hr.before(meta);
        }
        hr.remove();
        changed = true;
        break;
      }
    }
  }
}
