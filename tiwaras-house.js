/* ── SITE JS ── */
window.addEventListener('scroll', function(){
  document.getElementById('mainNav').classList.toggle('scrolled', window.scrollY > 60);
});

function toggleMenu(){
  var l=document.querySelector('.nav-links'),o=l.style.display==='flex';
  l.style.display=o?'none':'flex';
  if(!o){Object.assign(l.style,{flexDirection:'column',position:'absolute',top:'60px',left:'0',right:'0',background:'var(--cream)',padding:'1.5rem 2rem',gap:'1.25rem',boxShadow:'0 8px 24px rgba(0,0,0,0.08)',zIndex:'300'});}
}

document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    var id=this.getAttribute('href').substring(1);
    if(!id) return;
    var el=document.getElementById(id);
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'});}
  });
});

var faders=document.querySelectorAll('.fade-in');
var io=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}
  });
},{threshold:0.12});
faders.forEach(function(f){io.observe(f);});

var tIdx=0;
function goTo(i){
  document.querySelectorAll('.testimonial').forEach(function(t,j){
    t.classList.toggle('active',j===i);
    t.style.position=j===i?'relative':'absolute';
  });
  document.querySelectorAll('.t-dot').forEach(function(d,j){d.classList.toggle('active',j===i);});
  tIdx=i;
}
setInterval(function(){goTo((tIdx+1)%3);},5000);

/* ══════════════════════════════════
   BOOKING PAGE DATA & LOGIC
══════════════════════════════════ */
var CATS = {
  braids: {
    name: 'Braids & Protective Styles',
    styles: [
      {id:'knotless',  name:'Knotless Braids',    price:'from £130', base:130, dur:'4–6h',   bg:'radial-gradient(ellipse at 50% 25%, #4A2200, #1A0A00, #060301)'},
      {id:'box',       name:'Box Braids',          price:'from £100', base:100, dur:'4–5h',   bg:'radial-gradient(ellipse at 50% 25%, #3D1800, #160700, #040201)'},
      {id:'fulani',    name:'Fulani Braids',        price:'from £110', base:110, dur:'3–4h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1800, #0E0700, #030201)'},
      {id:'cornrows',  name:'Cornrows',             price:'from £60',  base:60,  dur:'1.5–3h', bg:'radial-gradient(ellipse at 50% 25%, #1A3020, #081509, #020604)'},
      {id:'feedin',    name:'Feed-In Braids',       price:'from £80',  base:80,  dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #381A00, #140800, #040201)'},
      {id:'stitch',    name:'Stitch Braids',        price:'from £90',  base:90,  dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1200, #0E0600, #030200)'},
    ],
    hasSize:true, hasLength:true
  },
  wigs: {
    name: 'Wig Installs',
    styles: [
      {id:'lacefront', name:'Lace Front Install',   price:'from £120', base:120, dur:'2–3h',    bg:'radial-gradient(ellipse at 50% 25%, #0A2820, #041408, #010603)'},
      {id:'fulllace',  name:'Full Lace Install',    price:'from £150', base:150, dur:'2.5–3.5h', bg:'radial-gradient(ellipse at 50% 25%, #0D3025, #050F09, #010503)'},
      {id:'360',       name:'360 Wig Install',      price:'from £140', base:140, dur:'2–3h',    bg:'radial-gradient(ellipse at 50% 25%, #1A3020, #080E09, #020403)'},
      {id:'custom',    name:'Wig Customisation',    price:'from £80',  base:80,  dur:'1.5–2.5h', bg:'radial-gradient(ellipse at 50% 25%, #101D18, #06100A, #020503)'},
    ],
    hasSize:false, hasLength:true
  },
  natural: {
    name: 'Natural Hair Care',
    styles: [
      {id:'washstyle', name:'Wash & Style',  price:'from £55', base:55, dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #3A2808, #140E03, #040301)'},
      {id:'blowout',   name:'Blowout',       price:'from £65', base:65, dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #4A3010, #1A1005, #050301)'},
      {id:'twistout',  name:'Twist Out',     price:'from £70', base:70, dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1808, #0E0803, #030201)'},
      {id:'silkpress', name:'Silk Press',    price:'from £85', base:85, dur:'3–4h',   bg:'radial-gradient(ellipse at 50% 25%, #3A2000, #150C00, #040200)'},
    ],
    hasSize:false, hasLength:true
  },
  locs: {
    name: 'Locs & Twists',
    styles: [
      {id:'starterlocs', name:'Starter Locs',        price:'from £150', base:150, dur:'4–7h',   bg:'radial-gradient(ellipse at 50% 25%, #1A2A10, #080E06, #020402)'},
      {id:'twostrand',   name:'Two-Strand Twists',   price:'from £90',  base:90,  dur:'3–5h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1808, #100800, #030200)'},
      {id:'senegalese',  name:'Senegalese Twists',   price:'from £110', base:110, dur:'3–5h',   bg:'radial-gradient(ellipse at 50% 25%, #3A2010, #150C04, #040201)'},
      {id:'marley',      name:'Marley Twists',       price:'from £120', base:120, dur:'4–6h',   bg:'radial-gradient(ellipse at 50% 25%, #281808, #0E0A03, #030200)'},
      {id:'retwist',     name:'Loc Retwist',         price:'from £60',  base:60,  dur:'1.5–3h', bg:'radial-gradient(ellipse at 50% 25%, #141E0C, #080B05, #020301)'},
    ],
    hasSize:true, hasLength:true
  },
  treatments: {
    name: 'Treatments',
    styles: [
      {id:'deepcond', name:'Deep Conditioning', price:'from £45', base:45, dur:'1–1.5h', bg:'radial-gradient(ellipse at 50% 25%, #1A1808, #0A0A04, #030302)'},
      {id:'scalp',    name:'Scalp Treatment',   price:'from £35', base:35, dur:'45min',  bg:'radial-gradient(ellipse at 50% 25%, #1A2010, #0A0E08, #020402)'},
      {id:'protein',  name:'Protein Treatment', price:'from £55', base:55, dur:'1.5–2h', bg:'radial-gradient(ellipse at 50% 25%, #2A1808, #100A04, #030200)'},
      {id:'hotoil',   name:'Hot Oil Treatment', price:'from £30', base:30, dur:'45min',  bg:'radial-gradient(ellipse at 50% 25%, #1A1408, #0A0804, #020200)'},
    ],
    hasSize:false, hasLength:false
  }
};

var COLOURS = {
  '1b':      {name:'1B Natural Black',  glow:'rgba(38,22,8,0.95)',    strand:'#2A1A0A'},
  '4':       {name:'4 Dark Brown',      glow:'rgba(80,42,8,0.9)',     strand:'#5A3010'},
  '30':      {name:'30 Auburn',         glow:'rgba(140,62,15,0.85)',  strand:'#9A5020'},
  '27':      {name:'27 Honey Blonde',   glow:'rgba(180,115,30,0.75)', strand:'#C08030'},
  '613':     {name:'613 Platinum',      glow:'rgba(200,175,60,0.65)', strand:'#C8A840'},
  'ombre':   {name:'Ombre',             glow:'rgba(100,50,15,0.8)',   strand:'#7A4018'},
  'burgundy':{name:'Burgundy',          glow:'rgba(110,16,16,0.9)',   strand:'#6A1010'},
};

var LENGTHS = ['Short (10–12")', 'Medium (14–18")', 'Long (20–24")', 'XL (26–30")'];

var STRAND_CONFIGS = {
  knotless:    {count:8,  gap:65,  amp:14, w:5,  phase:8},
  box:         {count:5,  gap:100, amp:20, w:11, phase:0},
  fulani:      {count:7,  gap:72,  amp:16, w:7,  phase:10},
  cornrows:    {count:10, gap:52,  amp:7,  w:3,  phase:0},
  feedin:      {count:7,  gap:72,  amp:14, w:6,  phase:8},
  stitch:      {count:9,  gap:58,  amp:10, w:4,  phase:5},
  lacefront:   {count:4,  gap:130, amp:28, w:16, phase:0},
  fulllace:    {count:5,  gap:105, amp:26, w:14, phase:10},
  '360':       {count:5,  gap:105, amp:24, w:13, phase:5},
  custom:      {count:4,  gap:130, amp:28, w:16, phase:15},
  washstyle:   {count:5,  gap:105, amp:24, w:10, phase:0},
  blowout:     {count:4,  gap:130, amp:34, w:12, phase:0},
  twistout:    {count:6,  gap:85,  amp:20, w:9,  phase:0},
  silkpress:   {count:4,  gap:130, amp:28, w:10, phase:5},
  starterlocs: {count:5,  gap:105, amp:20, w:15, phase:0},
  twostrand:   {count:6,  gap:85,  amp:22, w:11, phase:0},
  senegalese:  {count:6,  gap:85,  amp:18, w:9,  phase:10},
  marley:      {count:5,  gap:105, amp:22, w:13, phase:0},
  retwist:     {count:5,  gap:105, amp:18, w:13, phase:5},
  deepcond:    {count:3,  gap:175, amp:32, w:20, phase:0},
  scalp:       {count:3,  gap:175, amp:28, w:18, phase:10},
  protein:     {count:3,  gap:175, amp:32, w:20, phase:5},
  hotoil:      {count:3,  gap:175, amp:28, w:18, phase:0},
};

/* State */
var bpCurrentCat   = 'braids';
var bpCurrentStep  = 0;
var bpSelectedStyle  = null;
var bpSelectedColour = '1b';
var bpSelectedLength = 1;
var bpSelectedSize   = 'Medium';
var TOTAL_STEPS = 6;

function openBooking(cat) {
  bpCurrentCat     = cat || 'braids';
  bpCurrentStep    = 0;
  bpSelectedStyle  = null;
  bpSelectedColour = '1b';
  bpSelectedLength = 1;
  document.getElementById('bpCatName').textContent = CATS[cat].name;
  buildStyleGrid();
  updateStepDots();
  showBpStep(0);
  updateImagePanel(null, '1b', 1);
  document.getElementById('bookingPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  var cat_data = CATS[bpCurrentCat];
  document.getElementById('bpLengthGroup').style.display = cat_data.hasLength ? '' : 'none';
  document.getElementById('bpSizeGroup').style.display   = cat_data.hasSize   ? '' : 'none';
}

function closeBooking() {
  document.getElementById('bookingPage').classList.remove('open');
  document.body.style.overflow = '';
}

function buildStyleGrid() {
  var styles = CATS[bpCurrentCat].styles;
  var grid = document.getElementById('bpStylesGrid');
  document.getElementById('bpStyleTitle').textContent = 'Choose your style';
  document.getElementById('bpStyleSub').textContent = CATS[bpCurrentCat].name + ' — select one to continue';
  grid.innerHTML = styles.map(function(s) {
    return '<div class="bp-style-card" id="sc-' + s.id + '" onclick="selectStyle(\'' + s.id + '\',this)">'
      + '<div class="bp-style-img" style="' + s.bg + '"></div>'
      + '<div class="bp-style-body">'
      + '<span class="bp-style-name">' + s.name + '</span>'
      + '<span class="bp-style-meta"><span class="bp-style-price">' + s.price + '</span> · ' + s.dur + '</span>'
      + '</div></div>';
  }).join('');
}

function selectStyle(id, el) {
  bpSelectedStyle = id;
  document.querySelectorAll('.bp-style-card').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  var s = CATS[bpCurrentCat].styles.find(function(x){ return x.id === id; });
  if (s) {
    document.getElementById('bpImgStyle').textContent = s.name;
    document.getElementById('bpImgPrice').textContent = s.price;
  }
  updateImagePanel(id, bpSelectedColour, bpSelectedLength);
}

function selectLen(idx, el) {
  bpSelectedLength = idx;
  document.querySelectorAll('.bp-len-opt').forEach(function(o){ o.classList.remove('sel'); });
  el.classList.add('sel');
  updateImagePanel(bpSelectedStyle, bpSelectedColour, idx);
  updateLengthBar(idx);
}

function selectColour(id, el) {
  bpSelectedColour = id;
  document.querySelectorAll('.bp-swatch').forEach(function(s){ s.classList.remove('sel'); });
  el.classList.add('sel');
  updateImagePanel(bpSelectedStyle, bpSelectedColour, bpSelectedLength);
  document.getElementById('bpImgMeta').textContent = COLOURS[id].name + ' · ' + LENGTHS[bpSelectedLength] + ' · Tiwara\'s House';
}

function selectSize(el) {
  bpSelectedSize = el.textContent.trim();
  document.querySelectorAll('.bp-size-opt').forEach(function(o){ o.classList.remove('sel'); });
  el.classList.add('sel');
}

function updateImagePanel(styleId, colourId, lenIdx) {
  var glow = document.getElementById('bpGlow');
  var svg  = document.getElementById('bpStrandSvg');
  var col  = COLOURS[colourId] || COLOURS['1b'];

  glow.style.background = 'radial-gradient(ellipse at center, ' + col.glow + ' 0%, transparent 70%)';

  var cfg = STRAND_CONFIGS[styleId] || STRAND_CONFIGS['knotless'];
  var paths = '';
  for (var i = 0; i < cfg.count; i++) {
    var x  = 30 + i * cfg.gap;
    var a  = cfg.amp;
    var ph = (i % 2 === 0) ? 0 : cfg.phase;
    var d  = 'M' + x + ',' + (-ph);
    for (var y = 120; y <= 1000; y += 120) {
      var dir = (Math.floor(y / 120) % 2 === 0) ? 1 : -1;
      var cx  = x + dir * a;
      d += ' C' + cx + ',' + (y - 90) + ' ' + cx + ',' + (y - 30) + ' ' + x + ',' + y;
    }
    var op = 0.35 + (i % 3) * 0.12;
    paths += '<path d="' + d + '" stroke="' + col.strand + '" stroke-width="' + cfg.w + '" fill="none" stroke-linecap="round" opacity="' + op + '"/>';
  }
  svg.innerHTML = paths;

  var style_name = bpSelectedStyle ? (CATS[bpCurrentCat].styles.find(function(s){ return s.id === bpSelectedStyle; }) || {}).name || '' : '';
  if (style_name) document.getElementById('bpImgStyle').textContent = style_name;
  document.getElementById('bpImgMeta').textContent = col.name + ' · ' + LENGTHS[lenIdx] + ' · Tiwara\'s House';
  updateLengthBar(lenIdx);
}

function updateLengthBar(idx) {
  document.querySelectorAll('.bp-lbar-item').forEach(function(b, i){ b.classList.toggle('active', i <= idx); });
}

function calcTotal() {
  var base = 130;
  if (bpSelectedStyle) {
    var s = CATS[bpCurrentCat].styles.find(function(x){ return x.id === bpSelectedStyle; });
    if (s) base = s.base;
  }
  var addon = 0;
  document.querySelectorAll('#bpStep1 input[type=checkbox]:checked').forEach(function(c){
    var txt = c.closest('.bp-addon').querySelector('.bp-addon-price').textContent;
    addon += parseInt(txt.replace(/\D/g,''));
  });
  var total   = base + addon;
  var deposit = Math.round(total * 0.25 * 100) / 100;
  document.getElementById('sum-total').textContent   = '£' + total;
  document.getElementById('sum-deposit').textContent = '£' + deposit.toFixed(2);
  document.getElementById('sum-balance').textContent = '£' + (total - deposit).toFixed(2);
}

function populateSummary() {
  var styleName = bpSelectedStyle
    ? (CATS[bpCurrentCat].styles.find(function(s){ return s.id === bpSelectedStyle; }) || {}).name || '—'
    : '—';
  document.getElementById('sum-service').textContent = styleName;
  document.getElementById('sum-colour').textContent  = COLOURS[bpSelectedColour].name;
  document.getElementById('sum-length').textContent  = LENGTHS[bpSelectedLength];
  document.getElementById('sum-size').textContent    = bpSelectedSize;
  document.getElementById('conf-service').textContent = styleName + ' — ' + COLOURS[bpSelectedColour].name + ', ' + bpSelectedSize + ', ' + LENGTHS[bpSelectedLength];
  calcTotal();
}

function showBpStep(n) {
  for (var i = 0; i < TOTAL_STEPS; i++) {
    var p = document.getElementById('bpStep' + i);
    if (p) p.classList.toggle('active', i === n);
  }
  bpCurrentStep = n;
  updateStepDots();
  document.getElementById('bpOptions').scrollTop = 0;
}

function bpNext() {
  if (bpCurrentStep === 0 && !bpSelectedStyle) {
    var firstStyle = CATS[bpCurrentCat].styles[0];
    if (firstStyle) {
      var el = document.getElementById('sc-' + firstStyle.id);
      if (el) selectStyle(firstStyle.id, el);
    }
  }
  if (bpCurrentStep === 4) { populateSummary(); }
  showBpStep(Math.min(TOTAL_STEPS - 1, bpCurrentStep + 1));
}

function bpPrev() {
  showBpStep(Math.max(0, bpCurrentStep - 1));
}

function updateStepDots() {
  var container = document.getElementById('bpStepDots');
  var html = '';
  for (var i = 0; i < TOTAL_STEPS; i++) {
    var cls = i < bpCurrentStep ? 'done' : (i === bpCurrentStep ? 'active' : '');
    html += '<div class="bp-step-dot ' + cls + '"></div>';
  }
  container.innerHTML = html;
}

function selDay(el) {
  document.querySelectorAll('.bp-cal-d').forEach(function(d){ d.classList.remove('sel-day'); });
  el.classList.add('sel-day');
}

function selTime(el) {
  document.querySelectorAll('.bp-time:not(.taken)').forEach(function(t){ t.classList.remove('sel-t'); });
  el.classList.add('sel-t');
}

document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeBooking(); });
