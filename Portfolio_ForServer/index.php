<?php
/* =========================================================================
   Portfolio – Auth-Gate + Seiten-Router (WIP-Schutz)
   Mechanik nach Vorbild von WegZuzler: Cookie-Login, Rate-Limit, Login-Form.
   Solange der WIP-Schutz aktiv ist, laufen ALLE Seiten über diese Datei
   (die .htaccess sperrt den Direktzugriff auf die *.html).
   ========================================================================= */
require __DIR__ . '/config.php';

define('COOKIE_NAME', 'pfauth');
define('COOKIE_DAYS', 14);
define('COOKIE_PATH', '/portfolio/');
define('SALT',        '_pfSalt_9q2x');
define('AUTH_TOKEN',  hash('sha256', APP_PASSWORD . SALT));

// Rate-Limit gegen Brute-Force: pro IP (ohne Benutzerkonten der einzig
// sinnvolle Schlüssel).
define('RL_FILE',           __DIR__ . '/ratelimit.dat');
define('RL_MAX_ATTEMPTS',   5);
define('RL_WINDOW_SECONDS', 600); // 10 Minuten

// Whitelist der auslieferbaren Seiten. Kein direkter Dateiname aus der URL →
// kein Path-Traversal möglich.
$PAGES = [
    'home'        => 'index.html',
    'about'       => 'about.html',
    'showcase'    => 'showcase.html',
    'kreativ'     => 'kreativ.html',
    'entwicklung' => 'entwicklung.html',
    'contact'     => 'contact.html',
];

/* ---------- Rate-Limit ---------- */
function rlStatus($ip, $max, $window) {
    $count = 0; $oldest = null;
    if (is_file(RL_FILE)) {
        $fh = fopen(RL_FILE, 'r');
        if ($fh) {
            flock($fh, LOCK_SH);
            $now = time();
            while (($line = fgets($fh)) !== false) {
                $parts = explode(';', trim($line), 2);
                if (count($parts) !== 2) continue;
                [$lip, $ts] = $parts; $ts = (int)$ts;
                if ($lip === $ip && ($now - $ts) < $window) {
                    $count++;
                    if ($oldest === null || $ts < $oldest) $oldest = $ts;
                }
            }
            flock($fh, LOCK_UN); fclose($fh);
        }
    }
    $locked = $count >= $max;
    return ['locked' => $locked, 'retryAfter' => $locked ? max(1, $window - (time() - $oldest)) : 0];
}

function rlRegisterFailure($ip, $window) {
    $fh = fopen(RL_FILE, 'c+');
    if (!$fh) return;
    flock($fh, LOCK_EX);
    $now = time(); $kept = [];
    while (($line = fgets($fh)) !== false) {
        $parts = explode(';', trim($line), 2);
        if (count($parts) !== 2) continue;
        [$lip, $ts] = $parts;
        if (($now - (int)$ts) < $window) $kept[] = "$lip;$ts";
    }
    $kept[] = "$ip;$now";
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, implode("\n", $kept) . "\n");
    flock($fh, LOCK_UN); fclose($fh);
}

function rlFormatWait($seconds) {
    $minutes = (int) ceil($seconds / 60);
    return $minutes <= 1 ? 'etwa 1 Minute' : "etwa $minutes Minuten";
}

/* ---------- Logout ---------- */
if (isset($_GET['logout'])) {
    setcookie(COOKIE_NAME, '', time() - 3600, COOKIE_PATH, '', false, true);
    header('Location: ' . COOKIE_PATH);
    exit;
}

/* ---------- Eingeloggt → angeforderte Seite ausliefern ---------- */
if (isset($_COOKIE[COOKIE_NAME]) && hash_equals(AUTH_TOKEN, $_COOKIE[COOKIE_NAME])) {
    $key  = $_GET['p'] ?? 'home';
    $file = $PAGES[$key] ?? $PAGES['home'];
    readfile(__DIR__ . '/' . $file);
    exit;
}

$clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rl       = rlStatus($clientIp, RL_MAX_ATTEMPTS, RL_WINDOW_SECONDS);
$locked   = $rl['locked'];

/* ---------- Login-Versuch ---------- */
$error = false;
if (!$locked && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $eingabe = trim($_POST['password'] ?? '');
    if (hash_equals(AUTH_TOKEN, hash('sha256', $eingabe . SALT))) {
        setcookie(COOKIE_NAME, AUTH_TOKEN, time() + COOKIE_DAYS * 24 * 3600, COOKIE_PATH, '', false, true);
        header('Location: ' . $_SERVER['REQUEST_URI']);
        exit;
    }
    usleep(random_int(1000000, 2000000)); // künstliche Verzögerung
    rlRegisterFailure($clientIp, RL_WINDOW_SECONDS);
    $error = true;
}

if ($locked) {
    http_response_code(429);
    header('Retry-After: ' . $rl['retryAfter']);
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio – Login</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230c0a08'/><text x='50' y='68' font-size='58' font-family='monospace' font-weight='700' fill='%23f5a524' text-anchor='middle'>B</text></svg>">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0c0a08; --card: #14100c; --line: rgba(245,165,36,0.16);
      --line-soft: rgba(255,255,255,0.08); --ink: #f3ede2; --ink-soft: #b7ad9c;
      --ink-faint: #6f685c; --amber: #f5a524; --amber-hi: #ffc25c; --amber-deep: #c9791a;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace;
    }
    body {
      min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      background: var(--bg); color: var(--ink); padding: 20px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      position: relative; overflow: hidden;
    }
    /* dezenter indirekter Amber-Schein */
    body::before {
      content: ""; position: absolute; width: 560px; height: 560px; top: -200px; right: -160px;
      background: radial-gradient(circle, rgba(245,165,36,0.14), transparent 62%);
      filter: blur(80px); pointer-events: none;
    }
    .card {
      position: relative; background: var(--card); border: 1px solid var(--line-soft);
      border-radius: 16px; padding: 2.6rem 2rem; width: min(360px, 92vw);
      box-shadow: 0 24px 70px rgba(0,0,0,.55);
    }
    .brand { font-family: var(--mono); font-weight: 700; font-size: 1.2rem; text-align: center; margin-bottom: 1.6rem; }
    .brand b { color: var(--amber); }
    .brand .cursor { color: var(--amber); animation: blink 1.2s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    h1 { text-align: center; font-size: 1.3rem; font-weight: 600; margin-bottom: .3rem; }
    .sub { text-align: center; color: var(--ink-soft); font-size: .92rem; margin-bottom: 2rem; }
    .wip { display: inline-block; font-family: var(--mono); font-size: .6rem; letter-spacing: .12em;
      color: var(--amber); border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; margin-top: .5rem; }
    label { display: block; font-family: var(--mono); color: var(--ink-faint); font-size: .7rem;
      font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-bottom: .45rem; }
    .pw-wrap { position: relative; line-height: 0; }
    .pw-wrap input {
      display: block; width: 100%; padding: .75rem 3rem .75rem 1rem; background: var(--bg);
      border: 1px solid var(--line-soft); border-radius: 8px; color: var(--ink);
      font-size: 1rem; line-height: 1.3; outline: none; transition: border-color .15s;
    }
    .pw-wrap input:focus { border-color: var(--amber); }
    .pw-toggle {
      position: absolute; top: 0; bottom: 0; right: .35rem; margin-block: auto;
      width: 32px; height: 32px; border: none; background: transparent; color: var(--ink-faint);
      cursor: pointer; display: grid; place-items: center; border-radius: 8px; padding: 0;
    }
    .pw-toggle:hover { color: var(--ink); background: rgba(255,255,255,0.05); }
    .pw-toggle:disabled { cursor: not-allowed; opacity: .5; }
    .pw-toggle svg { width: 20px; height: 20px; }
    .err { margin-top: .5rem; color: var(--amber-hi); font-size: .8rem; }
    button[type=submit] {
      margin-top: 1.5rem; width: 100%; padding: .8rem; background: var(--amber); color: #1a1206;
      border: none; border-radius: 8px; font-size: .95rem; font-weight: 600; cursor: pointer;
      transition: background .15s, transform .1s;
    }
    button[type=submit]:hover { background: var(--amber-hi); }
    button[type=submit]:active { transform: scale(.98); }
    button:disabled, input:disabled { opacity: .5; cursor: not-allowed; }
    .back { display: block; margin-top: 1rem; text-align: center; color: var(--ink-faint);
      font-size: .85rem; text-decoration: none; }
    .back:hover { color: var(--ink-soft); }
    .hint { margin-top: 1.3rem; text-align: center; color: var(--ink-faint); font-size: .8rem; }
    :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">BEN<span class="cursor">_</span></div>
    <h1>Portfolio</h1>
    <p class="sub">In Arbeit – Zugang nur mit Passwort.<br><span class="wip">WIP</span></p>

    <form method="POST" autocomplete="on">
      <label for="pw">Passwort</label>
      <div class="pw-wrap">
        <input id="pw" type="password" name="password" autofocus autocomplete="current-password"
               required <?= $locked ? 'disabled' : '' ?>>
        <button type="button" class="pw-toggle" id="pwToggle" aria-label="Passwort anzeigen" aria-pressed="false" <?= $locked ? 'disabled' : '' ?>>
          <svg id="pwToggleIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
      <?php if ($locked): ?>
        <p class="err">Zu viele Fehlversuche. Bitte <?= rlFormatWait($rl['retryAfter']) ?> warten.</p>
      <?php elseif ($error): ?>
        <p class="err">Falsches Passwort.</p>
      <?php endif; ?>
      <button type="submit" <?= $locked ? 'disabled' : '' ?>>Anmelden</button>
    </form>
    <a href="/" class="back">← Zurück zur Startseite</a>

    <p class="hint">Zugang wird <?= COOKIE_DAYS ?> Tage im Browser gespeichert.</p>
  </div>

  <script>
    (function () {
      var input = document.getElementById('pw');
      var toggle = document.getElementById('pwToggle');
      var icon = document.getElementById('pwToggleIcon');
      if (!input || !toggle) return;
      var eyeOpen = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle>';
      var eyeOff = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.4 20.4 0 0 1 4.22-5.36M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a20.4 20.4 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      toggle.addEventListener('click', function () {
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        icon.innerHTML = showing ? eyeOpen : eyeOff;
        toggle.setAttribute('aria-pressed', String(!showing));
        toggle.setAttribute('aria-label', showing ? 'Passwort anzeigen' : 'Passwort verbergen');
      });
    })();
  </script>
</body>
</html>
