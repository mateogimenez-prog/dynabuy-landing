let allMeetings = { gironde: [], 'pays-basque-landes-bearn': [] };
let currentRegion = 'gironde';

const REGION_LABELS = {
  'gironde': 'Gironde',
  'pays-basque-landes-bearn': 'Pays-Basque, Landes, Béarn'
};

const FALLBACK_URL = 'https://www.rencontres-dirigeants.com';

async function loadMeetings() {
  try {
    const res = await fetch('data/meetings.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    allMeetings = await res.json();
  } catch (e) {
    console.error('Erreur chargement meetings.json:', e);
    allMeetings = { gironde: [], 'pays-basque-landes-bearn': [] };
  }
  renderBanner();
  renderMeetings(currentRegion);
}

function renderBanner() {
  // Prendre la réunion la plus proche toutes régions confondues
  const all = [
    ...(allMeetings.gironde || []),
    ...(allMeetings['pays-basque-landes-bearn'] || [])
  ].filter(m => m.dateISO >= new Date().toISOString().slice(0,10))
   .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const next = all[0];
  if (!next) return;

  const dateEl = document.getElementById('banner-date');
  const titleEl = document.getElementById('banner-title');
  const infoEl = document.getElementById('banner-info');
  const btnEl = document.getElementById('banner-btn');

  if (dateEl) dateEl.innerHTML = `<em>${escHtml(next.date)}</em><br>${escHtml(next.time)}`;
  if (titleEl) titleEl.innerHTML = `<strong>${escHtml(next.venue !== 'À confirmer' ? next.venue : 'Rencontre Dirigeants')}</strong><br><span>${escHtml(next.city)}</span>`;
  if (infoEl) infoEl.textContent = next.type || 'Rencontre Dirigeants';
  if (btnEl) { btnEl.href = next.registrationUrl || FALLBACK_URL; }
}

function switchRegion(region) {
  currentRegion = region;
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.region === region);
  });
  document.getElementById('region-banner').textContent = REGION_LABELS[region];
  renderMeetings(region);
}

function filterUpcoming(meetings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoMonths = new Date(today);
  twoMonths.setMonth(today.getMonth() + 2);
  return (meetings || []).filter(m => {
    if (!m.dateISO) return true;
    const d = new Date(m.dateISO);
    return d >= today && d <= twoMonths;
  });
}

function renderMeetings(region) {
  const meetings = filterUpcoming(allMeetings[region]);
  renderTable(meetings);
  renderCards(meetings);
}

function renderTable(meetings) {
  const tbody = document.getElementById('meetings-tbody');
  if (!meetings.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Aucune réunion à venir dans les 2 prochains mois.</td></tr>';
    return;
  }
  tbody.innerHTML = meetings.map(m => `
    <tr>
      <td class="cell-date">
        <em>${escHtml(m.date)}</em>
        <span>${escHtml(m.time || '')}</span>
      </td>
      <td class="cell-btn">
        <a href="${escAttr(m.registrationUrl || FALLBACK_URL)}" target="_blank" rel="noopener" class="btn-register">Inscrivez-vous ici !</a>
      </td>
      <td class="cell-venue">
        <strong>${escHtml(m.venue || 'À confirmer')}</strong>
        <span>${escHtml(m.city || '')}</span>
      </td>
      <td class="cell-type">${escHtml(m.type || '')}</td>
    </tr>
  `).join('');
}

function renderCards(meetings) {
  const container = document.getElementById('meetings-cards');
  if (!meetings.length) {
    container.innerHTML = '<p class="loading-cell">Aucune réunion à venir dans les 2 prochains mois.</p>';
    return;
  }
  container.innerHTML = meetings.map(m => `
    <div class="meeting-card-mobile">
      <div class="card-header">
        <div class="card-date">
          <em>${escHtml(m.date)}</em>
          <small>${escHtml(m.time || '')}</small>
        </div>
        <span class="card-type">${escHtml(m.type || '')}</span>
      </div>
      <div class="card-venue">
        <strong>${escHtml(m.venue || 'À confirmer')}</strong>
        <span>${escHtml(m.city || '')}</span>
      </div>
      <div class="card-actions">
        <a href="${escAttr(m.registrationUrl || FALLBACK_URL)}" target="_blank" rel="noopener" class="btn-register">Inscrivez-vous ici !</a>
      </div>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  const url = String(s).replace(/"/g,'&quot;');
  return url.startsWith('http://') || url.startsWith('https://') ? url : FALLBACK_URL;
}

loadMeetings();
