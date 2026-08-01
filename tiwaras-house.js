/* ══════════════════════════════════════════════════════
   TIWARA'S HOUSE — Platform Edition JS
══════════════════════════════════════════════════════ */

/* ── SITE SCROLL / NAV ── */
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

/* ── FADE IN ── */
var faders=document.querySelectorAll('.fade-in');
var io=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}
  });
},{threshold:0.12});
faders.forEach(function(f){io.observe(f);});

/* ── TESTIMONIALS ── */
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


/* ══════════════════════════════════════════════════════
   PLATFORM STYLIST DATA
══════════════════════════════════════════════════════ */
var STYLISTS = [
  {
    id: 'tiwara',
    name: "Tiwara's House",
    city: 'Manchester',
    speciality: 'Knotless Braids Specialist',
    rating: 4.9,
    reviewCount: 127,
    tags: ['braids', 'wigs', 'natural', 'locs', 'treatments'],
    startingPrice: 60,
    nextAvail: 'Thu 10 Jul',
    featured: true,
    flagship: true,
    bio: "Tiwara's House is Manchester's premier destination for Afro hair and beauty. Founded on the belief that the Black community deserves better — better access, better transparency, better experiences. No more hunting through group chats for a reliable name. No more travelling hours for a stylist you can trust. World-class braiding, protective styles, wig installs, and treatments — all with effortless online booking and transparent pricing.",
    topServices: [
      {name:'Knotless Braids', price:'from £130', dur:'4–6h'},
      {name:'Wig Installs',    price:'from £120', dur:'2–3h'},
      {name:'Fulani Braids',   price:'from £110', dur:'3–4h'},
    ],
    catKey: 'braids',
    bg: 'radial-gradient(ellipse at 45% 35%, #3D1A00, #0D0600, #040200)',
    reviews: [
      {author:'Adaeze O.',  service:'Knotless Braids', rating:5, text:"The most seamless booking experience I've ever had with a braider. Tiwara's work is absolutely immaculate."},
      {author:'Simone W.',  service:'Goddess Locs',    rating:5, text:"I've been searching for a braider this good for three years. The clarity on pricing alone changed everything."},
      {author:'Ngozi A.',   service:'Box Braids',      rating:5, text:"Tiwara is a genuine artist. My braids lasted eight weeks. The booking system is brilliant."},
    ],
  },
  {
    id: 'amara',
    name: 'Amara Beauty',
    city: 'London',
    speciality: 'Wig Install & Natural Hair Expert',
    rating: 4.8,
    reviewCount: 89,
    tags: ['wigs', 'natural', 'treatments'],
    startingPrice: 55,
    nextAvail: 'Fri 11 Jul',
    featured: true,
    flagship: false,
    bio: "Amara Beauty is London's go-to studio for flawless wig installs and natural hair care. With over six years of experience working with all textured hair types, Amara brings precision, care, and artistry to every appointment. Every client walks out feeling like the best version of themselves.",
    topServices: [
      {name:'Lace Front Install', price:'from £120', dur:'2–3h'},
      {name:'Full Lace Install',  price:'from £150', dur:'2.5–3.5h'},
      {name:'Wash & Style',       price:'from £55',  dur:'2–3h'},
    ],
    catKey: 'wigs',
    bg: 'radial-gradient(ellipse at 45% 35%, #0A2E1A, #041509, #010603)',
    reviews: [
      {author:'Kezia M.',   service:'Lace Front Install', rating:5, text:"Absolutely flawless. My hairline looked completely natural — I couldn't believe it."},
      {author:'Blessing T.',service:'Wash & Style',       rating:5, text:"Amara really knows textured hair. She took the time to understand my curl pattern and the result was perfect."},
      {author:'Ife O.',     service:'Full Lace Install',  rating:4, text:"Incredible work, very professional. Will definitely be back."},
    ],
  },
  {
    id: 'nia',
    name: 'NaturallyNia',
    city: 'Birmingham',
    speciality: 'Locs & Protective Styles',
    rating: 4.9,
    reviewCount: 63,
    tags: ['locs', 'braids', 'natural'],
    startingPrice: 60,
    nextAvail: 'Sat 12 Jul',
    featured: true,
    flagship: false,
    bio: "NaturallyNia is Birmingham's most loved loc specialist. Nia has spent eight years perfecting starter locs, Senegalese twists, and protective styles for all curl types — 3A through 4C. Every client leaves feeling seen, celebrated, and beautiful.",
    topServices: [
      {name:'Starter Locs',      price:'from £150', dur:'4–7h'},
      {name:'Senegalese Twists', price:'from £110', dur:'3–5h'},
      {name:'Loc Retwist',       price:'from £60',  dur:'1.5–3h'},
    ],
    catKey: 'locs',
    bg: 'radial-gradient(ellipse at 45% 35%, #1A2E10, #080E06, #020402)',
    reviews: [
      {author:'Chidinma A.', service:'Starter Locs',      rating:5, text:"Nia is a true artist. My locs are the most even and neat I've ever had — and she finished ahead of schedule."},
      {author:'Yemi O.',     service:'Senegalese Twists', rating:5, text:"Came out looking absolutely stunning. Nia is meticulous, so kind, and really listens."},
      {author:'Fatima L.',   service:'Loc Retwist',       rating:5, text:"The best retwist I've had in years. My locs felt brand new."},
    ],
  },
  {
    id: 'zee',
    name: 'StylesByZee',
    city: 'Leeds',
    speciality: 'Braids & Colour Specialist',
    rating: 4.7,
    reviewCount: 44,
    tags: ['braids', 'wigs'],
    startingPrice: 80,
    nextAvail: 'Mon 14 Jul',
    featured: true,
    flagship: false,
    bio: "StylesByZee brings a bold, creative edge to protective styling in Leeds. Zee specialises in braids with colour, intricate patterns, and statement looks. Whether you want classic knotless or something entirely your own, Zee delivers.",
    topServices: [
      {name:'Knotless Braids', price:'from £130', dur:'4–6h'},
      {name:'Fulani Braids',   price:'from £110', dur:'3–4h'},
      {name:'Feed-In Braids',  price:'from £80',  dur:'2–3h'},
    ],
    catKey: 'braids',
    bg: 'radial-gradient(ellipse at 45% 35%, #2D1000, #0E0500, #030100)',
    reviews: [
      {author:'Zara K.',   service:'Knotless Braids', rating:5, text:"Zee is incredible with colour. My ombre knotless braids were everything I wanted and more!"},
      {author:'Sade M.',   service:'Fulani Braids',   rating:4, text:"Beautiful work — Zee is really fast and the finish is immaculate."},
      {author:'Nkechi B.', service:'Feed-In Braids',  rating:5, text:"So happy with how they came out. Will definitely be back."},
    ],
  },
];


/* ══════════════════════════════════════════════════════
   SEARCH OVERLAY
══════════════════════════════════════════════════════ */
var activeProfileId = null;

function openSearch(styleFilter) {
  document.getElementById('srStyle').value = styleFilter || '';
  document.getElementById('srLocation').value = '';
  filterStylists();
  document.querySelectorAll('.sr-chip').forEach(function(c){
    c.classList.toggle('active', c.dataset.filter === (styleFilter || ''));
  });
  document.getElementById('searchPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSearch() {
  document.getElementById('searchPage').classList.remove('open');
  document.getElementById('profilePage').classList.remove('open');
  activeProfileId = null;
  document.body.style.overflow = '';
}

function setSrStyle(el, filter) {
  document.getElementById('srStyle').value = filter;
  document.querySelectorAll('.sr-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  filterStylists();
}

function filterStylists() {
  var style = document.getElementById('srStyle').value;
  var loc   = (document.getElementById('srLocation').value || '').toLowerCase().trim();
  var filtered = STYLISTS.filter(function(s){
    var mStyle = !style || s.tags.indexOf(style) !== -1;
    var mLoc   = !loc   || s.city.toLowerCase().indexOf(loc) !== -1;
    return mStyle && mLoc;
  });
  document.getElementById('srCount').textContent = filtered.length + ' stylist' + (filtered.length !== 1 ? 's' : '');
  document.getElementById('srGrid').innerHTML = filtered.length
    ? filtered.map(renderStylistCard).join('')
    : '<div class="sr-empty">No stylists in this area yet.<br><a href="#" onclick="closeSearch();document.querySelector(\'.join-platform\').scrollIntoView({behavior:\'smooth\'});return false;">Be the first to join →</a></div>';
  document.querySelectorAll('.sr-chip').forEach(function(c){
    c.classList.toggle('active', c.dataset.filter === style);
  });
}

function renderStylistCard(s) {
  var stars = '';
  for(var i=0;i<5;i++) stars += i < Math.floor(s.rating) ? '&#9733;' : '&#9734;';
  var topSvc = s.topServices.slice(0,2).map(function(sv){ return sv.name; }).join(' \xb7 ');
  return '<div class="sr-card" onclick="openProfile(\'' + s.id + '\')">'
    + '<div class="sr-card-img" style="background:' + s.bg + ';">'
    + (s.flagship ? '<div class="sr-flagship-badge">✶ Flagship</div>' : '')
    + '</div>'
    + '<div class="sr-card-body">'
    + '<div class="sr-card-top"><div>'
    + '<div class="sr-card-name">' + s.name + '</div>'
    + '<div class="sr-card-city">📍 ' + s.city + '</div>'
    + '</div>'
    + '<div class="sr-card-rating-block"><div class="sr-star-row">' + stars + '</div>'
    + '<div class="sr-rating-num">' + s.rating + ' (' + s.reviewCount + ')</div></div>'
    + '</div>'
    + '<div class="sr-card-spec">' + s.speciality + '</div>'
    + '<div class="sr-card-svcs">' + topSvc + '</div>'
    + '<div class="sr-card-footer">'
    + '<span class="sr-card-price">from \xa3' + s.startingPrice + '</span>'
    + '<div class="sr-card-btns">'
    + '<button class="sr-btn-view" onclick="event.stopPropagation();openProfile(\'' + s.id + '\')">View profile</button>'
    + '<button class="sr-btn-book" onclick="event.stopPropagation();openBookingFromStylist(\'' + s.id + '\')">Book now</button>'
    + '</div></div>'
    + '</div></div>';
}


/* ══════════════════════════════════════════════════════
   PROFILE OVERLAY
══════════════════════════════════════════════════════ */
function openProfile(id) {
  var s = STYLISTS.find(function(x){ return x.id === id; });
  if (!s) return;
  activeProfileId = id;

  document.getElementById('profHeroBg').style.background = s.bg;
  document.getElementById('profBadge').textContent      = s.flagship ? '✶ Flagship Stylist' : '✶ Verified Stylist';
  document.getElementById('profName').textContent       = s.name;
  document.getElementById('profLocation').textContent   = '📍 ' + s.city + ', UK';
  document.getElementById('profSpeciality').textContent = s.speciality;
  document.getElementById('profAvail').textContent      = s.nextAvail;

  var stars = '';
  for(var i=0;i<5;i++) stars += i < Math.floor(s.rating) ? '&#9733;' : '&#9734;';
  document.getElementById('profStars').innerHTML = stars + ' <span>' + s.rating + ' \xb7 ' + s.reviewCount + ' reviews</span>';

  document.getElementById('profAboutText').textContent = s.bio;

  document.getElementById('profServicesBody').innerHTML = s.topServices.map(function(svc){
    return '<div class="prof-svc-row">'
      + '<div class="prof-svc-info"><div class="prof-svc-name">' + svc.name + '</div>'
      + '<div class="prof-svc-dur">' + svc.dur + '</div></div>'
      + '<div class="prof-svc-price">' + svc.price + '</div>'
      + '<button class="prof-svc-btn" onclick="openBookingFromStylist(\'' + id + '\')">Book</button>'
      + '</div>';
  }).join('');

  document.getElementById('profReviewsBody').innerHTML = s.reviews.map(function(r){
    var rs=''; for(var i=0;i<5;i++) rs += i < r.rating ? '&#9733;' : '&#9734;';
    return '<div class="prof-review">'
      + '<div class="prof-review-header"><span class="prof-review-stars">' + rs + '</span>'
      + '<span class="prof-review-author">' + r.author + '</span></div>'
      + '<div class="prof-review-service">' + r.service + '</div>'
      + '<div class="prof-review-text">“' + r.text + '”</div>'
      + '</div>';
  }).join('');

  document.getElementById('profilePage').classList.add('open');
  document.getElementById('profScroll').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeProfile() {
  document.getElementById('profilePage').classList.remove('open');
  activeProfileId = null;
  if (!document.getElementById('searchPage').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function openBookingFromStylist(id) {
  var s = STYLISTS.find(function(x){ return x.id === id; });
  if (!s) return;
  activeProfileId = id;
  bpFromProfile   = true;
  document.querySelectorAll('.sum-stylist-name').forEach(function(el){ el.textContent = s.name; });
  bpSequence = BP_SEQ_PROFILE.slice();
  bpSeqIdx   = 0;
  openBooking(s.catKey);
}

function openBookingFromProfile() {
  if (activeProfileId) openBookingFromStylist(activeProfileId);
}


/* ══════════════════════════════════════════════════════
   FEATURED STYLISTS STRIP (homepage)
══════════════════════════════════════════════════════ */
function renderFeaturedStylists() {
  var track = document.getElementById('fsTrack');
  if (!track) return;
  track.innerHTML = STYLISTS.filter(function(s){ return s.featured; }).map(function(s){
    var stars=''; for(var i=0;i<5;i++) stars += i < Math.floor(s.rating) ? '&#9733;' : '&#9734;';
    return '<div class="fs-card" onclick="openProfile(\'' + s.id + '\')">'
      + '<div class="fs-card-img" style="background:' + s.bg + ';">'
      + (s.flagship ? '<div class="fs-flagship">✶ Flagship</div>' : '')
      + '</div>'
      + '<div class="fs-card-body">'
      + '<div class="fs-card-name">' + s.name + '</div>'
      + '<div class="fs-card-city">📍 ' + s.city + '</div>'
      + '<div class="fs-card-spec">' + s.speciality + '</div>'
      + '<div class="fs-card-rating">' + stars + ' <span>' + s.rating + '</span></div>'
      + '<div class="fs-card-footer">'
      + '<span class="fs-card-price">from \xa3' + s.startingPrice + '</span>'
      + '<button class="fs-card-btn" onclick="event.stopPropagation();openProfile(\'' + s.id + '\')">View profile →</button>'
      + '</div></div></div>';
  }).join('');
}

document.addEventListener('DOMContentLoaded', function(){ renderFeaturedStylists(); });


/* ══════════════════════════════════════════════════════
   HERO SEARCH
══════════════════════════════════════════════════════ */
function heroSearch() {
  var style = document.getElementById('heroStyleSelect').value;
  openSearch(style);
}


/* ══════════════════════════════════════════════════════
   BOOKING PAGE DATA & LOGIC
══════════════════════════════════════════════════════ */
var CATS = {
  braids: {
    name: 'Braids & Protective Styles',
    styles: [
      {id:'knotless', name:'Knotless Braids',  price:'from £130', base:130, dur:'4–6h',   bg:'radial-gradient(ellipse at 50% 25%, #4A2200, #1A0A00, #060301)'},
      {id:'fulani',   name:'Fulani Braids',      price:'from £110', base:110, dur:'3–4h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1800, #0E0700, #030201)'},
      {id:'cornrows', name:'Cornrows',           price:'from £60',  base:60,  dur:'1.5–3h', bg:'radial-gradient(ellipse at 50% 25%, #1A3020, #081509, #020604)'},
      {id:'feedin',   name:'Feed-In Braids',     price:'from £80',  base:80,  dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #381A00, #140800, #040201)'},
      {id:'stitch',   name:'Stitch Braids',      price:'from £90',  base:90,  dur:'2–3h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1200, #0E0600, #030200)'},
    ],
    hasSize:true, hasLength:true
  },
  wigs: {
    name: 'Wig Installs',
    styles: [
      {id:'lacefront', name:'Lace Front Install', price:'from £120', base:120, dur:'2–3h',     bg:'radial-gradient(ellipse at 50% 25%, #0A2820, #041408, #010603)'},
      {id:'fulllace',  name:'Full Lace Install',  price:'from £150', base:150, dur:'2.5–3.5h', bg:'radial-gradient(ellipse at 50% 25%, #0D3025, #050F09, #010503)'},
      {id:'360',       name:'360 Wig Install',    price:'from £140', base:140, dur:'2–3h',     bg:'radial-gradient(ellipse at 50% 25%, #1A3020, #080E09, #020403)'},
      {id:'custom',    name:'Wig Customisation',  price:'from £80',  base:80,  dur:'1.5–2.5h', bg:'radial-gradient(ellipse at 50% 25%, #101D18, #06100A, #020503)'},
    ],
    hasSize:false, hasLength:true
  },
  natural: {
    name: 'Natural Hair Care',
    styles: [
      {id:'washstyle', name:'Wash & Style', price:'from £55', base:55, dur:'2–3h', bg:'radial-gradient(ellipse at 50% 25%, #3A2808, #140E03, #040301)'},
      {id:'blowout',   name:'Blowout',      price:'from £65', base:65, dur:'2–3h', bg:'radial-gradient(ellipse at 50% 25%, #4A3010, #1A1005, #050301)'},
      {id:'twistout',  name:'Twist Out',    price:'from £70', base:70, dur:'2–3h', bg:'radial-gradient(ellipse at 50% 25%, #2A1808, #0E0803, #030201)'},
      {id:'silkpress', name:'Silk Press',   price:'from £85', base:85, dur:'3–4h', bg:'radial-gradient(ellipse at 50% 25%, #3A2000, #150C00, #040200)'},
    ],
    hasSize:false, hasLength:true
  },
  locs: {
    name: 'Locs & Twists',
    styles: [
      {id:'starterlocs', name:'Starter Locs',       price:'from £150', base:150, dur:'4–7h',   bg:'radial-gradient(ellipse at 50% 25%, #1A2A10, #080E06, #020402)'},
      {id:'twostrand',   name:'Two-Strand Twists',  price:'from £90',  base:90,  dur:'3–5h',   bg:'radial-gradient(ellipse at 50% 25%, #2A1808, #100800, #030200)'},
      {id:'senegalese',  name:'Senegalese Twists',  price:'from £110', base:110, dur:'3–5h',   bg:'radial-gradient(ellipse at 50% 25%, #3A2010, #150C04, #040201)'},
      {id:'marley',      name:'Marley Twists',      price:'from £120', base:120, dur:'4–6h',   bg:'radial-gradient(ellipse at 50% 25%, #281808, #0E0A03, #030200)'},
      {id:'retwist',     name:'Loc Retwist',        price:'from £60',  base:60,  dur:'1.5–3h', bg:'radial-gradient(ellipse at 50% 25%, #141E0C, #080B05, #020301)'},
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
  '1b':    {name:'1B Natural Black',       glow:'rgba(38,22,8,0.95)',    strand:'#2A1A0A'},
  '30':    {name:'30 Auburn',              glow:'rgba(140,62,15,0.85)',  strand:'#9A5020'},
  '4/33':  {name:'4/33 Dark Brown Mix',    glow:'rgba(90,16,16,0.88)',   strand:'#5A1010'},
  '613':   {name:'613 Platinum Blonde',    glow:'rgba(200,175,60,0.65)', strand:'#C8A840'},
  'other': {name:'Other colour',           glow:'rgba(80,50,20,0.8)',    strand:'#7A4018'},
};

var LENGTHS = ['Bob (10–12")', 'Shoulder (14–18")', 'Bra Length (20–24")', 'Waist / Bum (26"+)'];

var STRAND_CONFIGS = {
  knotless:   {count:8,  gap:65,  amp:14, w:5,  phase:8},
  box:        {count:5,  gap:100, amp:20, w:11, phase:0},
  fulani:     {count:7,  gap:72,  amp:16, w:7,  phase:10},
  cornrows:   {count:10, gap:52,  amp:7,  w:3,  phase:0},
  feedin:     {count:7,  gap:72,  amp:14, w:6,  phase:8},
  stitch:     {count:9,  gap:58,  amp:10, w:4,  phase:5},
  lacefront:  {count:4,  gap:130, amp:28, w:16, phase:0},
  fulllace:   {count:5,  gap:105, amp:26, w:14, phase:10},
  '360':      {count:5,  gap:105, amp:24, w:13, phase:5},
  custom:     {count:4,  gap:130, amp:28, w:16, phase:15},
  washstyle:  {count:5,  gap:105, amp:24, w:10, phase:0},
  blowout:    {count:4,  gap:130, amp:34, w:12, phase:0},
  twistout:   {count:6,  gap:85,  amp:20, w:9,  phase:0},
  silkpress:  {count:4,  gap:130, amp:28, w:10, phase:5},
  starterlocs:{count:5,  gap:105, amp:20, w:15, phase:0},
  twostrand:  {count:6,  gap:85,  amp:22, w:11, phase:0},
  senegalese: {count:6,  gap:85,  amp:18, w:9,  phase:10},
  marley:     {count:5,  gap:105, amp:22, w:13, phase:0},
  retwist:    {count:5,  gap:105, amp:18, w:13, phase:5},
  deepcond:   {count:3,  gap:175, amp:32, w:20, phase:0},
  scalp:      {count:3,  gap:175, amp:28, w:18, phase:10},
  protein:    {count:3,  gap:175, amp:32, w:20, phase:5},
  hotoil:     {count:3,  gap:175, amp:28, w:18, phase:0},
};

/* State */
var bpCurrentCat    = 'braids';
var bpCurrentStep   = 0;
var bpSelectedStyle  = null;
var bpSelectedColour = '1b';
var bpSelectedLength = 1;
var bpSelectedSize   = 'Medium';
var bpFromProfile   = false;  // true when opened from a stylist profile
// Step sequences — homepage: style→daterange+loc→stylists→customise→details→summary→pay
//                  profile:  style→customise→date→details→summary→pay
var BP_SEQ_HOME    = [0, 7, 3, 1, 4, 5, 6];
var BP_SEQ_PROFILE = [0, 1, 2, 4, 5, 6];
var bpSequence     = BP_SEQ_HOME;
var bpSeqIdx       = 0;

function openBooking(cat) {
  bpCurrentCat     = cat || 'braids';
  bpCurrentStep    = 0;
  bpSelectedStyle  = null;
  bpSelectedColour = '1b';
  bpSelectedLength = 1;
  bpFromProfile    = false;
  bpSequence       = BP_SEQ_HOME.slice();
  bpSeqIdx         = 0;
  // Default date range: today → +30 days
  var _today = new Date();
  var _todayStr = _today.toISOString().split('T')[0];
  var _future = new Date(_today); _future.setDate(_today.getDate() + 30);
  var _futureStr = _future.toISOString().split('T')[0];
  var _df = document.getElementById('bpDateFrom');
  var _dt = document.getElementById('bpDateTo');
  if (_df) { _df.min = _todayStr; _df.value = _todayStr; }
  if (_dt) { _dt.min = _todayStr; _dt.value = _futureStr; }
  var _li = document.getElementById('bpLocationInput');
  if (_li) _li.value = '';
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
  var searchOpen  = document.getElementById('searchPage').classList.contains('open');
  var profileOpen = document.getElementById('profilePage').classList.contains('open');
  if (!searchOpen && !profileOpen) document.body.style.overflow = '';
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
      + '<span class="bp-style-meta"><span class="bp-style-price">' + s.price + '</span> \xb7 ' + s.dur + '</span>'
      + '</div></div>';
  }).join('')
  + '<div class="bp-style-card bp-style-other" onclick="openOtherStyle()">'
  + '<div class="bp-style-other-inner">'
  + '<div class="bp-style-other-icon">+</div>'
  + '<div class="bp-style-body">'
  + '<span class="bp-style-name">Something else?</span>'
  + '<span class="bp-style-meta">Request a custom style</span>'
  + '</div></div></div>';
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
  // Auto-advance to customise step
  setTimeout(function(){ if (bpCurrentStep === 0) bpNext(); }, 320);
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
  document.getElementById('bpImgMeta').textContent = COLOURS[id].name + ' \xb7 ' + LENGTHS[bpSelectedLength] + ' \xb7 Tiwara\'s House';
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
  document.getElementById('bpImgMeta').textContent = col.name + ' \xb7 ' + LENGTHS[lenIdx] + ' \xb7 ' + (activeProfileId ? STYLISTS.find(function(x){return x.id===activeProfileId;}).name : "Tiwara's House");
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
  var fee     = Math.round(total * 0.02 * 100) / 100;
  var deposit = Math.round(total * 0.25 * 100) / 100;
  document.getElementById('sum-total').textContent   = '\xa3' + total;
  if (document.getElementById('sum-fee')) {
    document.getElementById('sum-fee').textContent = '\xa3' + fee.toFixed(2);
  }
  document.getElementById('sum-deposit').textContent = '\xa3' + deposit.toFixed(2);
  document.getElementById('sum-balance').textContent = '\xa3' + (total - deposit).toFixed(2);
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
  for (var i = 0; i < 8; i++) {
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
  if (bpSeqIdx >= bpSequence.length - 1) return;
  bpSeqIdx++;
  var nextStep = bpSequence[bpSeqIdx];
  if (nextStep === 3) buildStylistPicker();
  if (nextStep === 5) populateSummary();
  showBpStep(nextStep);
}

// Validate date range + location before advancing to stylist picker
function bpNextDateLoc() {
  var df  = document.getElementById('bpDateFrom');
  var dt  = document.getElementById('bpDateTo');
  var loc = document.getElementById('bpLocationInput');
  if (!df || !df.value) {
    df && df.classList.add('bp-input-error');
    df && df.focus();
    return;
  }
  df && df.classList.remove('bp-input-error');
  bpNext();
}

function bpPrev() {
  if (bpSeqIdx <= 0) return;
  bpSeqIdx--;
  showBpStep(bpSequence[bpSeqIdx]);
}

function updateStepDots() {
  var container = document.getElementById('bpStepDots');
  var html = '';
  for (var i = 0; i < bpSequence.length; i++) {
    var cls = i < bpSeqIdx ? 'done' : (i === bpSeqIdx ? 'active' : '');
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

/* ── ESC HANDLER ── */
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    if (document.getElementById('sizeGuideModal').classList.contains('open')) closeSizeGuide();
    else if (document.getElementById('lengthGuideModal').classList.contains('open')) closeLengthGuide();
    else if (document.getElementById('bookingPage').classList.contains('open')) closeBooking();
    else if (document.getElementById('aiDiscovery').classList.contains('open')) closeAiDiscovery();
    else if (document.getElementById('otherStylePage') && document.getElementById('otherStylePage').classList.contains('open')) closeOtherStyle();
    else if (document.getElementById('hairQuizPage') && document.getElementById('hairQuizPage').classList.contains('open')) closeHairQuiz();
    else if (document.getElementById('aboutPage') && document.getElementById('aboutPage').classList.contains('open')) closeAboutPage();
    else if (document.getElementById('stylistsPage') && document.getElementById('stylistsPage').classList.contains('open')) closeStylistsPage();
    else if (document.getElementById('shopPage') && document.getElementById('shopPage').classList.contains('open')) closeShopPage();
    else if (document.getElementById('profilePage').classList.contains('open')) closeProfile();
    else if (document.getElementById('searchPage').classList.contains('open')) closeSearch();
  }
});


/* ══════════════════════════════════════════════════════
   AI STYLE DISCOVERY
══════════════════════════════════════════════════════ */
var AI_STYLE_MAP = [
  {style:'knotless',   cat:'braids',     name:'Knotless Braids',      price:'from £130'},
  {style:'fulani',     cat:'braids',     name:'Fulani Braids',         price:'from £110'},
  {style:'cornrows',   cat:'braids',     name:'Cornrows',              price:'from £60'},
  {style:'lacefront',  cat:'wigs',       name:'Lace Front Install',    price:'from £120'},
  {style:'starterlocs',cat:'locs',       name:'Starter Locs',          price:'from £150'},
  {style:'washstyle',  cat:'natural',    name:'Wash & Style',          price:'from £55'},
  {style:'senegalese', cat:'locs',       name:'Senegalese Twists',     price:'from £110'},
  {style:'feedin',     cat:'braids',     name:'Feed-In Braids',        price:'from £80'},
];

var AI_COLOUR_MAP = [
  {id:'1b',      name:'1B Natural Black',  bright:10},
  {id:'burgundy',name:'Burgundy',          bright:22},
  {id:'4',       name:'4 Dark Brown',      bright:35},
  {id:'ombre',   name:'Ombre',             bright:50},
  {id:'30',      name:'30 Auburn',         bright:62},
  {id:'27',      name:'27 Honey Blonde',   bright:75},
  {id:'613',     name:'613 Platinum',      bright:90},
];

function openAiDiscovery() {
  // Reset state
  document.getElementById('aiStep0').classList.add('active');
  document.getElementById('aiStep1').classList.remove('active');
  document.getElementById('aiPreview').style.display = 'none';
  document.getElementById('aiAnalysing').style.display = 'none';
  document.getElementById('aiUploadZone').style.display = 'block';
  document.getElementById('aiFileInput').value = '';
  document.getElementById('aiDiscovery').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAiDiscovery() {
  document.getElementById('aiDiscovery').classList.remove('open');
  var searchOpen  = document.getElementById('searchPage').classList.contains('open');
  var profileOpen = document.getElementById('profilePage').classList.contains('open');
  var bookingOpen = document.getElementById('bookingPage').classList.contains('open');
  if (!searchOpen && !profileOpen && !bookingOpen) document.body.style.overflow = '';
}

function aiFileSelected(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('aiPreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('aiUploadZone').style.display = 'none';
    preview.onload = function() {
      document.getElementById('aiAnalysing').style.display = 'block';
      setTimeout(function() { aiAnalyse(preview); }, 1800);
    };
  };
  reader.readAsDataURL(file);
}

function aiAnalyse(imgEl) {
  // Canvas-based colour sampling (smart mock)
  var canvas = document.createElement('canvas');
  canvas.width = 80; canvas.height = 80;
  var ctx = canvas.getContext('2d');
  try { ctx.drawImage(imgEl, 0, 0, 80, 80); } catch(e) {}
  var data, r = 128, g = 100, b = 80; // fallback mid values
  try {
    data = ctx.getImageData(0, 0, 80, 80).data;
    var total = 0; r = 0; g = 0; b = 0;
    for (var i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; total++; }
    r = Math.round(r/total); g = Math.round(g/total); b = Math.round(b/total);
  } catch(e) {}

  var brightness = Math.round((r*299 + g*587 + b*114) / 1000);

  // Colour detection
  var detectedColour = AI_COLOUR_MAP[0];
  var minDist = 999;
  AI_COLOUR_MAP.forEach(function(c) {
    var d = Math.abs(brightness - c.bright);
    if (d < minDist) { minDist = d; detectedColour = c; }
  });

  // Style detection (deterministic from pixel sum)
  var styleIdx = (r + g + b) % AI_STYLE_MAP.length;
  var primaryMatch = AI_STYLE_MAP[styleIdx];

  // Length detection (brightness proxy)
  var lenIdx = Math.min(3, Math.floor(brightness / 26));

  // Show results
  document.getElementById('aiAnalysing').style.display = 'none';
  document.getElementById('aiResStyle').textContent   = primaryMatch.name;
  document.getElementById('aiResColour').textContent  = detectedColour.name;
  document.getElementById('aiResLength').textContent  = LENGTHS[lenIdx];

  // 3 match cards (primary + 2 alternates)
  var matches = [];
  for (var j = 0; j < 3; j++) {
    matches.push(AI_STYLE_MAP[(styleIdx + j) % AI_STYLE_MAP.length]);
  }
  var confidences = ['98% match', '84% match', '71% match'];
  document.getElementById('aiMatchStyles').innerHTML = matches.map(function(m, idx) {
    return '<div class="ai-match-card" onclick="aiBookStyle(\'' + m.cat + '\',\'' + m.style + '\',\'' + detectedColour.id + '\',' + lenIdx + ')">'
      + '<div><div class="ai-match-name">' + m.name + '</div><div class="ai-match-conf">' + confidences[idx] + '</div></div>'
      + '<div style="text-align:right"><div class="ai-match-price">' + m.price + '</div>'
      + '<div class="ai-match-arrow">Book →</div></div>'
      + '</div>';
  }).join('');

  document.getElementById('aiStep0').classList.remove('active');
  document.getElementById('aiStep1').classList.add('active');
}

function aiBookStyle(cat, styleId, colourId, lenIdx) {
  closeAiDiscovery();
  bpSelectedColour = colourId || '1b';
  bpSelectedLength = lenIdx !== undefined ? lenIdx : 1;
  openBooking(cat);
  setTimeout(function() {
    var el = document.getElementById('sc-' + styleId);
    if (el) { selectStyle(styleId, el); }
  }, 250);
}

function aiRetry() {
  document.getElementById('aiStep1').classList.remove('active');
  document.getElementById('aiStep0').classList.add('active');
  document.getElementById('aiPreview').style.display = 'none';
  document.getElementById('aiUploadZone').style.display = 'block';
  document.getElementById('aiFileInput').value = '';
}


/* ══════════════════════════════════════════════════════
   CHATBOT
══════════════════════════════════════════════════════ */
var chatIsOpen = false;

var CB_QA = {
  book:     "To book: search for a stylist near you, browse their profile, tap 'Book now'. You'll customise your style, pick a date, add your details, and pay a 25% deposit to confirm. Done in minutes! 💛",
  price:    "Prices vary by service and stylist. Braids from £60, wig installs from £120, locs from £60, natural hair from £55. You'll always see the full price before you pay — no surprises.",
  deposit:  "We take a 25% deposit to secure your booking. The balance is paid in the salon on the day. Deposits are non-refundable within 48 hours of your appointment.",
  cancel:   "You can reschedule up to 48 hours before your appointment using the link in your confirmation email. Cancellations within 48h may forfeit the deposit.",
  style:    "We offer: Braids &amp; Protective Styles, Wig Installs, Natural Hair Care, Locs &amp; Twists, and Treatments. You can also try our AI Style Discovery — upload an inspo photo and we'll find your look! ✦",
  location: "Tiwara's House has stylists across the UK — Manchester, London, Birmingham, Leeds and more. Use the search bar on the home page to find one near you.",
  person:   "<a href='https://wa.me/447700000000' target='_blank' style='color:var(--orange)'>Chat on WhatsApp →</a> or email us at <a href='mailto:hello@tiwarashouse.com' style='color:var(--orange)'>hello@tiwarashouse.com</a>. We aim to reply within 2 hours. 💛",
  dflt:     "Great question! For anything I can't answer, connect with the team: <a href='https://wa.me/447700000000' target='_blank' style='color:var(--orange)'>WhatsApp</a> or <a href='mailto:hello@tiwarashouse.com' style='color:var(--orange)'>email us</a>."
};

function toggleChatbot() {
  chatIsOpen = !chatIsOpen;
  document.getElementById('chatWindow').classList.toggle('open', chatIsOpen);
  if (chatIsOpen) setTimeout(function(){ document.getElementById('chatInput').focus(); }, 280);
}

function cbAddMsg(html, type) {
  var body = document.getElementById('chatBody');
  var div = document.createElement('div');
  div.className = 'cb-msg ' + type;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function cbRespond(text) {
  var lower = text.toLowerCase();
  var reply;
  if (/book|appoint|reserv/.test(lower))                             reply = CB_QA.book;
  else if (/price|cost|how much|£|fee/.test(lower))                  reply = CB_QA.price;
  else if (/deposit/.test(lower))                                     reply = CB_QA.deposit;
  else if (/cancel|reschedul/.test(lower))                           reply = CB_QA.cancel;
  else if (/style|service|offer|available|do you/.test(lower))       reply = CB_QA.style;
  else if (/location|area|city|near|where|find/.test(lower))         reply = CB_QA.location;
  else if (/person|human|agent|talk|speak|real/.test(lower))         reply = CB_QA.person;
  else                                                                 reply = CB_QA.dflt;

  // Typing indicator
  var body = document.getElementById('chatBody');
  var typing = document.createElement('div');
  typing.className = 'cb-msg bot'; typing.id = 'cbTyping'; typing.style.opacity = '0.5';
  typing.textContent = '…';
  body.appendChild(typing); body.scrollTop = body.scrollHeight;

  setTimeout(function() {
    var t = document.getElementById('cbTyping');
    if (t) t.remove();
    cbAddMsg(reply, 'bot');
    document.getElementById('chatQR').style.display = 'none';
  }, 900);
}

function cbSend() {
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  if (!text) return;
  cbAddMsg(text, 'user');
  input.value = '';
  cbRespond(text);
}

function cbQuick(text) {
  cbAddMsg(text, 'user');
  cbRespond(text);
}


/* ══════════════════════════════════════════════════════
   SIZE & LENGTH GUIDE MODALS
══════════════════════════════════════════════════════ */
function openSizeGuide() {
  document.getElementById('sizeGuideModal').classList.add('open');
}
function closeSizeGuide(e) {
  if (!e || e.target === document.getElementById('sizeGuideModal')) {
    document.getElementById('sizeGuideModal').classList.remove('open');
  }
}
function openLengthGuide() {
  document.getElementById('lengthGuideModal').classList.add('open');
}
function closeLengthGuide(e) {
  if (!e || e.target === document.getElementById('lengthGuideModal')) {
    document.getElementById('lengthGuideModal').classList.remove('open');
  }
}

// ─── OTHER STYLE OVERLAY ────────────────────────────────────────────────────
function openOtherStyle() {
  document.getElementById('otherStylePage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeOtherStyle() {
  document.getElementById('otherStylePage').classList.remove('open');
  document.body.style.overflow = '';
  // reset form
  document.getElementById('osDescription').value = '';
  document.getElementById('osPreviewWrap').style.display = 'none';
  document.getElementById('osUploadZone').style.display = '';
  document.getElementById('osSuccess').style.display = 'none';
  document.querySelector('.os-form').style.display = '';
}
function osFileSelected(input) {
  if (!input.files || !input.files[0]) return;
  var url = URL.createObjectURL(input.files[0]);
  document.getElementById('osPreviewImg').src = url;
  document.getElementById('osPreviewWrap').style.display = 'block';
  document.getElementById('osUploadZone').style.display = 'none';
}
function osRemoveImg() {
  document.getElementById('osPreviewWrap').style.display = 'none';
  document.getElementById('osUploadZone').style.display = '';
  document.getElementById('osFileInput').value = '';
}
function osSubmit() {
  var desc = document.getElementById('osDescription').value.trim();
  if (!desc) {
    document.getElementById('osDescription').focus();
    document.getElementById('osDescription').style.borderColor = 'var(--orange)';
    return;
  }
  document.getElementById('osDescription').style.borderColor = '';
  document.querySelector('.os-form').style.display = 'none';
  document.getElementById('osSuccess').style.display = 'block';
}

// ─── HAIR QUIZ OVERLAY ──────────────────────────────────────────────────────
var hqAnswers = {};
var hqCurrentSlide = 0;
var HQ_TOTAL = 5;

var HQ_RECS = {
  moistureKit: { title: 'Deep Moisture Routine', body: 'Use a sulphate-free shampoo weekly, follow with a rich deep conditioning mask (leave on for 20–30 min under a heat cap). Seal with a lightweight oil (jojoba or argan) on damp hair.' },
  growthKit:   { title: 'Growth & Retention Protocol', body: 'Monthly protein treatment to strengthen strands, followed by moisture to balance. Protective styling between appointments reduces breakage. Scalp massage with castor oil twice weekly stimulates growth.' },
  scalpKit:    { title: 'Scalp Health Reset', body: 'Switch to a scalp-balancing shampoo with tea tree or peppermint. Apply a lightweight scalp serum between washes. Avoid heavy butters directly on the scalp.' },
  defKit:      { title: 'Curl Definition & Shine', body: 'Apply a leave-in conditioner on soaking-wet hair, layer a curl cream on top, then seal with a small amount of oil. Diffuse or air-dry — no raking when dry to preserve clumps.' },
  fineKit:     { title: 'Fine Hair Care', body: 'Avoid heavy butters that weigh hair down. Use lightweight water-based leave-ins and liquid oils. Protein treatments every 4–6 weeks add structure and body.' },
  coarseKit:   { title: 'Coarse Hair Nourishment', body: 'Thicker hair needs richer products — shea or mango butter work well as sealants. Layer: water → leave-in → cream → oil (L.O.C. or L.C.O. method). Deep condition every wash day.' },
};

function openHairQuiz() {
  hqAnswers = {};
  hqCurrentSlide = 0;
  var slides = document.querySelectorAll('.hq-slide');
  slides.forEach(function(s){ s.classList.remove('active'); s.querySelectorAll('.hq-opt').forEach(function(o){ o.classList.remove('selected'); }); });
  if (slides[0]) slides[0].classList.add('active');
  hqUpdateProgress();
  document.getElementById('hairQuizPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeHairQuiz() {
  document.getElementById('hairQuizPage').classList.remove('open');
  document.body.style.overflow = '';
}
function hqUpdateProgress() {
  var pct = Math.round((hqCurrentSlide / HQ_TOTAL) * 100);
  document.getElementById('hqProgressFill').style.width = pct + '%';
}
function hqSelect(btn) {
  var key = btn.getAttribute('data-key');
  var val = btn.getAttribute('data-val');
  hqAnswers[key] = val;
  // deselect siblings
  btn.closest('.hq-options').querySelectorAll('.hq-opt').forEach(function(o){ o.classList.remove('selected'); });
  btn.classList.add('selected');
  // auto-advance after brief pause (except multi-select slides)
  if (!btn.closest('.hq-options--multi')) {
    setTimeout(hqNext, 280);
  }
}
function hqToggle(btn) {
  btn.classList.toggle('selected');
  var key = btn.getAttribute('data-key');
  var selected = Array.from(btn.closest('.hq-options').querySelectorAll('.hq-opt.selected')).map(function(b){ return b.getAttribute('data-val'); });
  hqAnswers[key] = selected;
}
function hqNext() {
  var slides = document.querySelectorAll('.hq-slide');
  if (hqCurrentSlide >= slides.length - 1) { hqShowResults(); return; }
  slides[hqCurrentSlide].classList.remove('active');
  hqCurrentSlide++;
  slides[hqCurrentSlide].classList.add('active');
  hqUpdateProgress();
  if (hqCurrentSlide === HQ_TOTAL) hqShowResults();
}
function hqShowResults() {
  hqCurrentSlide = HQ_TOTAL;
  hqUpdateProgress();
  var slides = document.querySelectorAll('.hq-slide');
  slides.forEach(function(s){ s.classList.remove('active'); });
  slides[HQ_TOTAL].classList.add('active');

  var recs = [];
  var goals = hqAnswers.goals || [];
  if (goals.indexOf('moisture') !== -1 || hqAnswers.density === 'coarse') recs.push(HQ_RECS.moistureKit);
  if (goals.indexOf('growth') !== -1 || goals.indexOf('damage') !== -1) recs.push(HQ_RECS.growthKit);
  if (goals.indexOf('scalp') !== -1 || hqAnswers.scalp === 'oily' || hqAnswers.scalp === 'dry') recs.push(HQ_RECS.scalpKit);
  if (goals.indexOf('definition') !== -1 || goals.indexOf('shine') !== -1) recs.push(HQ_RECS.defKit);
  if (hqAnswers.density === 'fine') recs.push(HQ_RECS.fineKit);
  if (hqAnswers.density === 'coarse' && recs.indexOf(HQ_RECS.coarseKit) === -1) recs.push(HQ_RECS.coarseKit);
  if (recs.length === 0) recs.push(HQ_RECS.moistureKit, HQ_RECS.defKit);

  var html = recs.map(function(r){
    return '<div class="hq-result-item"><h4>' + r.title + '</h4><p>' + r.body + '</p></div>';
  }).join('');
  document.getElementById('hqResults').innerHTML = html;

  var typeLabel = hqAnswers.type ? 'Type ' + hqAnswers.type.toUpperCase() : '';
  document.getElementById('hqResultTitle').textContent = 'Your ' + (typeLabel ? typeLabel + ' ' : '') + 'personalised routine';
}
function hqReset() {
  openHairQuiz();
}

// ─── ABOUT PAGE ──────────────────────────────────────────────────────────────
function openAboutPage() {
  document.getElementById('aboutPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAboutPage() {
  document.getElementById('aboutPage').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── FOR STYLISTS PAGE ───────────────────────────────────────────────────────
function openStylistsPage() {
  document.getElementById('stylistsPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeStylistsPage() {
  document.getElementById('stylistsPage').classList.remove('open');
  document.body.style.overflow = '';
}
function submitStylistForm() {
  var name     = document.getElementById('sf-name').value.trim();
  var business = document.getElementById('sf-business').value.trim();
  var location = document.getElementById('sf-location').value.trim();
  var email    = document.getElementById('sf-email').value.trim();
  if (!name || !business || !location || !email) {
    ['sf-name','sf-business','sf-location','sf-email'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el.value.trim()) el.style.borderColor = 'var(--orange)';
    });
    return;
  }
  document.getElementById('stylistForm').style.display = 'none';
  document.getElementById('stylistSuccess').style.display = 'block';
  document.getElementById('stylistsPage').scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── SHOP PAGE ────────────────────────────────────────────────────────────────
function openShopPage() {
  document.getElementById('shopPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeShopPage() {
  document.getElementById('shopPage').classList.remove('open');
  document.body.style.overflow = '';
}
function filterShop(cat, btn) {
  document.querySelectorAll('.pg-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  document.querySelectorAll('.pg-shop-card').forEach(function(card) {
    if (cat === 'all' || card.getAttribute('data-cat') === cat) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// ─── STYLIST PICKER STEP ─────────────────────────────────────────────────────
function bpFormatDate(str) {
  if (!str) return '';
  var d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function buildStylistPicker() {
  var cat      = bpCurrentCat;
  var dateFrom = document.getElementById('bpDateFrom') ? document.getElementById('bpDateFrom').value : '';
  var dateTo   = document.getElementById('bpDateTo')   ? document.getElementById('bpDateTo').value   : '';
  var locRaw   = document.getElementById('bpLocationInput') ? document.getElementById('bpLocationInput').value.trim() : '';
  var loc      = locRaw.toLowerCase();

  // Filter by category and location
  var available = STYLISTS.filter(function(s) {
    var matchesCat = s.tags && s.tags.indexOf(cat) !== -1;
    var matchesLoc = !loc ||
      (s.city && s.city.toLowerCase().indexOf(loc) !== -1) ||
      (s.areas && s.areas.some(function(a){ return a.toLowerCase().indexOf(loc) !== -1; }));
    return matchesCat && matchesLoc;
  });

  var sub = document.getElementById('bpStylistPickerSub');
  if (sub) {
    var locLabel  = locRaw ? ' near ' + locRaw : ' across the UK';
    var dateLabel = dateFrom
      ? ' · ' + bpFormatDate(dateFrom) + (dateTo ? ' – ' + bpFormatDate(dateTo) : '')
      : '';
    sub.textContent = available.length + ' stylist' + (available.length !== 1 ? 's' : '') +
      ' for ' + (CATS[cat] ? CATS[cat].name : cat) + locLabel + dateLabel;
  }

  var container = document.getElementById('bpStylistPicker');
  if (!container) return;

  if (available.length === 0) {
    container.innerHTML = '<div class="bp-no-stylists">No stylists found for this style. <a href="#" onclick="closeBooking();openSearch(\'\');return false;">Browse all stylists</a></div>';
    return;
  }

  container.innerHTML = available.map(function(s) {
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < Math.round(s.rating) ? '★' : '☆';
    return '<div class="bp-stylist-pick-card" onclick="selectStylistForBooking(\'' + s.id + '\',this)">'
      + '<div class="bp-spc-avatar" style="background:' + s.bg + '"></div>'
      + '<div class="bp-spc-body">'
      + '<div class="bp-spc-name">' + s.name + '</div>'
      + '<div class="bp-spc-meta">' + s.city + ' · from £' + s.startingPrice + '</div>'
      + '<div class="bp-spc-rating"><span class="bp-spc-stars">' + stars + '</span> <span class="bp-spc-rc">(' + s.reviewCount + ')</span></div>'
      + '</div>'
      + '<div class="bp-spc-avail">Next: ' + s.nextAvail + '</div>'
      + '</div>';
  }).join('');
}

function selectStylistForBooking(id, el) {
  var s = STYLISTS.find(function(x){ return x.id === id; });
  if (!s) return;
  activeProfileId = id;
  document.querySelectorAll('.sum-stylist-name').forEach(function(n){ n.textContent = s.name; });
  // highlight selected card
  document.querySelectorAll('.bp-stylist-pick-card').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  // auto-advance after brief pause
  setTimeout(bpNext, 300);
}
