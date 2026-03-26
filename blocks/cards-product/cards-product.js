import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const ICON_MAP = {
  koffiebonen: '/blocks/cards-product/icons/koffiebonen.svg',
  iperespresso: '/blocks/cards-product/icons/iperespresso.svg',
};

function decorateTypeWeight(body) {
  const firstP = body.querySelector('p:first-child');
  if (!firstP) return;
  const text = firstP.textContent.trim();
  if (!text.includes('·')) return;

  const [typePart, weightPart] = text.split('·').map((s) => s.trim());
  const wrapper = document.createElement('div');
  wrapper.className = 'cards-product-type-weight';

  if (typePart) {
    const typeSpan = document.createElement('span');
    typeSpan.className = 'cards-product-type';
    typeSpan.setAttribute('data-type', typePart.toLowerCase());
    const iconSrc = ICON_MAP[typePart.toLowerCase()];
    if (iconSrc) {
      const icon = document.createElement('img');
      icon.src = iconSrc;
      icon.alt = typePart;
      icon.className = 'cards-product-type-icon';
      icon.width = 20;
      icon.height = 20;
      typeSpan.append(icon);
    }
    typeSpan.append(document.createTextNode(typePart));
    wrapper.append(typeSpan);
  }

  if (weightPart) {
    const weightSpan = document.createElement('span');
    weightSpan.className = 'cards-product-weight';
    weightSpan.textContent = weightPart;
    wrapper.append(weightSpan);
  }

  firstP.replaceWith(wrapper);
}

function decorateIntensity(body) {
  const strongEls = body.querySelectorAll('p strong');
  strongEls.forEach((strong) => {
    const match = strong.textContent.match(/Intensiteit\s+(\d+)\/(\d+)/);
    if (!match) return;
    const filled = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const p = strong.closest('p');

    const wrapper = document.createElement('div');
    wrapper.className = 'cards-product-intensity';

    const label = document.createElement('span');
    label.className = 'cards-product-intensity-label';
    label.textContent = filled;
    wrapper.append(label);

    const dots = document.createElement('span');
    dots.className = 'cards-product-intensity-dots';
    for (let i = 0; i < total; i += 1) {
      const dot = document.createElement('span');
      dot.className = i < filled ? 'dot filled' : 'dot';
      dots.append(dot);
    }
    wrapper.append(dots);
    p.replaceWith(wrapper);
  });
}

function decoratePrice(body) {
  const priceParagraphs = body.querySelectorAll('p');
  priceParagraphs.forEach((p) => {
    const del = p.querySelector('del, s');
    const strong = p.querySelector('strong');
    if (!del || !strong) return;

    const oldText = del.textContent.trim().replace(/[^\d,]/g, '');
    const newText = strong.textContent.trim().replace(/[^\d,]/g, '');
    const oldVal = parseFloat(oldText.replace(',', '.'));
    const newVal = parseFloat(newText.replace(',', '.'));

    const wrapper = document.createElement('div');
    wrapper.className = 'cards-product-price';

    const oldSpan = document.createElement('span');
    oldSpan.className = 'cards-product-price-old';
    oldSpan.textContent = del.textContent.trim();
    wrapper.append(oldSpan);

    const newSpan = document.createElement('span');
    newSpan.className = 'cards-product-price-new';
    newSpan.textContent = strong.textContent.trim();
    wrapper.append(newSpan);

    if (oldVal > 0 && newVal > 0) {
      const pct = Math.round((1 - newVal / oldVal) * 100);
      if (pct > 0) {
        const discount = document.createElement('span');
        discount.className = 'cards-product-discount';
        discount.textContent = `Je bespaart ${pct}%`;
        wrapper.append(discount);
      }
    }

    p.replaceWith(wrapper);
  });
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-product-card-image';
      } else {
        div.className = 'cards-product-card-body';
        decorateTypeWeight(div);
        decorateIntensity(div);
        decoratePrice(div);
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
