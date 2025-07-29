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
    if (res.ok) {
      document.getElementById("result").innerText = "✅ Login successful!";
    } else {
      document.getElementById("result").innerText = data.error || "❌ Login failed!";
    }
  } catch (err) {
    document.getElementById("result").innerText = "⚠️ Server error or unreachable!";
  }
});
