function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePassword") {
    (async () => {
      const token = await getFromStorage("token");
      if (!token) {
        console.warn("Token not found");
        return;
      }

      try {
        const response = await fetch("https://vaultify-password-manager.onrender.com/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(message.creds)
        });

        if (!response.ok) {
          console.error("❌ Failed to save password:", await response.text());
        } else {
          console.log("✅ Password saved successfully");
        }
      } catch (err) {
        console.error("❌ Error while saving password:", err);
      }
    })();

    return true; // Keep the message channel open for async
  }
});
