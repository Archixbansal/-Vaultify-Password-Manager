function createSaveButton(passwordInput) {
  // Avoid duplicate buttons
  if (document.getElementById("vaultify-save-btn")) return;

  const btn = document.createElement("button");
  btn.innerText = "💾 Save to Vaultify";
  btn.id = "vaultify-save-btn";
  btn.style.marginTop = "8px";
  btn.style.padding = "6px 10px";
  btn.style.backgroundColor = "#0078D4";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.display = "block";

  passwordInput.parentNode.insertBefore(btn, passwordInput.nextSibling);

  btn.addEventListener("click", async () => {
    const form = passwordInput.closest("form");
    if (!form) return alert("⚠️ Could not find form.");

    const inputs = form.querySelectorAll("input");
    let email = "";
    let password = "";

    inputs.forEach(input => {
      if (
        input.type === "email" ||
        input.name.toLowerCase().includes("email") ||
        input.name.toLowerCase().includes("user")
      ) {
        email = input.value;
      } else if (input.type === "password") {
        password = input.value;
      }
    });

    if (!email || !password) {
      alert("⚠️ Missing email or password.");
      return;
    }

    // Retrieve JWT token
    chrome.storage.local.get(["token"], async (result) => {
      const token = result.token;

      if (!token) {
        alert("⚠️ Not logged in. Open extension popup and login first.");
        return;
      }

      try {
        const res = await fetch("https://vaultify-password-manager.onrender.com/api/save-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email, password, website: window.location.hostname })
        });

        const data = await res.json();

        if (res.ok) {
          alert("✅ Credentials saved to Vaultify!");
        } else {
          alert(`❌ Error: ${data.error || "Unable to save credentials."}`);
        }
      } catch (err) {
        console.error(err);
        alert("⚠️ Server error or unreachable.");
      }
    });
  });
}

// Automatically find and add button to password fields
const observer = new MutationObserver(() => {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  passwordFields.forEach(pw => createSaveButton(pw));
});

observer.observe(document.body, { childList: true, subtree: true });
