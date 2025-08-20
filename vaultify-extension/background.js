function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      console.log(`📦 Storage fetch: ${key} =`, result[key]);
      resolve(result[key]);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📩 Message received in background.js:", message);

  if (message.action === "savePassword") {
    (async () => {
      const token = await getFromStorage("token");
      if (!token) {
        console.warn("⚠️ Token not found in storage. Cannot save password.");
        sendResponse({ success: false, error: "Not logged in" });
        return;
      }

      console.log("🔐 Sending password to API with token:", token);

      try {
        const response = await fetch("https://vaultify-password-manager.onrender.com/api/add_password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(message.creds)
        });

        const text = await response.text();
        console.log("🌐 API raw response:", text);

        if (!response.ok) {
          // Parse JSON error if possible
          try {
            const errorData = JSON.parse(text);
            const errorMessage = errorData.message || "Failed to save password";
            console.error("❌ Failed to save password:", errorMessage);
            sendResponse({ success: false, error: errorMessage });
          } catch (e) {
            console.error("❌ Failed to save password:", text);
            sendResponse({ success: false, error: text });
          }
        } else {
          console.log("✅ Password saved successfully");
          sendResponse({ success: true });
        }
      } catch (err) {
        console.error("❌ Error while saving password:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // keep sendResponse async alive
  }
});
