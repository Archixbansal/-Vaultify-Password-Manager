console.log("Vaultify content script loaded");

function createSaveButton(inputField) {
  if (inputField.dataset.vaultifyAttached) return;
  inputField.dataset.vaultifyAttached = "true";

  const btn = document.createElement("button");
  btn.innerText = "💾 Save to Vaultify";
  btn.className = "vaultify-save-btn";
  Object.assign(btn.style, {
    marginTop: "8px",
    padding: "6px 10px",
    backgroundColor: "#0078D4",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    display: "block",
  });

  inputField.parentNode.insertBefore(btn, inputField.nextSibling);

  btn.addEventListener("click", async () => {
    const allInputs = document.querySelectorAll("input");
    let email = "";
    let passwordOrOtp = inputField.value;

    for (const input of allInputs) {
      const name = input.name?.toLowerCase() || "";
      const placeholder = input.placeholder?.toLowerCase() || "";
      const type = input.type?.toLowerCase() || "";

      if (
        type === "email" ||
        name.includes("email") ||
        name.includes("user") ||
        name.includes("login") ||
        name.includes("id") ||
        placeholder.includes("email") ||
        placeholder.includes("user") ||
        placeholder.includes("login")
      ) {
        email = input.value;
        break;
      }

      // Try fallback: text field before the current input
      if (
        !email &&
        type === "text" &&
        input.compareDocumentPosition(inputField) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        email = input.value;
      }
    }

    if (!email || !passwordOrOtp) {
      alert("⚠️ Missing email or password/OTP.");
      return;
    }

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
            email,
            password: passwordOrOtp,
            website: window.location.hostname,
          }),
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

function detectRelevantInputs() {
  const inputs = document.querySelectorAll("input");
  inputs.forEach(input => {
    const name = input.name?.toLowerCase() || "";
    const placeholder = input.placeholder?.toLowerCase() || "";

    if (
      input.type === "password" ||
      name.includes("otp") ||
      placeholder.includes("otp")
    ) {
      createSaveButton(input);
    }
  });
}

function initObserver() {
  const observer = new MutationObserver(() => {
    detectRelevantInputs();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  detectRelevantInputs(); // Initial run
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initObserver);
} else {
  initObserver();
}
