// Store email in both chrome.storage.local and sessionStorage
function storeEmail(email) {
  if (email) {
    chrome.storage.local.set({ vaultify_email: email }, () => {
      console.log("📥 Email stored:", email);
    });
    sessionStorage.setItem("vaultify_email", email);
  }
}

// Fetch email from storage (local first, then session)
function fetchStoredEmail(callback) {
  chrome.storage.local.get(["vaultify_email"], (result) => {
    const emailFromLocal = result.vaultify_email || "";
    const emailFromSession = sessionStorage.getItem("vaultify_email") || "";
    const finalEmail = emailFromLocal || emailFromSession;
    callback(finalEmail);
  });
}

// Show a toast message on the page
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

// Attach listeners to forms (only once per form)
function attachFormListeners() {
  const forms = document.querySelectorAll("form:not([data-vaultify-attached])");

  forms.forEach((form) => {
    form.dataset.vaultifyAttached = "true";

    form.addEventListener("submit", () => {
      console.log("📥 Form submit detected!");

      const emailInput = form.querySelector(
        'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
      );
      const passwordInput = form.querySelector(
        'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
      );

      if (!emailInput || !passwordInput) {
        console.warn("⚠️ Email or password field not found.");
        return;
      }

      if (!emailInput.value || !passwordInput.value) {
        console.warn("⚠️ Email or password is empty.");
        return;
      }

      storeEmail(emailInput.value);

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
            console.error("❌ Error sending message:", chrome.runtime.lastError);
            showToast("⚠️ Vaultify: Failed to save password.");
          } else {
            console.log("✅ Vaultify: Password saved!");
            showToast("✅ Vaultify: Password saved!");
          }
        });
      });
    });
  });
}

// Run when the page loads
window.addEventListener("load", attachFormListeners);

// Also observe DOM changes (for SPA/dynamic forms)
const observer = new MutationObserver(attachFormListeners);
observer.observe(document, { childList: true, subtree: true });

// Safety run after small delay
setTimeout(attachFormListeners, 3000);
