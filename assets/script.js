/* ================= top bar: hamburger overlay =================
   The top bar itself is now purely CSS/width-driven (see style.css) — no
   scroll listener resizes it anymore, since that was the source of the
   flicker on scroll. Only the hamburger open/close needs JS. */
(function(){
  const topbar = document.getElementById('topbar');
  const navToggle = document.getElementById('navToggle');
  const overlay = document.getElementById('tbOverlay');
  if(!topbar || !navToggle || !overlay) return;
  navToggle.addEventListener('click', ()=>{
    const isOpen = topbar.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  overlay.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=>{
      topbar.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', (e)=>{
    if(topbar.classList.contains('nav-open') && !topbar.contains(e.target)){
      topbar.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ================= active nav link: driven by current page, not scroll ================= */
/* Each page's <body> has data-page="home|writeups|research|notes|projects|about|contact".
   Both the top bar nav and the overlay nav share the same data-page links, so this
   deterministically highlights the right link in both, on every page. */
const currentPage = document.body.dataset.page;
document.querySelectorAll('.tb-nav a, .tb-overlay-nav a').forEach(link=>{
  link.classList.toggle('active', link.dataset.page === currentPage);
});

/* ================= session uptime ================= */
document.querySelectorAll('.uptime-target').forEach(uptimeEl=>{
  const start = Date.now();
  const pad = n => String(n).padStart(2,'0');
  function tickUptime(){
    const s = Math.floor((Date.now()-start)/1000);
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    uptimeEl.textContent = `session uptime — ${pad(h)}:${pad(m)}:${pad(sec)}`;
  }
  setInterval(tickUptime, 1000); tickUptime();
});

/* ================= footer clock ================= */
const clockEl = document.getElementById('clock');
if(clockEl){
  function tickClock(){ clockEl.textContent = new Date().toLocaleTimeString('en-GB'); }
  setInterval(tickClock, 1000); tickClock();
}

/* ================= hero typewriter (home page) ================= */
const typeTarget = document.getElementById('typeTarget');
if(typeTarget){
  const phrases = [
    'red team engagement notes',
    'blue team detection writeups',
    'security research & disclosures',
    'open source contributions',
    'certification study notes',
  ];
  let pIdx=0, cIdx=0, deleting=false;
  function typeLoop(){
    const current = phrases[pIdx];
    if(!deleting){
      cIdx++;
      typeTarget.textContent = current.slice(0,cIdx);
      if(cIdx === current.length){ deleting = true; setTimeout(typeLoop, 1400); return; }
    } else {
      cIdx--;
      typeTarget.textContent = current.slice(0,cIdx);
      if(cIdx === 0){ deleting = false; pIdx = (pIdx+1) % phrases.length; }
    }
    setTimeout(typeLoop, deleting ? 28 : 48);
  }
  typeLoop();
}

/* ================= smoke canvas (home page hero) ================= */
(function(){
  const canvas = document.getElementById('smoke-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('hero');
  let W,H, particles=[], running=true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){ W = canvas.width = hero.offsetWidth; H = canvas.height = hero.offsetHeight; }
  window.addEventListener('resize', resize);
  resize();

  function makeParticle(atBottom){
    return {
      x: Math.random()*W,
      y: atBottom ? H + Math.random()*80 : Math.random()*H,
      r: 40 + Math.random()*120,
      vy: -(0.15 + Math.random()*0.35),
      vx: (Math.random()-0.5)*0.15,
      alpha: 0.02 + Math.random()*0.05,
      drift: Math.random()*Math.PI*2,
      driftSpeed: 0.002 + Math.random()*0.004,
    };
  }
  const COUNT = reduceMotion ? 0 : 26;
  for(let i=0;i<COUNT;i++) particles.push(makeParticle(false));

  function draw(){
    if(!running) return;
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';
    for(const p of particles){
      p.y += p.vy;
      p.drift += p.driftSpeed;
      p.x += p.vx + Math.sin(p.drift)*0.3;
      if(p.y < -p.r){ Object.assign(p, makeParticle(true)); }
      const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
      grad.addColorStop(0, `rgba(245,245,244,${p.alpha})`);
      grad.addColorStop(1, `rgba(245,245,244,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }
  draw();

  const heroObserver = new IntersectionObserver((entries)=>{
    running = entries[0].isIntersecting;
    if(running) draw();
  });
  heroObserver.observe(hero);
})();

/* ================= generic local search (writeups / research / notes / projects) =================
   One small reusable filter over whatever items/groups exist on the current page.
   Every section page uses the same search-row markup and calls this with its own
   element ids, so the interaction is identical everywhere. */
function setupLocalSearch({inputId, itemSelector, groupSelector, countId, noResultsId}){
  const input = document.getElementById(inputId);
  if(!input) return;
  const items = Array.from(document.querySelectorAll(itemSelector));
  const groups = groupSelector ? Array.from(document.querySelectorAll(groupSelector)) : [];
  const countEl = document.getElementById(countId);
  const noResults = document.getElementById(noResultsId);

  function run(){
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    items.forEach(item=>{
      const match = q === '' || item.textContent.toLowerCase().includes(q);
      item.classList.toggle('is-hidden', !match);
      if(match) visible++;
    });
    groups.forEach(group=>{
      const anyVisible = group.querySelectorAll(`${itemSelector}:not(.is-hidden)`).length > 0;
      group.style.display = anyVisible ? '' : 'none';
    });
    if(countEl) countEl.textContent = q === '' ? `${items.length} total` : `${visible} match${visible===1?'':'es'}`;
    if(noResults) noResults.classList.toggle('show', visible === 0);
  }
  input.addEventListener('input', run);
  run();
}

setupLocalSearch({inputId:'wuSearch', itemSelector:'.wu-item', groupSelector:'.wu-group', countId:'searchCount', noResultsId:'noResults'});
setupLocalSearch({inputId:'researchSearch', itemSelector:'.r-item', groupSelector:null, countId:'researchCount', noResultsId:'researchNoResults'});
setupLocalSearch({inputId:'notesSearch', itemSelector:'.wu-item', groupSelector:'.wu-group', countId:'notesCount', noResultsId:'notesNoResults'});
setupLocalSearch({inputId:'projSearch', itemSelector:'.proj', groupSelector:null, countId:'projCount', noResultsId:'projNoResults'});

/* ================= sitewide search (top bar, every page) =================
   Filters the shared SITE_INDEX dataset (assets/search-data.js) across every
   content type at once and renders grouped, linkable results in a dropdown
   panel under the search box. The same widget is wired up twice — once for
   the top bar row, once for the hamburger overlay — since each has its own
   input/panel in the DOM. */
function setupSiteWideSearch(prefix){
  const input = document.getElementById(prefix);
  if(!input || typeof SITE_INDEX === 'undefined') return;
  const resultsEl = document.getElementById(prefix + 'Results');
  const countEl = document.getElementById(prefix + 'Count');
  const noResultsEl = document.getElementById(prefix + 'NoResults');
  const TYPE_LABELS = {writeup:'Writeups', research:'Research', note:'Notes', project:'Projects'};

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render(){
    const q = input.value.trim().toLowerCase();
    if(q === ''){
      resultsEl.innerHTML = '';
      if(countEl) countEl.textContent = `${SITE_INDEX.length} pages indexed`;
      if(noResultsEl) noResultsEl.classList.remove('show');
      return;
    }
    const matches = SITE_INDEX.filter(item=>{
      const haystack = (item.title + ' ' + item.description + ' ' + item.tags.join(' ')).toLowerCase();
      return haystack.includes(q);
    });
    if(countEl) countEl.textContent = `${matches.length} match${matches.length===1?'':'es'}`;
    if(noResultsEl) noResultsEl.classList.toggle('show', matches.length === 0);

    const byType = {};
    matches.forEach(item=>{ (byType[item.type] = byType[item.type] || []).push(item); });

    resultsEl.innerHTML = Object.keys(byType).map(type=>{
      const groupItems = byType[type].map(item => `
        <a class="ss-item" href="${item.url}">
          <span class="ss-title">${escapeHtml(item.title)}</span>
          <span class="ss-desc">${escapeHtml(item.description)}</span>
        </a>`).join('');
      return `<div class="ss-group"><div class="ss-group-title">${TYPE_LABELS[type] || type}</div>${groupItems}</div>`;
    }).join('');
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  render();

  return render;
}

const _topSearchRender = setupSiteWideSearch('topSearch');
setupSiteWideSearch('topSearchOverlay');

/* support a ?q= query string so the WebSite/SearchAction JSON-LD target is real */
(function(){
  const params = new URLSearchParams(window.location.search);
  const initialQ = params.get('q');
  const topInput = document.getElementById('topSearch');
  if(initialQ && topInput){
    topInput.value = initialQ;
    if(_topSearchRender) _topSearchRender();
    topInput.focus();
  }
})();
