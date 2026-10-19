// Client preview adaptation of the project's React Bits ScrollExpand timing.
// Original component: https://reactbits.dev/r/ScrollExpand-TS-TW.json
const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
  mobileNav.hidden = open;
});
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const hero = document.querySelector('.hero');
if (hero) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  hero.innerHTML = `<div class="scroll-track"><div class="scroll-stage"><div class="scroll-opening"><span class="eyebrow light">STERLYN SUPPLIES · THE KITCHEN COLLECTION</span><h1>Spaces made for<br><em>the way you live.</em></h1><a href="/collections/" class="quiet-link">Explore our collections <span aria-hidden="true">↗</span></a></div><div class="scroll-frame"><img src="/images/kitchen-marble-dusk-v2.webp" alt="Illustrative marble and dark cabinetry kitchen concept" fetchpriority="high"><div class="scroll-scrim"></div><div class="scroll-reveal"><span class="eyebrow light">STYLE · QUALITY · INNOVATION</span><h2>Design begins<br><em>with possibility.</em></h2><a class="button button-light" href="/collections/">Explore kitchens <span aria-hidden="true">↗</span></a></div><span class="image-label">Illustrative design concept</span></div><div class="scroll-emblem" aria-label="Animated official Sterlyn monogram"><div class="logo-canvas" aria-hidden="true"></div><img class="logo-static" src="/images/sterlyn-monogram-preview.svg" alt="Official Sterlyn monogram"></div><div class="scroll-controls"><span>Scroll to step inside <span aria-hidden="true">↓</span></span><div><button class="motion-toggle" type="button" aria-label="Pause logo animation">Pause motion</button></div></div></div></div>`;
  const track = hero.querySelector('.scroll-track');
  const frame = hero.querySelector('.scroll-frame');
  const media = frame.querySelector('img');
  const scrim = hero.querySelector('.scroll-scrim');
  const opening = hero.querySelector('.scroll-opening');
  const reveal = hero.querySelector('.scroll-reveal');
  const emblem = hero.querySelector('.scroll-emblem');
  const motionButton = hero.querySelector('.motion-toggle');
  let current = 0, target = 0, raf = 0, paused = reducedMotion.matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const apply = p => {
    const e = smoothstep(0, 1, p);
    const w = 88 + 12 * e, h = 65 + 35 * e;
    frame.style.clipPath = `inset(${(100-h)/2}% ${(100-w)/2}% ${(100-h)/2}% ${(100-w)/2}% round ${6*(1-e)}px)`;
    media.style.transform = `scale(${1.12-.12*e})`;
    scrim.style.opacity = String(.3*e);
    const out = smoothstep(.35,.85,p), inn = smoothstep(.63,1,p);
    opening.style.opacity = String(1-out);
    opening.style.transform = `translateY(${-35*out}px)`;
    opening.style.pointerEvents = out > .8 ? 'none' : 'auto';
    reveal.style.opacity = String(inn);
    reveal.style.transform = `translateY(${18*(1-inn)}px)`;
    reveal.style.pointerEvents = inn > .8 ? 'auto' : 'none';
    emblem.style.opacity = String(smoothstep(.2,.55,p));
  };
  const read = () => clamp(-track.getBoundingClientRect().top / Math.max(1, innerHeight*.9), 0, 1);
  const tick = () => {
    current += (target-current) * .18;
    if (Math.abs(target-current) < .0004) current = target;
    apply(current);
    raf = current === target ? 0 : requestAnimationFrame(tick);
  };
  const onScroll = () => {
    target = read();
    if (reducedMotion.matches) { current = target; apply(current); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const measure = () => { track.style.height = `${innerHeight * 2.08}px`; onScroll(); };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', measure);
  measure();
  const setPaused = value => {
    paused = value;
    emblem.classList.toggle('motion-paused', paused || reducedMotion.matches);
    motionButton.textContent = paused ? 'Play motion' : 'Pause motion';
    motionButton.setAttribute('aria-label', paused ? 'Play logo animation' : 'Pause logo animation');
    dispatchEvent(new CustomEvent('sterlyn-motion', {detail:{paused}}));
  };
  motionButton.addEventListener('click', () => setPaused(!paused));
  reducedMotion.addEventListener('change', e => setPaused(e.matches));
  setPaused(reducedMotion.matches);
  dispatchEvent(new Event('sterlyn-hero-ready'));
}

const collectionList = document.querySelector('.collection-list');
if (collectionList) {
  const toolbar = document.createElement('div');
  toolbar.className = 'preview-filter';
  toolbar.innerHTML = `<label><span>Find a direction</span><input type="search" aria-label="Search products" placeholder="Search kitchens, materials, details…"></label><label><span>Style</span><select aria-label="Filter by style"><option value="">All styles</option><option>Classic</option><option>Contemporary</option><option>Modern</option></select></label><label><span>Order</span><select aria-label="Sort products"><option value="curated">Curated selection</option><option value="az">Name A–Z</option></select></label><output aria-live="polite"></output>`;
  collectionList.insertBefore(toolbar, collectionList.firstChild);
  const search = toolbar.querySelector('input');
  const style = toolbar.querySelectorAll('select')[0];
  const sort = toolbar.querySelectorAll('select')[1];
  const sections = [...collectionList.querySelectorAll('.category-section')];
  const update = () => {
    let count = 0;
    for (const section of sections) {
      const grid = section.querySelector('.product-grid');
      const cards = [...grid.querySelectorAll('.product-card')];
      if (sort.value === 'az') cards.sort((a,b) => a.dataset.name.localeCompare(b.dataset.name)).forEach(c=>grid.append(c));
      let sectionCount = 0;
      cards.forEach(c => {
        const match = (`${c.dataset.name} ${c.dataset.material} ${c.querySelector('p')?.textContent}`.toLowerCase().includes(search.value.trim().toLowerCase()) && (!style.value || style.value === c.dataset.style));
        c.hidden = !match;
        if (match) sectionCount++;
      });
      section.hidden = sectionCount === 0;
      count += sectionCount;
    }
    toolbar.querySelector('output').textContent = `${count} direction${count === 1 ? '' : 's'}`;
  };
  [search,style,sort].forEach(el => el.addEventListener(el === search ? 'input' : 'change', update));
  update();
}

const detailVisual = document.querySelector('.detail-visual');
if (detailVisual) {
  const button = document.createElement('button');
  button.className = 'zoom-trigger';
  button.type = 'button';
  button.textContent = 'View larger ↗';
  detailVisual.append(button);
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  const full = detailVisual.querySelector('img');
  dialog.innerHTML = `<button type="button" aria-label="Close enlarged image">Close ×</button><img src="${full.getAttribute('src')}" alt="${full.getAttribute('alt')}"><p>Illustrative design concept</p>`;
  document.body.append(dialog);
  button.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
}
