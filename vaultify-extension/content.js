// Store email in chrome.storage.local and sessionStorage for fallback
function storeEmail(email) {
  if (email) {
    chrome.storage.local.set({ vaultify_email: email }, () => {
      console.log("📥 Email stored:", email);
    });
    sessionStorage.setItem("vaultify_email", email);
  }
}

// Retrieve stored email from chrome.storage.local or sessionStorage
function fetchStoredEmail(callback) {
  chrome.storage.local.get(["vaultify_email"], (result) => {
    const emailFromLocal = result.vaultify_email || "";
    const emailFromSession = sessionStorage.getItem("vaultify_email") || "";
    const finalEmail = emailFromLocal || emailFromSession;
    console.log("📤 Fetched stored email:", finalEmail);
    callback(finalEmail);
  });
}

// Show toast notification on page
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

let lastSavedCreds = null;

function scanFields() {
  console.log("🔍 Scanning page for fields...");

  const emailInput = document.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  const passwordInput = document.querySelector(
    'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
  );

  if (emailInput && emailInput.value) {
    console.log("📧 Email found in field:", emailInput.value);
    storeEmail(emailInput.value);
  }

  if (passwordInput && passwordInput.value) {
    console.log("🔑 Password found in field:", passwordInput.value);

    fetchStoredEmail((storedEmail) => {
      if (!storedEmail) {
        console.warn("⚠️ No stored email found.");
        showToast("⚠️ Vaultify: Missing email for password save.");
        return;
      }

      const creds = {
        account: window.location.hostname || "unknown",
        username: storedEmail,
        password: passwordInput.value
      };

      const credsKey = JSON.stringify(creds);
      if (credsKey === lastSavedCreds) {
        console.log("⏩ Duplicate credentials detected. Skipping save.");
        return;
      }
      lastSavedCreds = credsKey;

      console.log("📡 Sending creds to background.js:", creds);

      chrome.runtime.sendMessage({ action: "savePassword", creds }, (response) => {
        console.log("📩 Response from background.js:", response);
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showToast("⚠️ Vaultify: Failed to save password.");
        } else if (response?.success) {
          showToast("✅ Vaultify: Password saved!");
        } else {
          showToast("⚠️ Vaultify: Failed to save password.");
        }
      });
    });
  }
}

setInterval(scanFields, 2000);
