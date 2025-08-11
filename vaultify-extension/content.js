console.log("🚀 Vaultify content script loaded!");

// Track saved creds to avoid duplicates
let savedPasswords = new Set();

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
    background: rgba(0, 0, 0, 0.85);
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

function handlePasswordSave(email, password) {
  const uniqueKey = `${window.location.hostname}::${email}::${password}`;

  if (savedPasswords.has(uniqueKey)) {
    console.log("⏩ Duplicate password save skipped.");
    return;
  }
  savedPasswords.add(uniqueKey);

  fetchStoredEmail((storedEmail) => {
    if (!storedEmail) {
      console.warn("⚠️ No stored email found.");
      showToast("⚠️ Vaultify: Missing email for password save.");
      return;
    }

    const creds = {
      account: window.location.hostname || "unknown",
      username: storedEmail,
      password: password
    };

    chrome.runtime.sendMessage({ action: "savePassword", creds }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        showToast("⚠️ Vaultify: Failed to save password.");
      } else {
        console.log("✅ Password saved:", creds);
        showToast("✅ Vaultify: Password saved!");
      }
    });
  });
}

function attachListeners(form) {
  if (form.dataset.vaultifyAttached) return; // Avoid duplicate listeners
  form.dataset.vaultifyAttached = "true";

  const emailInput = form.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  const passwordInput = form.querySelector(
    'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
  );

  if (!emailInput || !passwordInput) return;

  // On form submit
  form.addEventListener("submit", () => {
    if (emailInput.value && passwordInput.value) {
      storeEmail(emailInput.value);
      handlePasswordSave(emailInput.value, passwordInput.value);
    }
  });

  // On password blur/change (for JS-based logins)
  passwordInput.addEventListener("change", () => {
    if (emailInput.value && passwordInput.value) {
      storeEmail(emailInput.value);
      handlePasswordSave(emailInput.value, passwordInput.value);
    }
  });
}

function setupFormListener() {
  document.querySelectorAll("form").forEach(attachListeners);
}

function watchForForms() {
  const observer = new MutationObserver(() => {
    setupFormListener();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initial run
window.addEventListener("load", () => {
  setupFormListener();
  watchForForms();
});
