const STORAGE_KEY = 'patroltrack_data_v1';

let map, marker, trailLayer, points = [], trackInterval = null;
let onDuty = false;
let currentModalType = null;

const els = {
  dutyStatus: document.getElementById('duty-status'),
  dutyToggle: document.getElementById('duty-toggle'),
  navBtns: document.querySelectorAll('.nav-btn'),
  views: document.querySelectorAll('.view'),
  mapEl: document.getElementById('map'),
  centerBtn: document.getElementById('center-btn'),
  scanBtn: document.getElementById('scan-checkpoint'),
  incidentBtn: document.getElementById('log-incident'),
  intervalSelect: document.getElementById('track-interval'),
  logList: document.getElementById('log-list'),
  clearBtn: document.getElementById('clear-log'),
  statsContent: document.getElementById('stats-content'),
  exportBtn: document.getElementById('export-btn'),
  reportContent: document.getElementById('report-content'),
  copyReport: document.getElementById('copy-report'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modal-title'),
  modalNote: document.getElementById('modal-note'),
  modalSave: document.getElementById('modal-save'),
  modalCancel: document.getElementById('modal-cancel'),
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      points = data.points || [];
      onDuty = !!data.onDuty;
    }
  } catch (e) {
    console.warn('Load failed', e);
  }
  updateDutyUI();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ points, onDuty }));
}

function initMap() {
  map = L.map(els.mapEl).setView([39.7392, -104.9903], 13); // Denver default
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  trailLayer = L.layerGroup().addTo(map);
  redrawTrail();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      map.setView([latitude, longitude], 15);
      updateMarker(latitude, longitude);
    }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
  }
}

function updateMarker(lat, lng) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lng]).addTo(map).bindPopup('You');
}

function redrawTrail() {
  trailLayer.clearLayers();
  if (points.length === 0) return;

  const latlngs = points.map(p => [p.lat, p.lng]);
  L.polyline(latlngs, { color: '#e63946', weight: 3, opacity: 0.7 }).addTo(trailLayer);

  points.forEach((p, i) => {
    const color = p.type === 'checkpoint' ? '#2a9d8f' : p.type === 'incident' ? '#f4a261' : '#e63946';
    L.circleMarker([p.lat, p.lng], {
      radius: p.type === 'checkpoint' ? 8 : 5,
      color,
      fillColor: color,
      fillOpacity: 0.8
    }).addTo(trailLayer).bindPopup(
      `<strong>${p.type}</strong><br>${new Date(p.ts).toLocaleString()}<br>${p.note || ''}`
    );
  });
}

function addPoint(type, note = '') {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const point = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      ts: Date.now(),
      type,
      note,
      accuracy: pos.coords.accuracy
    };
    points.push(point);
    saveData();
    updateMarker(point.lat, point.lng);
    redrawTrail();
    map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15));
    refreshAll();
  }, err => alert('Location error: ' + err.message), { enableHighAccuracy: true });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function totalDistance() {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversine(points[i-1].lat, points[i-1].lng, points[i].lat, points[i].lng);
  }
  return dist;
}

function refreshLog() {
  if (points.length === 0) {
    els.logList.innerHTML = '<p style="padding:1rem;color:#8b9bb4">No activity yet. Clock in and start tracking.</p>';
    return;
  }
  const sorted = [...points].sort((a,b) => b.ts - a.ts);
  els.logList.innerHTML = sorted.map(p => `
    <div class="log-item">
      <div class="type">${p.type.toUpperCase()}</div>
      <div class="time">${new Date(p.ts).toLocaleString()}</div>
      ${p.note ? `<div>${p.note}</div>` : ''}
      <div style="font-size:0.75rem;color:#8b9bb4">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
    </div>
  `).join('');
}

function refreshStats() {
  const dist = totalDistance();
  const checkpoints = points.filter(p => p.type === 'checkpoint').length;
  const incidents = points.filter(p => p.type === 'incident').length;
  const days = new Set(points.map(p => new Date(p.ts).toDateString())).size;

  els.statsContent.innerHTML = `
    <div class="stat-row"><strong>Total points:</strong> ${points.length}</div>
    <div class="stat-row"><strong>Checkpoints scanned:</strong> ${checkpoints}</div>
    <div class="stat-row"><strong>Incidents logged:</strong> ${incidents}</div>
    <div class="stat-row"><strong>Estimated distance:</strong> ${(dist/1000).toFixed(2)} km</div>
    <div class="stat-row"><strong>Days with activity:</strong> ${days}</div>
    <div class="stat-row"><strong>On duty:</strong> ${onDuty ? 'Yes' : 'No'}</div>
  `;
}

function generateReport() {
  const today = new Date().toDateString();
  const todayPoints = points.filter(p => new Date(p.ts).toDateString() === today);
  if (todayPoints.length === 0) {
    els.reportContent.textContent = 'No activity recorded today.';
    return;
  }

  let report = `DAILY ACTIVITY REPORT\n`;
  report += `Date: ${today}\n`;
  report += `Total entries: ${todayPoints.length}\n`;
  report += `Checkpoints: ${todayPoints.filter(p => p.type === 'checkpoint').length}\n`;
  report += `Incidents: ${todayPoints.filter(p => p.type === 'incident').length}\n\n`;
  report += `ENTRIES:\n`;
  todayPoints.sort((a,b) => a.ts - b.ts).forEach(p => {
    report += `- ${new Date(p.ts).toLocaleTimeString()} | ${p.type.toUpperCase()}`;
    if (p.note) report += ` | ${p.note}`;
    report += ` | ${p.lat.toFixed(5)},${p.lng.toFixed(5)}\n`;
  });
  els.reportContent.textContent = report;
}

function refreshAll() {
  refreshLog();
  refreshStats();
  generateReport();
}

function updateDutyUI() {
  els.dutyStatus.textContent = onDuty ? 'On Duty' : 'Off Duty';
  els.dutyStatus.classList.toggle('on-duty', onDuty);
  els.dutyToggle.textContent = onDuty ? 'Clock Out' : 'Clock In';
}

function startAutoTrack() {
  stopAutoTrack();
  const secs = parseInt(els.intervalSelect.value, 10);
  if (secs <= 0 || !onDuty) return;
  trackInterval = setInterval(() => {
    if (onDuty) addPoint('track', 'Auto track');
  }, secs * 1000);
}

function stopAutoTrack() {
  if (trackInterval) {
    clearInterval(trackInterval);
    trackInterval = null;
  }
}

function showModal(type) {
  currentModalType = type;
  els.modalTitle.textContent = type === 'checkpoint' ? 'Scan Checkpoint' : 'Log Incident';
  els.modalNote.value = '';
  els.modal.classList.remove('hidden');
  els.modalNote.focus();
}

function hideModal() {
  els.modal.classList.add('hidden');
  currentModalType = null;
}

// Event listeners
els.dutyToggle.addEventListener('click', () => {
  onDuty = !onDuty;
  const type = onDuty ? 'clock-in' : 'clock-out';
  addPoint(type, onDuty ? 'Started shift' : 'Ended shift');
  updateDutyUI();
  saveData();
  if (onDuty) startAutoTrack(); else stopAutoTrack();
});

els.navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.navBtns.forEach(b => b.classList.remove('active'));
    els.views.forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.view + '-view').classList.add('active');
    if (btn.dataset.view === 'map') setTimeout(() => map.invalidateSize(), 100);
  });
});

els.centerBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      updateMarker(pos.coords.latitude, pos.coords.longitude);
    });
  }
});

els.scanBtn.addEventListener('click', () => showModal('checkpoint'));
els.incidentBtn.addEventListener('click', () => showModal('incident'));

els.intervalSelect.addEventListener('change', () => {
  if (onDuty) startAutoTrack();
});

els.clearBtn.addEventListener('click', () => {
  if (confirm('Delete all local data? This cannot be undone.')) {
    points = [];
    onDuty = false;
    saveData();
    redrawTrail();
    updateDutyUI();
    refreshAll();
    stopAutoTrack();
  }
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ points, onDuty, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `patroltrack-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});

els.copyReport.addEventListener('click', () => {
  navigator.clipboard.writeText(els.reportContent.textContent).then(() => alert('Report copied!'));
});

els.modalSave.addEventListener('click', () => {
  if (currentModalType) {
    addPoint(currentModalType, els.modalNote.value.trim());
  }
  hideModal();
});

els.modalCancel.addEventListener('click', hideModal);

// Init
loadData();
initMap();
refreshAll();
if (onDuty) startAutoTrack();

window.addEventListener('resize', () => map && map.invalidateSize());
