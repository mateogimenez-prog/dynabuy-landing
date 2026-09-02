let allMeetings = { gironde: [], 'pays-basque-landes-bearn': [] };
let currentRegion = 'gironde';
let currentMeetings = [];

const REGION_LABELS = {
  'gironde': 'Gironde',
  'pays-basque-landes-bearn': 'Pays-Basque, Landes, Béarn'
};

const FALLBACK_URL = 'https://www.rencontres-dirigeants.com';

const CITY_DEPT = {
  'gan': 'Pyrénées-Atlantiques', 'pau': 'Pyrénées-Atlantiques',
  'lons': 'Pyrénées-Atlantiques', 'bayonne': 'Pyrénées-Atlantiques',
  'anglet': 'Pyrénées-Atlantiques', 'biarritz': 'Pyrénées-Atlantiques',
  'hendaye': 'Pyrénées-Atlantiques', 'saint-jean-de-luz': 'Pyrénées-Atlantiques',
  'orthez': 'Pyrénées-Atlantiques', 'oloron-sainte-marie': 'Pyrénées-Atlantiques',
  'dax': 'Landes', 'mont-de-marsan': 'Landes', 'biscarrosse': 'Landes',
  'mimizan': 'Landes', 'parentis-en-born': 'Landes', 'soustons': 'Landes',
  'saint-paul-lès-dax': 'Landes', 'morcenx': 'Landes',
};

function getDept(city, region) {
  if (region === 'gironde') return 'Gironde';
  return CITY_DEPT[city.toLowerCase()] || '';
}

const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/mateogimenez-prog/dynabuy-landing/main/data/meetings.json';

async function loadMeetings() {
  const sources = ['data/meetings.json', GITHUB_DATA_URL];
  for (const url of sources) {
    try {
      const res = await fetch(url + '?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allMeetings = await res.json();
      break;
    } catch (e) {
      console.warn('Source indisponible (' + url + '):', e.message);
    }
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
  currentMeetings = filterUpcoming(allMeetings[region]);
  renderTable(currentMeetings);
  renderCards(currentMeetings);
}

function renderTable(meetings) {
  const tbody = document.getElementById('meetings-tbody');
  if (!meetings.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Aucune réunion à venir dans les 2 prochains mois.</td></tr>';
    return;
  }
  tbody.innerHTML = meetings.map((m, i) => {
    const dept = getDept(m.city || '', currentRegion);
    const cityLine = dept ? `${escHtml(m.city || '')} · <em>${escHtml(dept)}</em>` : escHtml(m.city || '');
    return `
    <tr>
      <td class="cell-date">
        <em>${escHtml(m.date)}</em>
        <span>${escHtml(m.time || '')}</span>
        <button class="btn-calendar" onclick="addToCalendar(${i})" title="Ajouter au calendrier">${CAL_ICON}</button>
      </td>
      <td class="cell-btn">
        <a href="${escAttr(m.registrationUrl || FALLBACK_URL)}" target="_blank" rel="noopener" class="btn-register">Inscrivez-vous ici !</a>
      </td>
      <td class="cell-venue">
        <strong>${escHtml(m.venue || 'À confirmer')}</strong>
        <span>${cityLine}</span>
      </td>
      <td class="cell-type">${escHtml(m.type || '')}</td>
    </tr>`;
  }).join('');
}

function renderCards(meetings) {
  const container = document.getElementById('meetings-cards');
  if (!meetings.length) {
    container.innerHTML = '<p class="loading-cell">Aucune réunion à venir dans les 2 prochains mois.</p>';
    return;
  }
  container.innerHTML = meetings.map((m, i) => `
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
        <span>${escHtml(m.city || '')}${getDept(m.city || '', currentRegion) ? ' · ' + getDept(m.city || '', currentRegion) : ''}</span>
      </div>
      <div class="card-actions">
        <a href="${escAttr(m.registrationUrl || FALLBACK_URL)}" target="_blank" rel="noopener" class="btn-register">Inscrivez-vous ici !</a>
        <button class="btn-calendar" onclick="addToCalendar(${i})" title="Ajouter au calendrier">${CAL_ICON}</button>
      </div>
    </div>
  `).join('');
}

const CAL_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

function addToCalendar(idx) {
  const m = currentMeetings[idx];
  if (!m) return;
  const t = (m.time || '').match(/(\d+)h(\d+)\s*[àa]\s*(\d+)h(\d+)/);
  const d = (m.dateISO || '').replace(/-/g, '');
  const pad = n => String(n).padStart(2, '0');
  const dtStart = t ? `${d}T${pad(t[1])}${pad(t[2])}00` : d;
  const dtEnd   = t ? `${d}T${pad(t[3])}${pad(t[4])}00` : d;
  const summary = `Rencontre Dirigeants – ${m.venue || 'Dynabuy'}, ${m.city || ''}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dynabuy NA//FR',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Europe/Paris:${dtStart}`,
    `DTEND;TZID=Europe/Paris:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${m.venue || ''}, ${m.city || ''}`,
    `URL:${m.registrationUrl || FALLBACK_URL}`,
    `DESCRIPTION:Inscrivez-vous : ${m.registrationUrl || FALLBACK_URL}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  a.download = `rencontre-${m.dateISO || 'dynabuy'}.ics`;
  a.click();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(s) {
  const url = String(s).replace(/"/g,'&quot;');
  return url.startsWith('http://') || url.startsWith('https://') ? url : FALLBACK_URL;
}

loadMeetings();
