export default function decorate(block) {
  // Block rows: [logo image], [empty text]
  // Restructure: extract logo as centered content, discard empty row
  const [imageRow] = [...block.children];

  const img = imageRow?.querySelector('img');
  if (img) {
    const picture = document.createElement('picture');
    picture.appendChild(img);
    block.textContent = '';
    block.appendChild(picture);
  }
}
