# Portfolio — Ben

Statische Portfolio-Website als Bewerbungshilfe.
**Kein Build-Schritt, keine Abhängigkeiten** — reines HTML/CSS/JS. Läuft direkt
im Browser und lässt sich unverändert auf jeden Webserver kopieren.

## Struktur

```
Portfolio/
├── index.html          # Landing / Hero (Porträt-Foto)
├── about.html          # Über mich / Lebenslauf (Timeline + Skills)
├── showcase.html       # Galerie (3D) + Software-Cases (NDA)
├── contact.html        # Kontaktformular + Kontaktdaten
├── assets/
│   ├── css/styles.css  # komplettes Design-System (Farben/Abstände als Tokens)
│   ├── js/
│   │   ├── i18n.js     # ALLE Übersetzungen (DE/EN) — nur hier Text ändern
│   │   └── site.js     # Nav/Footer, Sprachumschaltung, Filter, Lightbox
│   └── img/            # Bilder (profile.png + work-*.jpg = Platzhalter)
├── files/
│   └── cv-ben.pdf      # Lebenslauf zum Download  ← durch echtes PDF ersetzen
└── sources/            # Original-Quellbilder (nicht Teil der Website)
```

## Lokal ansehen

Einfach `index.html` im Browser öffnen — oder mit einem kleinen Server
(damit relative Pfade & Formular sauber laufen):

```bash
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
3. Titel/Text als Key in `assets/js/i18n.js` ergänzen (DE **und** EN).

## Übersetzungen (DE/EN)

Aktueller Standard-Ansatz: **Text getrennt vom Markup**.
- Im HTML steht nur ein Schlüssel: `data-i18n="hero.role"`.
- Der echte Text liegt in `assets/js/i18n.js` — pro Sprache ein Block.
- `site.js` setzt beim Laden und beim Umschalten den passenden Text; die Wahl
  wird im Browser gespeichert (`localStorage`).
- **Neue Sprache** = neuer Block in `i18n.js` + Eintrag in der `LINKS`-Sprachleiste.

Attribute werden über Zusatz-Keys übersetzt: `data-i18n-placeholder`,
`data-i18n-alt`, `data-i18n-aria`.

## Farben / Design anpassen

Alle Farben und Maße sind **Design-Tokens** ganz oben in `styles.css`
(`:root { --amber: … }`). Eine Änderung dort wirkt auf die ganze Seite.

## Noch zu erledigen (Platzhalter ersetzen)

- [ ] `files/cv-ben.pdf` durch echten Lebenslauf ersetzen
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
  die angeforderte Seite aus (`?p=about|showcase|contact`, Standard: Landing).
- `config.php` — enthält das Passwort. **Nicht im Git** (`.gitignore`), muss beim
  Deployment separat auf den Server geladen werden.
- `.htaccess` — sperrt den Direktaufruf der `*.html` (Zugang nur übers Gate);
  `DirectoryIndex index.php`.
- `ratelimit.dat` — wird zur Laufzeit angelegt (Brute-Force-Schutz, gitignored).
- Interne Links laufen deshalb über `index.php?p=…` (siehe `LINKS` in `site.js`).

**Lokal testen** (mit PHP, dann greift das Gate wie auf dem Server):
```bash
php -S 127.0.0.1:8090     # → http://127.0.0.1:8090
```

### Schutz später entfernen (wenn die Seite live gehen soll)
1. `index.php`, `config.php`, `.htaccess`, `ratelimit.dat` löschen.
2. In `assets/js/site.js` die `LINKS`-`href` und die beiden Brand-Links wieder auf
   `index.html` / `about.html` / `showcase.html` / `contact.html` zurücksetzen.
3. In `index.html` (`index.php?p=showcase`) und `about.html` (`index.php?p=contact`)
   die Links auf die `.html`-Dateien zurückstellen.
→ Danach ist es wieder eine reine statische Seite ohne PHP.

## Deployment

- **Portfolio** in einen Unterordner `portfolio/` im Webroot des Servers legen
  (erreichbar unter `…/portfolio/`). Von der Server-Startseite (Goneo-Repo) zeigt
  der „Portfolio"-Button bereits auf `portfolio/`.
- `config.php` separat hochladen (ist nicht im Git).
- Läuft auf Apache mit PHP (wie die übrigen Apps). Ohne aktiven WIP-Schutz genügt
  ein beliebiger Webserver, dann ist keine Laufzeitumgebung nötig.
