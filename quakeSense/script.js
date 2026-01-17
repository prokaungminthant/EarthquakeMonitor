/* QuakeSense Lite - shared script
   Supports two modes:
   - web (index.html) : shows map + list
   - android (android.html) : adds city selection + nearby alerts
*/
const MODE = document.body.dataset.mode || 'web';
const ALERT_FILE = 'alert.wav'; // bundled sound
const USGS_BASE = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
let map, markersLayer;
let lastSeen = new Set();
let userCity = null;
let alertAudio = null;

// utility: haversine distance (km)
function haversine(lat1, lon1, lat2, lon2){
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// init map
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([10, 0], 2);

  // Dark mode map (CartoDB Dark Matter)
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}


// load cities into selector (android mode)
async function loadCities(){
  try{
    const res = await fetch('cities.json');
    const cities = await res.json();
    const sel = document.getElementById('citySelector');
    if(!sel) return;
    sel.innerHTML = '';
    for(const c of cities){
      const opt = document.createElement('option');
      opt.value = JSON.stringify([c.lat,c.lon]);
      opt.text = `${c.name} — ${c.country}`;
      sel.appendChild(opt);
    }
  }catch(e){
    console.warn('Could not load cities.json', e);
  }
}

// read UI elements
function getMinMag(){
  const el = document.getElementById('minMag');
  return el ? parseFloat(el.value) : 0;
}
function getFeedKey(){
  const el = document.getElementById('feedSelect');
  return el ? el.value : 'all_hour';
}

// fetch and render earthquakes
async function fetchAndRender(){
  const feed = getFeedKey();
  const minMag = getMinMag();
  const url = USGS_BASE + feed + '.geojson';
  try{
    const res = await fetch(url);
    const data = await res.json();
    renderQuakes(data.features.filter(f => (f.properties.mag || 0) >= minMag));
  }catch(e){
    console.error('Failed fetching USGS', e);
    showAlert('Error fetching earthquake data — check console.');
  }
}

// render features
function renderQuakes(features){
  markersLayer.clearLayers();
  const list = document.getElementById('quakeList');
  list.innerHTML = '';
  const newQuakes = [];

  features.sort((a,b)=> (b.properties.time - a.properties.time));

  for(const f of features){
    const id = f.id;
    if(!id) continue;
    const [lon,lat,depth] = f.geometry.coordinates;
    const mag = Math.round((f.properties.mag||0)*10)/10;
    const place = f.properties.place || 'Unknown location';
    const timeStr = new Date(f.properties.time).toLocaleString();

    // marker color/radius
    const color = mag < 3 ? '#2ecc71' : mag < 5 ? '#f1c40f' : '#e74c3c';
    const radius = Math.max(4, mag*3);

    const marker = L.circleMarker([lat,lon],{
      radius, color, fillColor: color, fillOpacity: 0.7, weight:1
    }).addTo(markersLayer);
    marker.bindPopup(`<b>${place}</b><br>Magnitude: ${mag} • Depth: ${depth} km<br>${timeStr}`);

    // list item
    const li = document.createElement('li');
    li.innerHTML = `<strong>${place}</strong><span class="meta">M${mag} • ${depth} km • ${timeStr}</span>`;
    li.onclick = ()=> { map.setView([lat,lon],6); marker.openPopup(); };
    list.appendChild(li);

    // detect new quakes (since last run)
    if(!lastSeen.has(id)){
      newQuakes.push({id, lat, lon, mag, place});
      lastSeen.add(id);
    }
  }

  // if any new critical quakes, alert
  for(const q of newQuakes){
    if(q.mag >= 5){ // global strong quake alert
      triggerGlobalAlert(q);
    }
    if(MODE === 'android' && userCity){
      const [uLat,uLon] = userCity.coords;
      const radiusKm = parseInt(document.getElementById('radiusInput').value || '300',10);
      const d = haversine(uLat,uLon,q.lat,q.lon);
      if(d <= radiusKm){
        triggerNearbyAlert(q, d);
      }
    }
  }
}

// show textual alert in header area
let alertTimeout = null;
function showAlert(msg, timeout=8000){
  const area = document.getElementById('alertArea');
  area.textContent = msg;
  if(alertTimeout) clearTimeout(alertTimeout);
  alertTimeout = setTimeout(()=> area.textContent = '', timeout);
}

// play audio (safe: single file)
function playSound(){
  try{
    if(!alertAudio){
      alertAudio = new Audio(ALERT_FILE);
      alertAudio.load();
    }
    alertAudio.currentTime = 0;
    alertAudio.play().catch(e=>console.warn('Audio play prevented:', e));
  }catch(e){ console.warn(e); }
}

// global alert for strong quake
function triggerGlobalAlert(q){
  showAlert(`⚠️ Strong earthquake: M${q.mag} — ${q.place}`, 12000);
  playSound();
  // flash title bar
  flashTitle(`⚠️ Quake M${q.mag}`);
}

// nearby alert for Android city
function triggerNearbyAlert(q, distKm){
  showAlert(`🔔 Nearby quake for ${userCity.name}: M${q.mag} at ${(Math.round(distKm))} km`, 15000);
  playSound();
  flashTitle(`🔔 Nearby quake M${q.mag}`);
}

// small UX: flash title for attention
let originalTitle = document.title;
let flashInterval = null;
function flashTitle(text){
  if(flashInterval) clearInterval(flashInterval);
  let on = false;
  flashInterval = setInterval(()=>{
    document.title = on ? text : originalTitle;
    on = !on;
  }, 800);
  setTimeout(()=>{ clearInterval(flashInterval); document.title = originalTitle; }, 8000);
}

// attach UI events
function attachUI(){
  const refreshBtn = document.getElementById('refreshBtn');
  if(refreshBtn) refreshBtn.onclick = ()=> fetchAndRender();

  const minMag = document.getElementById('minMag');
  if(minMag) minMag.onchange = ()=> fetchAndRender();

  const feedSelect = document.getElementById('feedSelect');
  if(feedSelect) feedSelect.onchange = ()=> fetchAndRender();

  if(MODE === 'android'){
    loadCities();
    document.getElementById('setCity').onclick = ()=> {
      const sel = document.getElementById('citySelector');
      const val = sel.value;
      if(!val) return showAlert('Select a city first');
      const coords = JSON.parse(val);
      const name = sel.options[sel.selectedIndex].text.split(' — ')[0];
      userCity = { name, coords };
      showAlert(`City set to ${name}`);
      map.setView(coords,6);
    };
  }

  // install prompt handling for PWA
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if(installBtn) installBtn.style.display='inline-block';
    installBtn.onclick = async ()=>{
      installBtn.style.display='none';
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    };
  });
}

// service worker registration (for PWA offline basic caching)
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW registration failed', e));
}

// init
window.addEventListener('load', ()=>{
  initMap();
  attachUI();
  if(MODE === 'android') loadCities();
  // preload sound
  alertAudio = new Audio(ALERT_FILE);
  alertAudio.load();
  fetchAndRender();
  // refresh interval (2 minutes default)
  setInterval(fetchAndRender, 120000);
});

// === View Counter with Cookie Protection ===

function hasViewed() {
  return document.cookie.includes("viewed=true");
}

function markViewed() {
  document.cookie = "viewed=true; max-age=31536000; path=/";
}

if (!hasViewed()) {
  fetch('/api/views')
    .then(r => r.json())
    .then(() => markViewed());
}

const header = document.querySelector('header');
const resetBox = document.getElementById('resetBox');

if (header && resetBox) {
  header.addEventListener('click', () => {
    resetBox.style.pointerEvents = 'auto';
    resetBox.focus();
  });

  resetBox.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && resetBox.value === 'reset_101') {
      await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });
      resetBox.value = '';
      resetBox.blur();
      resetBox.style.pointerEvents = 'none';
      alert('View count reset');
    }
  });
}
