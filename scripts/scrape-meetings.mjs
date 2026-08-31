import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'data', 'meetings.json');
const SOURCE_URL = 'https://www.rencontres-dirigeants.com/nos-rencontres?region=&startAt=&endAt=&dateRange=&format=&agency%5B%5D=274&agency%5B%5D=110&agency%5B%5D=254&department=';

const TARGET_ANIMATORS = ['Tanguy Baricault', 'Patricia Gratas', 'Michaël Gimenez', 'Michael Gimenez'];

const GIRONDE_KEYWORDS = [
  'bordeaux', 'mérignac', 'merignac', 'saint-émilion', 'saint emilion',
  'libournais', 'libourne', 'haillan', 'bègles', 'begles', 'pessac',
  'talence', 'villenave', 'cenon', 'floirac', 'lormont', 'ambares',
  'ambarès', 'blaye', 'pauillac', 'lesparre', 'arcachon', 'gujan',
  'la teste', 'langon', 'podensac', 'créon', 'creon', 'carbon-blanc',
  'bassens', 'blanquefort', 'eysines', 'le bouscat', 'bruges', 'gironde'
];

const PAYS_BASQUE_LANDES_KEYWORDS = [
  'dax', 'bayonne', 'pau', 'gan', 'lons', 'biarritz', 'anglet',
  'hendaye', 'saint-jean', 'mauléon', 'oloron', 'orthez', 'tarnos',
  'mont-de-marsan', 'mont de marsan', 'soustons', 'capbreton',
  'hossegor', 'biscarrosse', 'mimizan', 'parentis', 'st paul les dax',
  'saint paul les dax', 'landes', 'pyrénées', 'pyrenees', 'béarn', 'bearn', 'basque'
];

// Mois en toutes lettres et abrégés (français)
const MONTH_MAP = {
  'janvier': '01', 'janv': '01', 'janv.': '01',
  'février': '02', 'févr': '02', 'févr.': '02', 'fev': '02', 'fév': '02',
  'mars': '03',
  'avril': '04', 'avr': '04', 'avr.': '04',
  'mai': '05',
  'juin': '06',
  'juillet': '07', 'juil': '07', 'juil.': '07',
  'août': '08', 'aout': '08', 'aoû': '08',
  'septembre': '09', 'sept': '09', 'sept.': '09',
  'octobre': '10', 'oct': '10', 'oct.': '10',
  'novembre': '11', 'nov': '11', 'nov.': '11',
  'décembre': '12', 'decembre': '12', 'déc': '12', 'dec': '12', 'déc.': '12',
};

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAY_NAMES_CAP = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_LABELS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function classifyRegion(text) {
  const t = text.toLowerCase();
  if (GIRONDE_KEYWORDS.some(k => t.includes(k))) return 'gironde';
  if (PAYS_BASQUE_LANDES_KEYWORDS.some(k => t.includes(k))) return 'pays-basque-landes-bearn';
  return null;
}

// Parse "3 sept. 2026" ou "3 septembre 2026" → { iso, label }
function parseDate(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.toLowerCase().replace(/\./g, '').trim();
  const parts = clean.split(/[\s,]+/);
  let day = null, month = null, year = new Date().getFullYear();

  for (const part of parts) {
    if (/^\d{1,2}$/.test(part)) day = parseInt(part);
    else if (/^\d{4}$/.test(part)) year = parseInt(part);
    else if (MONTH_MAP[part]) month = parseInt(MONTH_MAP[part]);
  }

  if (!day || !month) return null;

  const d = new Date(year, month - 1, day);
  const dayName = DAY_NAMES_CAP[d.getDay()];
  const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const label = `${dayName} ${day} ${MONTH_LABELS[month]}`;
  return { iso, label };
}

function isWithinTwoMonths(dateISO) {
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = new Date(today); limit.setMonth(today.getMonth() + 2);
  const d = new Date(dateISO);
  return d >= today && d <= limit;
}

async function scrape() {
  console.log('🚀 Démarrage du scraping Dynabuy...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });

  console.log('📡 Navigation...');
  try {
    await page.goto(SOURCE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
  }

  // Scroll pour déclencher le lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/tmp/dynabuy-debug.png', fullPage: true });
  console.log('📸 Capture: /tmp/dynabuy-debug.png');

  // ── Extraction depuis les cartes .card-meeting ────────────────────────────
  // Structure réelle du site :
  //   h3.no-rfs                  → city
  //   .card-meeting-body-badge   → date ("3 sept. 2026")
  //   .card-meeting-body-hours   → time ("18h00 à 20h30")
  //   .card-meeting-body-agency h2 → animator name
  //   .card-rd-action a          → inscription URL
  //   .card-meeting-meeting-format-* → format label
  const rawCards = await page.evaluate(() => {
    const cards = document.querySelectorAll('.card-meeting');
    return [...cards].map(card => {
      const t = sel => card.querySelector(sel)?.innerText?.trim() || '';
      const attr = (sel, a) => card.querySelector(sel)?.getAttribute(a) || '';

      const city = t('h3.no-rfs') || t('h3');
      const dateBadge = t('.card-meeting-body-badge');
      const hours = t('.card-meeting-body-hours');
      const animatorName = t('.card-meeting-body-agency h2');

      // URL d'inscription : lien avec #inscription en priorité
      const inscriptionLink = card.querySelector('.card-rd-action a')?.href
        || card.querySelector('a[href*="inscription"]')?.href
        || card.querySelector('a')?.href
        || '';

      // Format : face-to-face, meal, etc. → on dérive le type
      const formatClass = [...card.querySelectorAll('[class*="meeting-format"]')]
        .map(el => el.className).join(' ');

      return { city, dateBadge, hours, animatorName, inscriptionLink, formatClass };
    });
  });

  await browser.close();

  console.log(`\n📋 ${rawCards.length} cartes trouvées`);

  // ── Parsing et filtrage ───────────────────────────────────────────────────
  const meetings = [];

  for (const card of rawCards) {
    // Filtrer par animateur
    const animatorFound = TARGET_ANIMATORS.find(a =>
      (card.animatorName || '').toLowerCase().includes(a.toLowerCase())
    );
    if (!animatorFound) continue;

    // Parser la date
    const parsed = parseDate(card.dateBadge);
    if (!parsed) { console.log(`  ⚠️  Date non parsée: "${card.dateBadge}"`); continue; }

    // Filtrer par fenêtre 2 mois
    if (!isWithinTwoMonths(parsed.iso)) {
      console.log(`  ⏭  Hors fenêtre: ${parsed.label}`);
      continue;
    }

    // Dériver le type depuis l'heure de début
    let type = 'Matinale';
    const fc = card.formatClass.toLowerCase();
    if (fc.includes('meal')) {
      type = 'Déjeuner';
    } else {
      const hourMatch = (card.hours || '').match(/^(\d{1,2})h/);
      const startHour = hourMatch ? parseInt(hourMatch[1]) : 9;
      if (startHour >= 18) type = 'Afterwork';
      else if (startHour >= 14) type = 'Après-midi';
      else type = 'Matinale';
    }

    const city = card.city || 'À confirmer';
    const region = classifyRegion(city);

    const meeting = {
      date: parsed.label,
      dateISO: parsed.iso,
      time: card.hours || '',
      venue: 'À confirmer',   // non disponible sur la page liste
      city,
      type,
      registrationUrl: card.inscriptionLink || 'https://www.rencontres-dirigeants.com',
    };

    if (region) {
      meetings.push({ ...meeting, _region: region });
      console.log(`  ✅ [${region}] ${parsed.label} — ${city} (${type})`);
    } else {
      console.log(`  ⚠️  Région inconnue: "${city}"`);
    }
  }

  console.log(`\n✅ ${meetings.length} réunions valides trouvées`);
  return meetings;
}

async function main() {
  let scrapedMeetings;
  try {
    scrapedMeetings = await scrape();
  } catch (err) {
    console.error('\n❌ Échec du scraping:', err.message);
    console.error('meetings.json NON modifié (protection).');
    process.exit(1);
  }

  if (!scrapedMeetings || scrapedMeetings.length === 0) {
    console.warn('\n⚠️  Aucune réunion trouvée. meetings.json non écrasé.');
    process.exit(1);
  }

  const result = {
    lastUpdated: new Date().toISOString(),
    gironde: [],
    'pays-basque-landes-bearn': [],
  };

  for (const m of scrapedMeetings) {
    const { _region, ...clean } = m;
    result[_region]?.push(clean);
  }

  for (const region of ['gironde', 'pays-basque-landes-bearn']) {
    result[region].sort((a, b) => (a.dateISO || '').localeCompare(b.dateISO || ''));
  }

  console.log(`\n📊 Résumé:`);
  console.log(`  Gironde: ${result.gironde.length} réunion(s)`);
  console.log(`  Pays-Basque/Landes/Béarn: ${result['pays-basque-landes-bearn'].length} réunion(s)`);

  await writeFile(DATA_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n💾 meetings.json mis à jour !`);
}

main();
