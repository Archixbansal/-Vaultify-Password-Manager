// Helper to get data from chrome.storage.local as a Promise
function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePassword") {
    (async () => {
      const token = await getFromStorage("token");
      if (!token) {
        console.warn("⚠️ Token not found in storage. Cannot save password.");
        sendResponse({ success: false, error: "Not logged in" });
        return;
      }

      try {
        const response = await fetch("https://vaultify-password-manager.onrender.com/api/add_password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(message.creds)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("❌ Failed to save password:", text);
          sendResponse({ success: false, error: text });
        } else {
          console.log("✅ Password saved successfully");
          sendResponse({ success: true });
        }
      } catch (err) {
        console.error("❌ Error while saving password:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    // Return true to indicate async sendResponse
    return true;
  }
});
