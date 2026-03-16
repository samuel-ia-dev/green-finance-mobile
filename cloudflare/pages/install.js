(() => {
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
})();