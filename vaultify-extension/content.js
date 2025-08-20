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

// Track saved domains to prevent duplicates
function markDomainAsSaved(domain) {
  chrome.storage.local.get(["saved_domains"], (result) => {
    const savedDomains = result.saved_domains || [];
    if (!savedDomains.includes(domain)) {
      savedDomains.push(domain);
      chrome.storage.local.set({ saved_domains: savedDomains });
    }
  });
}

// Check if domain has been saved
function isDomainAlreadySaved(domain, callback) {
  chrome.storage.local.get(["saved_domains"], (result) => {
    const savedDomains = result.saved_domains || [];
    callback(savedDomains.includes(domain));
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

// Clear saved domains when URL changes
let currentUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    // Clear saved domains for new page
    chrome.storage.local.set({ saved_domains: [] });
  }
}, 1000);

// Listen for form submissions instead of continuous scanning
function setupFormListeners() {
  // Find all forms on the page
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Check if form contains password field
    const passwordInput = form.querySelector('input[type="password"]');
    if (passwordInput) {
      form.addEventListener('submit', (e) => {
        handleFormSubmission(form);
      });
      
      // Also listen for login buttons that might trigger AJAX login
      const loginButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], button[id*="login"], button[class*="login"]');
      loginButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          setTimeout(() => handleFormSubmission(form), 1000); // Delay to allow form processing
        });
      });
    }
  });
}

// Handle form submission and save password
function handleFormSubmission(form) {
  const emailInput = form.querySelector(
    'input[type="email"], input[name="email"], input[id*="email"], input[autocomplete="username"]'
  );
  const passwordInput = form.querySelector('input[type="password"]');
  
  if (!passwordInput || !passwordInput.value) {
    return;
  }

  const domain = window.location.hostname;
  
  // Check if this domain has already been saved
  isDomainAlreadySaved(domain, (alreadySaved) => {
    if (alreadySaved) {
      console.log("⏩ Domain already saved, skipping:", domain);
      return;
    }

    fetchStoredEmail((storedEmail) => {
      let username = storedEmail;
      
      // If no stored email, try to get from form
      if (!username && emailInput && emailInput.value) {
        username = emailInput.value;
        storeEmail(username);
      }
      
      if (!username) {
        console.warn("⚠️ No username/email found.");
        showToast("⚠️ Vaultify: Missing email for password save.");
        return;
      }

      const creds = {
        account: domain,
        username: username,
        password: passwordInput.value
      };

      console.log("📡 Sending creds to background.js:", creds);

      chrome.runtime.sendMessage({ action: "savePassword", creds }, (response) => {
        console.log("📩 Response from background.js:", response);
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          showToast("⚠️ Vaultify: Failed to save password.");
        } else if (response?.success) {
          showToast("✅ Vaultify: Password saved!");
          markDomainAsSaved(domain);
        } else {
          showToast("⚠️ Vaultify: Failed to save password.");
        }
      });
    });
  });
}

// Initial setup when page loads
function initializeExtension() {
  console.log("🔍 Vaultify extension initialized");
  
  // Set up listeners for existing forms
  setupFormListeners();
  
  // Also set up a MutationObserver to handle dynamically added forms
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        setupFormListeners();
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
