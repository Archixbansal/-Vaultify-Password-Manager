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

// Track saved credentials to prevent duplicates
function markCredentialsAsSaved(creds) {
  const credsKey = JSON.stringify(creds);
  chrome.storage.local.get(["saved_credentials"], (result) => {
    const savedCreds = result.saved_credentials || [];
    if (!savedCreds.includes(credsKey)) {
      savedCreds.push(credsKey);
      chrome.storage.local.set({ saved_credentials: savedCreds });
    }
  });
}

// Check if credentials have been saved
function areCredentialsAlreadySaved(creds, callback) {
  const credsKey = JSON.stringify(creds);
  chrome.storage.local.get(["saved_credentials"], (result) => {
    const savedCreds = result.saved_credentials || [];
    callback(savedCreds.includes(credsKey));
  });
}

// Show toast notification on page
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? 'rgba(220, 53, 69, 0.9)' : 'rgba(40, 167, 69, 0.9)'};
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 300px;
    text-align: center;
    animation: slideUp 0.3s ease-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { transform: translate(-50%, 100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Enhanced form detection with multiple strategies
function findPasswordForms() {
  const forms = [];
  
  // Strategy 1: Find all forms with password inputs
  const allForms = document.querySelectorAll('form');
  allForms.forEach(form => {
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    if (passwordInputs.length > 0) {
      forms.push({
        form: form,
        passwordInputs: passwordInputs,
        type: 'traditional-form'
      });
    }
  });
  
  // Strategy 2: Find password inputs without forms (common in modern SPAs)
  const standalonePasswordInputs = document.querySelectorAll('input[type="password"]');
  standalonePasswordInputs.forEach(passwordInput => {
    if (!passwordInput.closest('form')) {
      // Find the closest container that might act as a form
      let container = passwordInput.closest('div[class*="login"], div[class*="sign"], div[class*="auth"], div[class*="form"]');
      if (!container) container = passwordInput.parentElement;
      
      forms.push({
        form: container,
        passwordInputs: [passwordInput],
        type: 'standalone-input'
      });
    }
  });
  
  return forms;
}

// Find username/email input associated with password
function findUsernameInput(passwordInput, container) {
  const usernameSelectors = [
    'input[type="email"]',
    'input[name*="email"]',
    'input[name*="username"]',
    'input[name*="user"]',
    'input[name*="login"]',
    'input[id*="email"]',
    'input[id*="username"]',
    'input[id*="user"]',
    'input[id*="login"]',
    'input[placeholder*="email"]',
    'input[placeholder*="username"]',
    'input[placeholder*="user"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]'
  ];
  
  for (const selector of usernameSelectors) {
    const input = container.querySelector(selector);
    if (input && input !== passwordInput) {
      return input;
    }
  }
  
  // Fallback: find any text input before the password input
  const allInputs = container.querySelectorAll('input[type="text"], input[type="email"]');
  for (const input of allInputs) {
    if (input.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING) {
      return input;
    }
  }
  
  return null;
}

// Extract credentials from form/container
function extractCredentials(formData) {
  const { form, passwordInputs } = formData;
  
  const passwordInput = passwordInputs[0]; // Use first password input
  const usernameInput = findUsernameInput(passwordInput, form);
  
  if (!passwordInput || !passwordInput.value) {
    return null;
  }
  
  return {
    account: window.location.hostname,
    username: usernameInput ? usernameInput.value : '',
    password: passwordInput.value
  };
}

// Handle credential saving
function handleCredentialSaving(creds) {
  if (!creds || !creds.password) {
    return;
  }
  
  console.log("🔍 Processing credentials for:", creds.account);
  
  areCredentialsAlreadySaved(creds, (alreadySaved) => {
    if (alreadySaved) {
      console.log("⏭️ Credentials already saved, skipping");
      return;
    }
    
    fetchStoredEmail((storedEmail) => {
      let username = storedEmail || creds.username;
      
      if (!username && creds.username) {
        username = creds.username;
        storeEmail(username);
      }
      
      if (!username) {
        console.warn("⚠️ No username/email found for credentials");
        showToast("⚠️ Vaultify: Missing email for password save.", true);
        return;
      }
      
      const finalCreds = {
        account: creds.account,
        username: username,
        password: creds.password
      };
      
      console.log("📡 Sending credentials to background:", finalCreds);
      
      chrome.runtime.sendMessage({ action: "savePassword", creds: finalCreds }, (response) => {
        console.log("📩 Response from background:", response);
        
        if (chrome.runtime.lastError) {
          console.error("❌ Extension communication error:", chrome.runtime.lastError);
          showToast("⚠️ Vaultify: Extension error", true);
        } else if (response?.success) {
          showToast("✅ Vaultify: Password saved!");
          markCredentialsAsSaved(finalCreds);
        } else {
          const error = response?.error || "Unknown error";
          console.error("❌ Failed to save password:", error);
          showToast(`⚠️ Vaultify: ${error}`, true);
        }
      });
    });
  });
}

// Enhanced form submission detection
function setupFormListeners() {
  const passwordForms = findPasswordForms();
  console.log(`🔍 Found ${passwordForms.length} password forms`);
  
  passwordForms.forEach((formData, index) => {
    const { form, passwordInputs, type } = formData;
    
    console.log(`Form ${index + 1}: ${type}`);
    
    // Handle traditional forms
    if (type === 'traditional-form') {
      form.addEventListener('submit', (e) => {
        console.log("📝 Form submission detected");
        const creds = extractCredentials(formData);
        setTimeout(() => handleCredentialSaving(creds), 500); // Delay to ensure form processing
      });
    }
    
    // Handle standalone inputs (common in SPAs)
    if (type === 'standalone-input') {
      // Find submit buttons in the container
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], button[class*="submit"], button[class*="login"], button[class*="sign"]');
      
      submitButtons.forEach(button => {
        button.addEventListener('click', () => {
          console.log("🖱️ Submit button clicked");
          setTimeout(() => {
            const creds = extractCredentials(formData);
            handleCredentialSaving(creds);
          }, 1000);
        });
      });
      
      // Also listen for Enter key on password inputs
      passwordInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            console.log("⌨️ Enter key pressed in password field");
            setTimeout(() => {
              const creds = extractCredentials(formData);
              handleCredentialSaving(creds);
            }, 1000);
          }
        });
      });
    }
  });
}

// Monitor for dynamically added forms
function setupDynamicFormMonitoring() {
  const observer = new MutationObserver((mutations) => {
    let hasNewForms = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if new node contains password inputs
            if (node.querySelector && node.querySelector('input[type="password"]')) {
              hasNewForms = true;
            }
          }
        });
      }
    });
    
    if (hasNewForms) {
      console.log("🔄 New password forms detected, re-scanning...");
      setTimeout(setupFormListeners, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize extension
function initializeExtension() {
  console.log("🔍 Vaultify extension initialized on:", window.location.href);
  
  // Clear saved credentials for new page
  chrome.storage.local.set({ saved_credentials: [] });
  
  // Initial setup
  setupFormListeners();
  setupDynamicFormMonitoring();
  
  // Re-scan periodically for SPAs
  setInterval(() => {
    const currentUrl = window.location.href;
    if (window.vaultifyLastUrl !== currentUrl) {
      console.log("🌐 URL changed, re-scanning forms...");
      window.vaultifyLastUrl = currentUrl;
      setupFormListeners();
    }
  }, 2000);
}

// Start extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Handle page navigation in SPAs
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("🔄 SPA navigation detected, re-initializing...");
    setTimeout(initializeExtension, 1000);
  }
}).observe(document, { subtree: true, childList: true });
