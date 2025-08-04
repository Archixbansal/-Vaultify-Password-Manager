document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("token", (data) => {
    if (data.token) {
      document.body.innerHTML = `
        <p>✅ Already logged in!</p>
        <button id="logoutBtn">Logout</button>
      `;

      document.getElementById("logoutBtn").addEventListener("click", () => {
        chrome.storage.local.remove("token", () => {
          location.reload();
        });
      });

      return;
    }

    // If not logged in, show login form listener
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch("https://vaultify-password-manager.onrender.com/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
          chrome.storage.local.set({ token: data.token }, () => {
            document.body.innerHTML = `<p>✅ Login successful!</p>`;
          });
        } else {
          document.getElementById("result").innerText = data.error || "❌ Login failed!";
        }
      } catch (err) {
        document.getElementById("result").innerText = "⚠️ Server error!";
      }
    });
  });
});
