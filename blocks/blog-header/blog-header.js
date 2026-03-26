import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const row = block.querySelector(':scope > div');
  const cell = row?.querySelector(':scope > div');
  if (!cell) return;

  const h1 = cell.querySelector('h1');
  const paragraphs = [...cell.querySelectorAll('p')];

  const wrapper = document.createElement('div');
  wrapper.className = 'blog-header-content';

  // Category tag (first paragraph)
  if (paragraphs[0]) {
    const cat = document.createElement('p');
    cat.className = 'blog-header-category';
    cat.textContent = paragraphs[0].textContent.trim();
    wrapper.append(cat);
  }

  // Title
  if (h1) {
    moveInstrumentation(h1, h1);
    wrapper.append(h1);
  }

  // Author + date meta line
  const author = paragraphs[1]?.textContent.trim() || '';
  const date = paragraphs[2]?.textContent.trim() || '';
  if (author || date) {
    const meta = document.createElement('p');
    meta.className = 'blog-header-meta';
    const parts = [];
    if (author) parts.push(`Geplaatst door: ${author}`);
    if (date) parts.push(`op ${date}`);
    meta.textContent = parts.join(' ');
    wrapper.append(meta);
  }

  block.textContent = '';
  block.append(wrapper);

  // Add template-blog class to body for page-level styling
  document.body.classList.add('template-blog');
}
