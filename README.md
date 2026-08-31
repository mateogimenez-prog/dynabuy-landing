# Dynabuy Nouvelle-Aquitaine — Landing Page

Landing page automatisée affichant les prochaines Rencontres Dirigeants animées par l'équipe Dynabuy Nouvelle-Aquitaine (Gironde, Pays-Basque, Landes, Béarn).

## Structure du projet

```
dynabuy-landing/
├── .github/
│   └── workflows/
│       └── scrape-daily.yml   # Workflow GitHub Actions (scraping quotidien 05h00)
├── scripts/
│   └── scrape-meetings.mjs    # Script de scraping Playwright
├── data/
│   └── meetings.json          # Données des réunions (mis à jour automatiquement)
├── public/
│   ├── logo-dynabuy.png       # À ajouter manuellement
│   ├── patricia-gratas.jpg    # À ajouter manuellement
│   ├── michael-gimenez.jpg    # À ajouter manuellement
│   ├── tanguy-baricault.jpg   # À ajouter manuellement
│   ├── event-banner.jpg       # À ajouter manuellement
│   └── faq-illustration.png   # À ajouter manuellement
├── index.html                 # Landing page principale
├── style.css                  # Styles
├── app.js                     # JS frontend (chargement dynamique des réunions)
└── package.json
```

## Lancer le scraper manuellement en local

### Prérequis

```bash
npm install
npx playwright install chromium
```

### Exécution

```bash
npm run scrape
# ou directement :
node scripts/scrape-meetings.mjs
```

Le script :
1. Navigue sur rencontres-dirigeants.com avec un navigateur headless
2. Extrait les réunions des 3 animateurs dans les 2 prochains mois
3. Met à jour `data/meetings.json` si des données valides sont trouvées
4. En cas d'échec, **ne modifie pas** `meetings.json` et retourne exit code 1

### Lancer la page en local

```bash
npm run dev
# Ouvre http://localhost:3000
```

## Lire les logs si le scraping échoue

### En local

Les logs s'affichent dans le terminal. En cas de problème HTML non reconnu :
- Consulter `/tmp/dynabuy-debug.png` (capture d'écran de la page au moment du scraping)
- Le script affiche les classes CSS trouvées sur la page pour aider à adapter les sélecteurs

### Sur GitHub Actions

1. Aller dans l'onglet **Actions** du dépôt
2. Cliquer sur le workflow ayant échoué
3. Ouvrir l'étape **Run scraper** pour voir les logs détaillés

En cas d'échec, le fichier `meetings.json` est automatiquement restauré depuis la sauvegarde.

## Adapter les sélecteurs CSS

Si le site rencontres-dirigeants.com change sa structure HTML, modifier le tableau `candidateSelectors` dans `scripts/scrape-meetings.mjs` :

```javascript
const candidateSelectors = [
  '.meeting-card',   // Ajouter ici le nouveau sélecteur
  '.event-card',
  // ...
];
```

Les logs affichent les classes CSS présentes sur la page pour faciliter l'identification du bon sélecteur.

## Modifier la fenêtre temporelle

Par défaut, seules les réunions dans les **2 prochains mois** sont affichées.

Pour changer cette fenêtre :

**Dans le script de scraping** (`scripts/scrape-meetings.mjs`, fonction `isWithinTwoMonths`) :
```javascript
twoMonthsLater.setMonth(today.getMonth() + 2); // Changer 2 par le nombre de mois souhaité
```

**Dans le JS frontend** (`app.js`, fonction `filterUpcoming`) :
```javascript
twoMonths.setMonth(today.getMonth() + 2); // Idem ici
```

## Ajouter les images manuellement

Placer les fichiers suivants dans le dossier `public/` :

| Fichier | Description |
|---|---|
| `logo-dynabuy.png` | Logo Dynabuy (recommandé : fond transparent, largeur ~300px) |
| `patricia-gratas.jpg` | Photo de Patricia Gratas (format carré) |
| `michael-gimenez.jpg` | Photo de Michaël Gimenez (format carré) |
| `tanguy-baricault.jpg` | Photo de Tanguy Baricault (format carré) |
| `event-banner.jpg` | Image de fond du bandeau événement (largeur ~1600px) |
| `faq-illustration.png` | Illustration section FAQ (largeur ~500px) |

Sans ces images, la page affiche un logo textuel et des cercles colorés à la place des photos.

## Automatisation GitHub Actions

Le workflow `.github/workflows/scrape-daily.yml` s'exécute tous les jours à **05h00 heure de Paris**.

Il peut aussi être déclenché manuellement depuis l'onglet **Actions** > **Scrape Dynabuy Meetings** > **Run workflow**.

### Prérequis GitHub

- Le dépôt doit être public **ou** disposer de GitHub Actions activé
- Le workflow a la permission `contents: write` pour committer `meetings.json`
- Aucun secret n'est nécessaire (le scraping est public)

## Déploiement

La page est un site statique (HTML + CSS + JS + JSON). Elle peut être hébergée sur :
- **GitHub Pages** : activer dans Settings > Pages > Deploy from branch `main` / `root`
- **Netlify / Vercel** : déposer le dossier ou connecter le dépôt GitHub
- **Tout hébergeur web statique**

> Note : le scraping via GitHub Actions requiert que le dépôt soit connecté à GitHub.
