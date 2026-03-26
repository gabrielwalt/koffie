import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function isExternal(src) {
  try {
    const url = new URL(src, window.location.href);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function buildPictureFromExternal(desktopSrc, mobileSrc, alt) {
  const picture = document.createElement('picture');

  if (desktopSrc) {
    const source = document.createElement('source');
    source.setAttribute('media', '(min-width: 600px)');
    source.setAttribute('srcset', desktopSrc);
    picture.appendChild(source);
  }

  const img = document.createElement('img');
  img.src = mobileSrc || desktopSrc;
  img.alt = alt || '';
  img.loading = 'eager';
  picture.appendChild(img);

  return picture;
}

export default function decorate(block) {
  const rows = [...block.children];
  const desktopRow = rows[0];
  const mobileRow = rows[1];

  const desktopImg = desktopRow?.querySelector('img');
  const mobileImg = mobileRow?.querySelector('img');

  if (!desktopImg && !mobileImg) return;

  const desktopSrc = desktopImg?.src;
  const mobileSrc = mobileImg?.src;
  const { alt } = mobileImg || desktopImg;
  const useExternal = isExternal(desktopSrc || mobileSrc);

  let picture;
  if (useExternal) {
    picture = buildPictureFromExternal(desktopSrc, mobileSrc, alt);
  } else {
    picture = document.createElement('picture');

    if (desktopImg) {
      const optimized = createOptimizedPicture(desktopImg.src, desktopImg.alt, false, [{ width: '2000' }]);
      const sources = optimized.querySelectorAll('source');
      sources.forEach((source) => {
        source.media = '(min-width: 600px)';
        picture.appendChild(source);
      });
    }

    const fallbackSrc = mobileImg || desktopImg;
    if (fallbackSrc) {
      const optimized = createOptimizedPicture(fallbackSrc.src, fallbackSrc.alt, false, [{ width: '750' }]);
      const img = optimized.querySelector('img');
      if (img) {
        moveInstrumentation(fallbackSrc, img);
        picture.appendChild(img);
      }
    }
  }

  block.textContent = '';
  block.appendChild(picture);
}
