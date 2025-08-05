console.log("Vaultify content script loaded");

function createSaveButton(inputField) {
  if (inputField.dataset.vaultifyAttached) return;
  inputField.dataset.vaultifyAttached = "true";

  const btn = document.createElement("button");
  btn.innerText = "💾 Save to Vaultify";
  btn.className = "vaultify-save-btn";
  btn.style.marginTop = "8px";
  btn.style.padding = "6px 10px";
  btn.style.backgroundColor = "#0078D4";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.display = "block";

  inputField.parentNode.insertBefore(btn, inputField.nextSibling);

  btn.addEventListener("click", async () => {
    const form = inputField.closest("form") || document;
    const inputs = form.querySelectorAll("input");

    let email = "";
    let passwordOrOtp = "";

    inputs.forEach((input) => {
      const name = input.name?.toLowerCase() || "";
      const placeholder = input.placeholder?.toLowerCase() || "";
      const type = input.type?.toLowerCase() || "";
      const autocomplete = input.autocomplete?.toLowerCase() || "";

      // Email detection
      if (
        type === "email" ||
        (type === "text" &&
          (name.includes("email") ||
            name.includes("user") ||
            placeholder.includes("email") ||
            placeholder.includes("user")))
      ) {
        email = input.value;
        chrome.storage.local.set({ tempEmail: email }); // store temporarily
      }

      // Password/OTP detection
      if (
        type === "password" ||
        name.includes("otp") ||
        placeholder.includes("otp") ||
        name.includes("pass") ||
        placeholder.includes("pass") ||
        autocomplete === "password"
      ) {
        passwordOrOtp = input.value;
      }
    });

    console.log("📧 Email detected:", email);
    console.log("🔑 Password/OTP detected:", passwordOrOtp);

    if (!email) {
      // Try to retrieve stored email
      chrome.storage.local.get(["tempEmail"], (result) => {
        email = result.tempEmail || "";
        if (!email || !passwordOrOtp) {
          alert("⚠️ Missing email or password/OTP.");
          return;
        }
        saveToVaultify(email, passwordOrOtp);
      });
    } else {
      saveToVaultify(email, passwordOrOtp);
    }
  });
}

function saveToVaultify(email, passwordOrOtp) {
  chrome.storage.local.get(["token"], async (result) => {
    const token = result.token;
    if (!token) {
      alert("⚠️ Not logged in. Open extension popup and login first.");
      return;
    }

    try {
      const res = await fetch("https://vaultify-password-manager.onrender.com/api/add_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account: window.location.hostname,
          username: email,
          password: passwordOrOtp,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Credentials saved to Vaultify!");
        chrome.storage.local.remove("tempEmail"); // clear stored email
      } else {
        alert(`❌ Error: ${data.error || "Unable to save credentials."}`);
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ Server error or unreachable.");
    }
  });
}

function detectRelevantInputs() {
  const inputs = document.querySelectorAll("input");
  inputs.forEach((input) => {
    const name = input.name?.toLowerCase() || "";
    const placeholder = input.placeholder?.toLowerCase() || "";
    const autocomplete = input.autocomplete?.toLowerCase() || "";

    if (
      input.type === "password" ||
      name.includes("otp") ||
      placeholder.includes("otp") ||
      name.includes("pass") ||
      placeholder.includes("pass") ||
      autocomplete === "password"
    ) {
      createSaveButton(input);
    }

    if (
      input.type === "email" ||
      (input.type === "text" &&
        (name.includes("email") ||
          name.includes("user") ||
          placeholder.includes("email") ||
          placeholder.includes("user")))
    ) {
      // Save email as soon as it's entered
      input.addEventListener("blur", () => {
        chrome.storage.local.set({ tempEmail: input.value });
        console.log("📩 Stored email for later:", input.value);
      });
    }
  });
}

function initObserver() {
  const observer = new MutationObserver(() => {
    detectRelevantInputs();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run
  detectRelevantInputs();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initObserver);
} else {
  initObserver();
}
