(function () {
  const STORAGE_KEY = "sub_settings";
  const defaultSettings = { dark: false, fontSize: 16 };

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return v ? v : Object.assign({}, defaultSettings);
    } catch (e) {
      return Object.assign({}, defaultSettings);
    }
  }
  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      apply(settings);
      return true;
    } catch (e) {
      console.error("Could not save settings", e);
      return false;
    }
  }
  

  function apply(s) {
    const root = document.documentElement;
    if (s.dark) root.classList.add("dark");
    else root.classList.remove("dark");
    
    if (s.fontSize) {
      root.style.setProperty('--base-font-size', s.fontSize + 'px');
      document.body.style.fontSize = s.fontSize + 'px';
    } else {
      root.style.removeProperty('--base-font-size');
      document.body.style.fontSize = '';
    }
  }

  window.subSettings = { load, save, apply, defaultSettings };

  function initSettings() {
    try {
      const settings = load();
      apply(settings);
    } catch (e) {
      console.error("Erro ao aplicar configurações:", e);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
  } else {
    initSettings();
  }

  function initRoleToggle() {
    try {
      const email = localStorage.getItem("user_email") || "";
      let role = "student";
      if (email.endsWith("@professor.com")) role = "professor";
      else if (email.endsWith("@aluno.com")) role = "student";
      window.userRole = role;
      document.querySelectorAll("[data-role]").forEach((el) => {
        const r = (el.getAttribute("data-role") || "both").trim();
        if (r === "both") el.style.display = "";
        else el.style.display = r === role ? "" : "none";
      });
    } catch (e) {
      console.error(e);
    }
  }

  function initSettingsUI() {
    document.addEventListener("DOMContentLoaded", () => {
      initRoleToggle();
      const modal = document.getElementById("settingsModal");
      const openBtn = document.getElementById("openSettingsBtn");
      const closeBtn = document.getElementById("closeSettingsBtn");
      const saveBtn = document.getElementById("saveSettingsBtn");
      const resetBtn = document.getElementById("resetSettingsBtn");
      const darkToggle = document.getElementById("darkToggle");
      const fontRange = document.getElementById("fontRange");

      if (!modal) return;

      const s = load();
      if (darkToggle) darkToggle.checked = !!s.dark;
      if (fontRange) {
        fontRange.value = s.fontSize || 16;
        const fontValueDisplay = document.createElement('span');
        fontValueDisplay.id = 'fontValueDisplay';
        fontValueDisplay.style.marginLeft = '10px';
        fontValueDisplay.style.fontWeight = 'bold';
        fontValueDisplay.textContent = (s.fontSize || 16) + 'px';
        fontRange.parentElement.appendChild(fontValueDisplay);
        
        fontRange.addEventListener('input', (e) => {
          fontValueDisplay.textContent = e.target.value + 'px';
        });
      }

      function openModal() {
        const currentSettings = load();
        if (darkToggle) darkToggle.checked = !!currentSettings.dark;
        if (fontRange) {
          fontRange.value = currentSettings.fontSize || 16;
          const fontValueDisplay = document.getElementById('fontValueDisplay');
          if (fontValueDisplay) {
            fontValueDisplay.textContent = (currentSettings.fontSize || 16) + 'px';
          }
        }
        modal.style.display = "flex";
        modal.classList.add("open");
      }
      function closeModal() {
        modal.classList.remove("open");
        setTimeout(() => (modal.style.display = "none"), 220);
      }

      if (openBtn) openBtn.addEventListener("click", openModal);
      if (closeBtn) closeBtn.addEventListener("click", closeModal);
      if (window)
        window.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          const newS = {
            dark: !!(darkToggle && darkToggle.checked),
            fontSize: fontRange ? parseInt(fontRange.value, 10) : 16,
          };
          const ok = save(newS);
          if (ok) {
            const old = saveBtn.textContent;
            saveBtn.textContent = "Salvando...";
            setTimeout(() => {
              saveBtn.textContent = "Salvar";
            }, 400);
            closeModal();
          } else {
            alert("Erro ao salvar configurações no navegador.");
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (confirm("Deseja restaurar todas as configurações para os valores padrão?")) {
            if (darkToggle) darkToggle.checked = defaultSettings.dark;
            if (fontRange) {
              fontRange.value = defaultSettings.fontSize;
              const fontValueDisplay = document.getElementById('fontValueDisplay');
              if (fontValueDisplay) {
                fontValueDisplay.textContent = defaultSettings.fontSize + 'px';
              }
            }
            
            const ok = save(defaultSettings);
            if (ok) {
              const originalText = resetBtn.textContent;
              const originalStyle = {
                background: resetBtn.style.background,
                color: resetBtn.style.color,
                borderColor: resetBtn.style.borderColor
              };
              
              resetBtn.textContent = "✓ Restaurado!";
              resetBtn.style.background = "#10b981";
              resetBtn.style.color = "white";
              resetBtn.style.borderColor = "#10b981";
              
              setTimeout(() => {
                resetBtn.textContent = originalText;
                resetBtn.style.background = originalStyle.background;
                resetBtn.style.color = originalStyle.color;
                resetBtn.style.borderColor = originalStyle.borderColor;
              }, 2000);
            } else {
              alert("Erro ao restaurar configurações padrão.");
            }
          }
        });
      }
    });
  }

  initSettingsUI();
})();
