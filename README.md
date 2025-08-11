# 🔐 Vaultify - Password Manager

Vaultify is a secure password manager built using Flask, featuring AES encryption, SHA-256 hashing, password strength validation, a modern UI, and an intuitive dashboard to manage your saved credentials.
Now with a Chrome Extension for auto-capturing and saving credentials directly from websites.



---

## 🚀 Features
**Web App**
- **Secure AES Encryption** – Protects all your saved passwords.
- **SHA-256 Hashing for Authentication** – Ensures login credentials are stored securely.
- **Password Strength Checker** – Ensures strong and safe passwords.
- **Responsive Dashboard** – Clean and modern UI with recent activity tracking.
- **Security Tips** – Regular tips for improving online security.
- **Add & View Passwords** – Save, retrieve, and manage passwords securely.
- **Session-Based Authentication** – Ensures user-specific storage and safety.
- **MongoDB Storage** – Scalable cloud-based storage for user data and passwords.

**Chrome Extension**
- **Auto Detect Login Forms** – Captures email/username & password from any login page.
- **Iframe Support** – Works inside embedded login pages (Zoom, Google login, etc.).
- **Duplicate Prevention** – Avoids saving the same credentials twice.
- **Instant Save** – Sends credentials to Vaultify backend in real-time.
- **Visual Feedback** – Console logs like 📥 Email stored and ✅ Vaultify: Password saved! for confirmation.

---

## 🛠 Tech Stack
- **Backend:** Flask (Python)
- **Frontend:** HTML5, CSS3, Bootstrap 5
- **Database:** MongoDB (preferred) or JSON-based storage
- **Encryption:** Fernet (AES), SHA-256 for login credentials
- **Extension:**  Manifest V3, JavaScript, Content Scripts, Chrome Storage API
- **Other:** Flask Sessions, Jinja2 Templating

---

## 🏠 Home Page Screenshot
![Home Page](assets/home.jpg)

---

## ⚙️ Installation

### **1. Clone the repository**
```bash
git clone https://github.com/Archixbansal/Vaultify-Password-Manager.git
cd Vaultify-Password-Manager

pip install -r requirements.txt

python app.py
```
##  Load Chrome Extension
- Open chrome://extensions/
- Enable Developer Mode
- Click Load Unpacked
- Select the extension folder from this project


## 🔮 Future Enhancements
- **📱** Mobile-friendly UI (PWA support)
- **🔑** Multi-user authentication with OTP-based login
- **☁️** Cloud storage for encrypted vaults
- **🤖** Password generator with AI-based suggestions
- **🔍** Auto-fill feature directly from the extension

## 📝 License
This project is licensed under the MIT License – feel free to modify and use it.

## 👩‍💻 Author
Archi Bansal
4th Year CSE Student, Chandigarh University
