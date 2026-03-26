import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-steps-card-image';
      else div.className = 'cards-steps-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // Extract step numbers from label text (e.g. "1. Kies je koffie" → badge "1." + label)
  ul.querySelectorAll('li').forEach((li) => {
    const bodyDiv = li.querySelector('.cards-steps-card-body:last-child');
    if (!bodyDiv) return;
    const p = bodyDiv.querySelector('p');
    if (!p) return;
    const match = p.textContent.match(/^(\d+\.)\s*(.*)/);
    if (match) {
      const [, num, label] = match;
      const badge = document.createElement('span');
      badge.className = 'cards-steps-badge';
      badge.textContent = num;
      p.textContent = label;
      li.prepend(badge);
    }
  });

  block.textContent = '';
  block.append(ul);
}
