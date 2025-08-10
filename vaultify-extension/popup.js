document.addEventListener("DOMContentLoaded", () => {
  const loginFormHTML = `
    <form id="loginForm">
      <input type="text" id="email" placeholder="Email" required />
      <input type="password" id="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
    <div id="result"></div>
  `;

  const loggedInHTML = `
    <p>✅ Already logged in!</p>
    <button id="logoutBtn">Logout</button>
  `;

  // Function to show messages
  function showMessage(msg, isError = false) {
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      resultDiv.textContent = msg;
      resultDiv.style.color = isError ? "red" : "green";
    }
  }

  // Load token and setup UI accordingly
  chrome.storage.local.get("token", (data) => {
    if (data.token) {
      // Logged in UI
      document.body.innerHTML = loggedInHTML;

      document.getElementById("logoutBtn").addEventListener("click", () => {
        chrome.storage.local.remove("token", () => {
          location.reload();
        });
      });
    } else {
      // Show login form
      document.body.innerHTML = loginFormHTML;

      document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
          showMessage("Please enter both email and password.", true);
          return;
        }

        showMessage("Logging in...");

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
              showMessage("Login successful! Reloading...");
              setTimeout(() => location.reload(), 1000);
            });
          } else {
            showMessage(data.error || "Login failed.", true);
          }
        } catch (error) {
          showMessage("Server error. Please try again later.", true);
        }
      });
    }
  });
});
