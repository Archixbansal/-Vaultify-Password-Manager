// == Vaultify Chrome Extension Script ==

// Store email in both local storage and sessionStorage
function storeEmail(email) {
  if (email) {
    chrome.storage.local.set({ vaultify_email: email }, () => {
      console.log("📥 Email stored in chrome.storage.local:", email);
    });
    sessionStorage.setItem("vaultify_email", email);
  }
}

// Retrieve stored email from local or sessionStorage
function fetchStoredEmail(callback) {
  chrome.storage.local.get(["vaultify_email"], (result) => {
    const localEmail = result.vaultify_email || "";
    const sessionEmail = sessionStorage.getItem("vaultify_email") || "";
    const finalEmail = localEmail || sessionEmail;
    callback(finalEmail);
  });
}

// Scan for email and password/OTP fields
function scanFields() {
  const emailInput = document.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  const passwordInput = document.querySelector(
    'input[type="password"], input[autocomplete="current-password"], input[autocomplete="one-time-code"]'
  );

  // Save email if found
  if (emailInput && emailInput.value) {
    console.log("📧 Email found directly:", emailInput.value);
    storeEmail(emailInput.value);
  }

  // Save password if found and paired with stored email
  if (passwordInput && passwordInput.value) {
    console.log("🔑 Password/OTP detected:", passwordInput.value);

    fetchStoredEmail((storedEmail) => {
      if (!storedEmail) {
        console.warn("⚠️ No stored email found.");
      }

      if (storedEmail && passwordInput.value) {
        sendToVaultify(storedEmail, passwordInput.value);
      } else {
        showToast("⚠️ Missing email or password/OTP.");
      }
    });
  }
}

// Function to send data to your server
function sendToVaultify(email, password) {
  console.log("📤 Sending to Vaultify:", { email, password });
  fetch("https://vaultify-password-manager.onrender.com/api/save-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })
    .then((res) => res.json())
    .then((data) => {
      showToast("✅ Saved to Vaultify!");
    })
    .catch((err) => {
      console.error("❌ Server error:", err);
      showToast("⚠️ Server error or unreachable.");
    });
}

// Toast display
function showToast(message) {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: black;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 9999;
    font-family: sans-serif;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Run scan periodically
setInterval(scanFields, 2000);
