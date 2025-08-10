let lastSavedPassword = null;

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

let lastSavedPassword = null;

// Listen for input event on password fields instead of interval scanning
function setupPasswordListener() {
  const emailInput = document.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  if (emailInput && emailInput.value) {
    storeEmail(emailInput.value);
  }

  const passwordInputs = document.querySelectorAll(
    'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
  );

  passwordInputs.forEach((passwordInput) => {
    passwordInput.addEventListener("input", () => {
      const currentPassword = passwordInput.value;

      if (!currentPassword || currentPassword === lastSavedPassword) {
        return; // Ignore empty or duplicate saves
      }

      lastSavedPassword = currentPassword;

      fetchStoredEmail((storedEmail) => {
        if (!storedEmail) {
          console.warn("⚠️ No stored email found.");
          showToast("⚠️ Vaultify: Missing email for password save.");
          return;
        }

        const creds = {
          account: window.location.hostname || "unknown",
          username: storedEmail,
          password: currentPassword
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
  });
}

// Run listener setup on page load and after some delay (for SPA apps)
window.addEventListener("load", setupPasswordListener);
setTimeout(setupPasswordListener, 3000);
