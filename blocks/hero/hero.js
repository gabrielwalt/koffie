export default function decorate(block) {
  // Block rows: [image], [text]
  // Restructure: image → background <picture>, text → overlay content
  const [imageRow, textRow] = [...block.children];

  const img = imageRow?.querySelector('img');
  if (img) {
    const picture = document.createElement('picture');
    picture.appendChild(img);
    block.prepend(picture);
  }
  if (imageRow) imageRow.remove();

  // Unwrap text content from row/cell wrapper divs
  if (textRow) {
    const cell = textRow.querySelector(':scope > div');
    if (cell) {
      while (cell.firstChild) {
        block.appendChild(cell.firstChild);
      }
    }
    textRow.remove();
  }
}
