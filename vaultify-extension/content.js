// ------------------ Storage Helpers ------------------
function storeEmail(email) {
  if (email) {
    chrome.storage.local.set({ vaultify_email: email }, () => {
      console.log("📥 Email stored:", email);
    });
    sessionStorage.setItem("vaultify_email", email);
  }
}

function fetchStoredEmail(callback) {
  chrome.storage.local.get(["vaultify_email"], (result) => {
    const emailFromLocal = result.vaultify_email || "";
    const emailFromSession = sessionStorage.getItem("vaultify_email") || "";
    const finalEmail = emailFromLocal || emailFromSession;
    callback(finalEmail);
  });
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: sans-serif;
    z-index: 9999999;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ------------------ Duplicate Tracker ------------------
const savedCombinations = new Set(); // email+password per session

// ------------------ Main Logic ------------------
function attachListenerToForm(form) {
  if (form.dataset.vaultifyBound) return; // Already attached

  form.dataset.vaultifyBound = "true"; // Prevent multiple bindings

  form.addEventListener("submit", () => {
    const emailInput = form.querySelector(
      'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
    );
    const passwordInput = form.querySelector(
      'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
    );

    if (!emailInput || !passwordInput) {
      console.warn("⚠️ Email or password field not found in form");
      return;
    }
    if (!emailInput.value || !passwordInput.value) {
      console.warn("⚠️ Email or password field empty");
      return;
    }

    storeEmail(emailInput.value);

    fetchStoredEmail((storedEmail) => {
      if (!storedEmail) {
        console.warn("⚠️ No stored email found.");
        showToast("⚠️ Vaultify: Missing email for password save.");
        return;
      }

      const comboKey = `${storedEmail}::${passwordInput.value}`;
      if (savedCombinations.has(comboKey)) {
        console.log("⏩ Skipping duplicate password save for this session.");
        return;
      }
      savedCombinations.add(comboKey);

      const creds = {
        account: window.location.hostname || "unknown",
        username: storedEmail,
        password: passwordInput.value,
      };

      chrome.runtime.sendMessage({ action: "savePassword", creds }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showToast("⚠️ Vaultify: Failed to save password.");
        } else {
          showToast("✅ Vaultify: Password saved!");
        }
      });
    });
  });
}

function observeForms() {
  const observer = new MutationObserver(() => {
    document.querySelectorAll("form").forEach(attachListenerToForm);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ------------------ Init ------------------
window.addEventListener("load", () => {
  document.querySelectorAll("form").forEach(attachListenerToForm);
  observeForms();
});
