(() => {
  function ensureLightbox(){
    let el = document.querySelector('.lightbox');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = `
      <div class="backdrop" aria-hidden="true"></div>
      <div class="panel" role="dialog" aria-modal="true" aria-label="Evidence preview">
        <button class="close" type="button" aria-label="Close">Esc</button>
        <img alt="Evidence preview" />
        <div class="caption"></div>
      </div>
    `;
    document.body.appendChild(el);

    const close = () => el.classList.remove('open');
    el.querySelector('.backdrop').addEventListener('click', close);
    el.querySelector('.close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    return el;
  }

  function openLightbox(imgEl){
    const lb = ensureLightbox();
    const panelImg = lb.querySelector('img');
    const caption = lb.querySelector('.caption');

    const fig = imgEl.closest('figure');
    const cap = fig ? fig.querySelector('figcaption') : null;
    caption.textContent = cap ? cap.innerText.trim() : '';

    panelImg.src = imgEl.getAttribute('src');
    panelImg.alt = imgEl.getAttribute('alt') || 'Evidence image';
    lb.classList.add('open');
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('figure.evidence-item img');
    if (!img) return;
    e.preventDefault();
    openLightbox(img);
  });
})();
