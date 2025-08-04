chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePassword") {
    chrome.storage.local.get("token", async (data) => {
      const token = data.token;
      if (!token) return;

      try {
        await fetch("https://vaultify-password-manager.onrender.com/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(message.creds)
        });
        console.log("✅ Saved to Vaultify");
      } catch (err) {
        console.error("❌ Failed to save:", err);
      }
    });
  }
});
