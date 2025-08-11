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

// Function to scan and save password (only runs when manually triggered)
function scanAndSavePassword() {
  const emailInput = document.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  const passwordInput = document.querySelector(
    'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
  );

  // Store email if found
  if (emailInput && emailInput.value) {
    storeEmail(emailInput.value);
  }

  // If password is entered, try saving
  if (passwordInput && passwordInput.value) {
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

      chrome.runtime.sendMessage({ action: "savePassword", creds }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showToast("⚠️ Vaultify: Failed to save password.");
        } else if (response?.success) {
          showToast("✅ Vaultify: Password saved!");
        } else {
          showToast(`❌ Vaultify: ${response?.error || "Unknown error"}`);
        }
      });
    });
  } else {
    showToast("⚠️ Vaultify: No password detected.");
  }
}

// OPTIONAL: Add a keyboard shortcut to save (Ctrl+Shift+S)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === "KeyS") {
    scanAndSavePassword();
  }
});

// ❌ Removed setInterval — now password saving is manual
