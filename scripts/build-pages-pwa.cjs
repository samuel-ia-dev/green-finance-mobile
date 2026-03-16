const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const pagesDir = path.join(rootDir, "cloudflare", "pages");
const workerPath = path.join(pagesDir, "_worker.js");

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} not found: ${targetPath}`);
  }
}

function removeEntry(targetPath) {
  fs.rmSync(targetPath, {
    force: true,
    recursive: true
  });
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function findWebIcon() {
  const iconDir = path.join(pagesDir, "assets", "assets");

  if (!fs.existsSync(iconDir)) {
    return "/favicon.ico";
  }

  const iconFile = fs
    .readdirSync(iconDir)
    .find((entry) => entry.startsWith("icon.") && entry.endsWith(".png"));

  return iconFile ? `/assets/assets/${iconFile}` : "/favicon.ico";
}

function enhanceIndexHtml(iconPath) {
  const indexPath = path.join(pagesDir, "index.html");
  const rawHtml = fs.readFileSync(indexPath, "utf8");

  const headInjection = `
    <meta name="theme-color" content="#0B1020" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Green Finance" />
    <meta name="mobile-web-app-capable" content="yes" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${iconPath}" />
    <style id="green-finance-install">
      #gf-install {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 9999;
        padding: 16px;
        display: flex;
        justify-content: center;
        pointer-events: none;
      }

      #gf-install[hidden] {
        display: none;
      }

      #gf-install-card {
        width: min(100%, 420px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(7, 12, 24, 0.96);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        color: #f8fafc;
        padding: 18px;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #gf-install-head {
        display: flex;
        gap: 14px;
        align-items: center;
      }

      #gf-install-icon {
        width: 60px;
        height: 60px;
        border-radius: 18px;
        background: #ffffff;
        object-fit: cover;
        flex: 0 0 auto;
      }

      #gf-install-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
      }

      #gf-install-text {
        margin: 6px 0 0;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.45;
      }

      #gf-install-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
      }

      #gf-install-primary,
      #gf-install-secondary {
        border: 0;
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      #gf-install-primary {
        flex: 1;
        background: #f59e0b;
        color: #111827;
      }

      #gf-install-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
      }

      #gf-install-hint {
        margin-top: 12px;
        font-size: 12px;
        line-height: 1.5;
        color: #94a3b8;
      }
    </style>`;

  const bodyInjection = `
    <div id="gf-install" hidden>
      <div id="gf-install-card">
        <div id="gf-install-head">
          <img id="gf-install-icon" src="${iconPath}" alt="Green Finance" />
          <div>
            <h2 id="gf-install-title">Instale o Green Finance</h2>
            <p id="gf-install-text">No celular, o app fica melhor instalado: abre em tela cheia, fica mais estavel e funciona como aplicativo.</p>
          </div>
        </div>
        <div id="gf-install-actions">
          <button id="gf-install-primary" type="button">Instalar app</button>
          <button id="gf-install-secondary" type="button">Continuar no navegador</button>
        </div>
        <div id="gf-install-hint">Se o navegador nao mostrar o popup, use o menu e toque em "Adicionar a tela inicial" ou "Instalar app".</div>
      </div>
    </div>
    <script src="/install.js" defer></script>`;

  const nextHtml = rawHtml
    .replace("</head>", `${headInjection}\n</head>`)
    .replace("</body>", `${bodyInjection}\n</body>`);

  fs.writeFileSync(indexPath, nextHtml);
}

function writeManifest(iconPath) {
  const manifest = {
    name: "Green Finance",
    short_name: "Green Finance",
    description: "Controle suas financas no celular com experiencia de app instalado.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1020",
    theme_color: "#0B1020",
    prefer_related_applications: false,
    icons: [
      {
        src: iconPath,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: iconPath,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  fs.writeFileSync(path.join(pagesDir, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
}

function writeServiceWorker() {
  const serviceWorker = `const CACHE_NAME = "green-finance-pwa-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/install.js", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }

          return response;
        })
    )
  );
});`;

  fs.writeFileSync(path.join(pagesDir, "sw.js"), serviceWorker);
}

function writeInstallScript() {
  const installScript = `(() => {
  const promptRoot = document.getElementById("gf-install");
  const installButton = document.getElementById("gf-install-primary");
  const continueButton = document.getElementById("gf-install-secondary");
  const hint = document.getElementById("gf-install-hint");

  if (!promptRoot || !installButton || !continueButton || !hint) {
    return;
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const userAgent = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  let deferredPrompt = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }

  if (isStandalone) {
    promptRoot.hidden = true;
    return;
  }

  const showPrompt = () => {
    promptRoot.hidden = false;
  };

  const hidePrompt = () => {
    promptRoot.hidden = true;
  };

  const applyManualHint = () => {
    if (isIos) {
      hint.textContent = 'No iPhone: toque em Compartilhar e depois em "Adicionar a Tela de Inicio".';
      return;
    }

    if (isAndroid) {
      hint.textContent = 'No Android: toque no menu do navegador e escolha "Instalar app" ou "Adicionar a tela inicial".';
      return;
    }

    hint.textContent = 'Se o navegador nao abrir o popup, use o menu da pagina e procure por "Instalar app".';
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.textContent = "Instalar app";
    hint.textContent = "Toque em instalar para abrir o popup nativo do navegador.";
    showPrompt();
  });

  window.addEventListener("appinstalled", () => {
    hidePrompt();
    deferredPrompt = null;
  });

  installButton.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
      }
      deferredPrompt = null;
      applyManualHint();
      return;
    }

    applyManualHint();
    showPrompt();
  });

  continueButton.addEventListener("click", hidePrompt);

  setTimeout(() => {
    applyManualHint();
    showPrompt();
  }, 1200);
})();`;

  fs.writeFileSync(path.join(pagesDir, "install.js"), installScript);
}

function main() {
  assertExists(distDir, "dist");
  assertExists(workerPath, "pages worker");

  for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (entry.name === "_worker.js") {
      continue;
    }

    removeEntry(path.join(pagesDir, entry.name));
  }

  copyDirectory(distDir, pagesDir);

  const iconPath = findWebIcon();
  enhanceIndexHtml(iconPath);
  writeManifest(iconPath);
  writeServiceWorker();
  writeInstallScript();
}

main();
