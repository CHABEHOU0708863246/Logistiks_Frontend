import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Le build Angular injecte les scripts d'amorçage en fin de <body>. Sur mobile,
 * leur exécution retarde le premier rendu de plusieurs secondes. On les remplace
 * par un chargeur qui attend le premier repaint : l'écran de démarrage statique
 * (index.html) s'affiche immédiatement, la feuille de style se charge, puis
 * Angular prend le relais (hydratation des pages prérendues).
 *
 * Ce script ne touche QUE les fichiers index.html du build de production.
 */
const browserDir = resolve('dist/Logistiks_Frontend/browser');
const staticLoginFragment = readFileSync(resolve('scripts/static-login.html'), 'utf8').replace(
  '__API_URL__',
  JSON.stringify('https://logistiks-backend.onrender.com')
);

function findIndexFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return findIndexFiles(full);
    }
    return entry === 'index.html' ? [full] : [];
  });
}

const scriptPattern =
  /<script src="(polyfills-[^"]+\.js)" type="module"><\/script>\s*<script src="(main-[^"]+\.js)" type="module"><\/script>/g;

function loaderFor(polyfills, main, styleHref) {
  return `<script>
(function () {
  var path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    // La page d'accueil est servie par la connexion statique ci-dessous :
    // Angular ne doit pas être téléchargé avant la connexion.
    return;
  }

  var started = false;

  function startApp() {
    if (started) {
      return;
    }
    started = true;

    var polyfills = document.createElement('script');
    polyfills.type = 'module';
    polyfills.src = '${polyfills}';
    polyfills.onload = function () {
      var main = document.createElement('script');
      main.type = 'module';
      main.src = '${main}';
      document.body.appendChild(main);
    };
    document.body.appendChild(polyfills);
  }

  function loadStylesThenBoot() {
    ${
      styleHref
        ? `var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '${styleHref}';
    link.onload = startApp;
    link.onerror = startApp;
    document.head.appendChild(link);`
        : 'startApp();'
    }
  }

  function schedule() {
    requestAnimationFrame(function () {
      setTimeout(loadStylesThenBoot, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }
})();
</script>`;
}

let processed = 0;

for (const indexPath of findIndexFiles(browserDir)) {
  let html = readFileSync(indexPath, 'utf8');
  const scripts = [...html.matchAll(scriptPattern)];

  // La page de redirection "/" ne contient pas de scripts : on la laisse telle quelle.
  if (scripts.length === 0) {
    continue;
  }

  if (scripts.length !== 1) {
    throw new Error(
      `defer-bootstrap: motif d'amorçage introuvable dans ${relative(browserDir, indexPath)} ` +
        `(${scripts.length} correspondance).`
    );
  }

  const [, polyfills, main] = scripts[0];
  const styleLink = html.match(/<link rel="stylesheet" href="(styles-[^"]+\.css)">/);
  const styleHref = styleLink ? styleLink[1] : null;
  if (styleLink) {
    html = html.replace(styleLink[0], '');
  }

  html = html.replace(scripts[0][0], loaderFor(polyfills, main, styleHref));

  if (relative(browserDir, indexPath) === 'index.html') {
    // La connexion statique n'utilise pas Angular : inutile de précharger ses
    // chunks avant que l'utilisateur ne se connecte.
    html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
    html = html.replace('</body>', `${staticLoginFragment}\n</body>`);
  }

  writeFileSync(indexPath, html, 'utf8');
  processed += 1;
  console.log(
    `defer-bootstrap: ${relative(browserDir, indexPath)} (${polyfills}, ${main}` +
      `${styleHref ? `, ${styleHref}` : ''}).`
  );
}

if (processed === 0) {
  throw new Error('defer-bootstrap: aucun index.html avec scripts trouvé.');
}
