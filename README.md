# Portfolio — Ben

Statische Portfolio-Website als Bewerbungshilfe.
**Kein Build-Schritt, keine Abhängigkeiten** — reines HTML/CSS/JS. Läuft direkt
im Browser und lässt sich unverändert auf jeden Webserver kopieren.

## Struktur

Das Repo-Root enthält nur Git-/Projekt-Meta (README, LICENSE, `.gitignore`,
`.gitattributes`). Die **komplette, deploybare Website** liegt gebündelt im
Unterordner `Portfolio_ForServer/` — genau dessen Inhalt wird auf den Server
geladen.

```
Portfolio/                   # Git-Root (nur Meta-Dateien)
├── README.md
├── LICENSE
├── .gitignore
├── .gitattributes
└── Portfolio_ForServer/     # → kompletter Server-Upload
    ├── index.php            # Auth-Gate + Router (WIP-Schutz, nicht im Git-Ignore)
    ├── config.php           # Passwort — NICHT im Git (.gitignore), separat hochladen
    ├── .htaccess            # sperrt Direktaufruf der *.html, DirectoryIndex index.php
    ├── ratelimit.dat        # Laufzeitdatei des Auth-Gates (gitignored)
    ├── index.html           # Landing / Hero + Werdegang + Skills
    ├── showcase.html        # Showcase-Hub (Kreativ | Entwicklung + „Woher ich komme")
    ├── creative.html        # Galerie: Animation/Film, Produkt, Echtzeit/VR, Fotografie
    ├── development.html     # Entwicklung: Fallstudien (NDA) + eigene Projekte
    ├── contact.html         # Kontaktdaten (Mail-Button, kein Formular)
    ├── tech/
    │   ├── styles.css       # komplettes Design-System (Farben/Abstände als Tokens)
    │   ├── i18n.js          # ALLE Übersetzungen (DE/EN) — nur hier Text ändern
    │   └── site.js          # Nav/Footer, Sprachumschaltung, Filter, Lightbox
    └── assets/
        ├── img/             # Bilder (profile.png + work-*.jpg = Platzhalter)
        └── files/
            └── cv-ben.pdf   # Lebenslauf zum Download  ← durch echtes PDF ersetzen
```

## Lokal ansehen

Aus dem Unterordner heraus starten (dort liegt die Website):

```bash
cd Portfolio_ForServer
python -m http.server 8000
# → http://localhost:8000
```

## Wie werden Bilder geladen?

- Bilder liegen in `assets/img/` und werden über **relative Pfade** eingebunden:
  `<img src="assets/img/work-01.jpg" loading="lazy" width="900" height="675">`
- `loading="lazy"` lädt Galeriebilder erst beim Scrollen (schnellere Startzeit).
- `width`/`height` reservieren den Platz und verhindern „Springen" beim Laden.
- Das Hero-Bild nutzt `fetchpriority="high"`, damit es sofort erscheint.

### Neues Showcase-Bild hinzufügen
1. Bild nach `assets/img/` legen (ideal als **WebP/AVIF**, dunkel, ~1600px breit).
2. In `showcase.html` eine `.tile` kopieren und `src` / `data-full` / Kategorie
   (`data-cat="3d|software|interactive"`) anpassen.
3. Titel/Text als Key in `tech/i18n.js` ergänzen (DE **und** EN).

## Übersetzungen (DE/EN)

Aktueller Standard-Ansatz: **Text getrennt vom Markup**.
- Im HTML steht nur ein Schlüssel: `data-i18n="hero.role"`.
- Der echte Text liegt in `tech/i18n.js` — pro Sprache ein Block.
- `site.js` setzt beim Laden und beim Umschalten den passenden Text; die Wahl
  wird im Browser gespeichert (`localStorage`).
- Fehlt ein Key in der aktiven Sprache, greift automatisch Deutsch als Rückfall.
- **Neue Sprache** = neuer Block in `i18n.js` + Eintrag in der `LINKS`-Sprachleiste.

Attribute werden über Zusatz-Keys übersetzt: `data-i18n-placeholder`,
`data-i18n-alt`, `data-i18n-aria`, `data-i18n-href`, `data-i18n-title` (Tooltip /
`<iframe title>`) und `data-i18n-content` (`<meta name="description">`, `og:*`).
Der Seitentitel hängt am `<title>`-Element selbst (`data-i18n="meta.*.title"`);
dort und bei den `<meta>`-Tags bleibt der deutsche Text zusätzlich im Markup
stehen, damit Crawler ohne JS etwas Sinnvolles sehen.

## Farben / Design anpassen

Alle Farben und Maße sind **Design-Tokens** ganz oben in `styles.css`
(`:root { --amber: … }`). Eine Änderung dort wirkt auf die ganze Seite.

## Noch zu erledigen (Platzhalter ersetzen)

- [ ] `assets/files/cv-ben.pdf` durch echten Lebenslauf ersetzen
- [ ] `[Nachname]` in `index.html` (Hero) durch echten Namen ersetzen
- [ ] `assets/img/work-*.jpg` (Testbilder) durch echte 3D-Arbeiten ersetzen
- [ ] Kontaktformular an Server-Endpunkt anbinden (siehe unten)
- [ ] Ggf. echte Jahreszahlen/Stationen im Lebenslauf (`i18n.js`, `about.*`) präzisieren

## Kontaktformular anbinden

Das Formular ist aktuell ein Platzhalter (`site.js` → `initForm`). Auf dem
eigenen Server an einen kleinen Endpunkt hängen (z. B. PHP/Node), der die
Nachricht per E-Mail verschickt. Empfehlung: serverseitige Validierung +
einfacher Spam-Schutz (Honeypot-Feld).

## WIP-Passwortschutz (Auth-Gate)

Solange die Seite in Arbeit ist, liegt sie hinter einem Passwort-Gate
(Mechanik wie beim WegZuzler): PHP-Cookie-Login mit Rate-Limit.

- `index.php` — Login-Formular **und** Seiten-Router. Nach dem Login liefert es
  die angeforderte Seite aus (`?p=showcase|creative|development|contact`,
  Standard: Landing). Die Schlüssel stehen in der Whitelist `$PAGES`.
- `config.php` — enthält das Passwort. **Nicht im Git** (`.gitignore`), muss beim
  Deployment separat auf den Server geladen werden.
- `.htaccess` — sperrt den Direktaufruf der `*.html` (Zugang nur übers Gate);
  `DirectoryIndex index.php`.
- `ratelimit.dat` — wird zur Laufzeit angelegt (Brute-Force-Schutz, gitignored).
- Interne Links laufen deshalb über `index.php?p=…` (siehe `LINKS` in `site.js`).

**Lokal testen** (mit PHP, dann greift das Gate wie auf dem Server):
```bash
cd Portfolio_ForServer
php -S 127.0.0.1:8090     # → http://127.0.0.1:8090
```

### Schutz später entfernen (wenn die Seite live gehen soll)
1. `index.php`, `config.php`, `.htaccess`, `ratelimit.dat` löschen.
2. In `tech/site.js` die `LINKS`-`href` und die beiden Brand-Links wieder auf
   `index.html` / `showcase.html` / `contact.html` zurücksetzen.
3. Alle `index.php?p=…`-Links in den HTML-Seiten auf die passende `.html`-Datei
   zurückstellen (`?p=creative` → `creative.html`, `?p=development` →
   `development.html` usw.).
→ Danach ist es wieder eine reine statische Seite ohne PHP.

## Deployment

- **Inhalt von `Portfolio_ForServer/`** in einen Unterordner `portfolio/` im
  Webroot des Servers legen (erreichbar unter `…/portfolio/`) — den Ordner
  `Portfolio_ForServer` selbst also nicht mit hochladen, nur seinen Inhalt. Von
  der Server-Startseite (Goneo-Repo) zeigt der „Portfolio"-Button bereits auf
  `portfolio/`.
- `config.php` separat hochladen (ist nicht im Git).
- Läuft auf Apache mit PHP (wie die übrigen Apps). Ohne aktiven WIP-Schutz genügt
  ein beliebiger Webserver, dann ist keine Laufzeitumgebung nötig.
