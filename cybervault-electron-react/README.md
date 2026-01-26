
# 🧠 CyberVault – Secure Desktop Vault with Neural Authentication

### *Your data. Your device. Your control.*

---

## 🔐 Overview

**CyberVault** is a next-generation, **local-first desktop application** designed to securely store and manage sensitive data — completely offline. Built with **Electron**, **React**, and **WebAuthn-based cryptography**, CyberVault ensures that **your files never leave your device**, combining **AES-256 encryption** with **Neural Authentication** for unparalleled privacy and control.

Unlike cloud-based solutions, CyberVault empowers users to **encrypt, manage, and protect** their data directly on their systems using very advanced **biometric verification** (Face, Iris, and Fingerprint login).

---

## ⚙️ Key Features

* 🔒 **AES-256 File Encryption** – Military-grade encryption ensures your files remain safe and unreadable to unauthorized users.
* 🧩 **Multi-Layer Authentication** – Combines Master Password, 3-Digit File PIN, and Biometric Verification for enhanced protection.
* 🧠 **Neural Authentication** – Facial recognition powered by **face-api.js**, using deep learning descriptors for secure and seamless logins.
* 🪪 **WebAuthn + UUID Fingerprint Security** – Leverages browser-native cryptographic APIs for secure biometric and device-bound credentials.
* 💻 **Offline-First Architecture** – Works entirely without an internet connection; all encryption and decryption occur locally.
* 🪟 **Cross-Platform Desktop App** – Packaged with **Electron** for Windows (with future support for macOS and Linux).
* 📂 **File Management Dashboard** – Upload, encrypt, decrypt, and manage files with a clean, responsive UI built in **React + Tailwind CSS**.
* 🧑‍💬 **Integrated Chatbot Assistant** – A built-in AI helper guides users through file management and security operations.
* 🧰 **Secure Keyboard Entry** – Electron’s secure keyboard isolation prevents keylogging attacks during password or PIN entry.
* ☁️ **Future Enhancements** – Planned features include **cloud backup with end-to-end encryption** and **OCR-based file recognition**.

---

## 🧱 Tech Stack

| Layer                  | Technologies                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| **Frontend**           | React, TypeScript, Tailwind CSS, Electron                               |
| **Backend / Crypto**   | Python (AES-256 encryption, key derivation), Node.js, WebAuthn          |
| **Biometrics**         | face-api.js (Neural Authentication), UUID Fingerprint, Iris recognition |
| **Build & Packaging**  | PyInstaller, Electron Forge                                             |
| **Security Standards** | AES-256, PBKDF2, WebAuthn, Secure Keyboard Entry                        |

---

## 🚀 Motivation

In shared or professional environments, users often lack effective tools to **secure local files** without relying on the cloud.
Built-in OS encryption is either **too complex** or **too limited**, while most commercial tools depend on **online authentication**.

CyberVault was designed to:

* Provide **offline file protection** with **strong encryption**.
* Deliver **multi-layer authentication** (Master Password + File PIN + Biometrics).
* Ensure **data sovereignty**, where users retain full control over their information.
* Offer a **user-friendly interface** for both tech enthusiasts and casual users.

---

## 🎯 Objectives

1. Implement **AES-256 encryption** for all stored files.
2. Enable **per-user master passwords** and **per-file PINs**.
3. Integrate **face, iris, and fingerprint login** via Neural Authentication.
4. Build a **modern, responsive UI** using React, TypeScript, and Tailwind CSS.
5. Package as a **standalone, offline desktop app** using Electron.
6. Test for **usability, performance, and security robustness**.
7. Future-proof the system with support for **OCR** and **secure backup** options.

---

## 🧩 System Architecture

```
+--------------------------------------------------------------+
|                          CyberVault                          |
|--------------------------------------------------------------|
|  Frontend (React + Tailwind)                                 |
|   → Dashboard UI, Neural Auth Modal, File Manager            |
|                                                              |
|  Backend (Python + Node.js)                                  |
|   → AES-256 Encryption, PIN Validation, File Handling        |
|                                                              |
|  Biometric Module (face-api.js + WebAuthn)                   |
|   → Neural Profile Creation, Facial Verification, Fingerprint|
|                                                              |
|  Security Layer                                              |
|   → Key Derivation (PBKDF2), Local Key Storage, UUID Binding |
+--------------------------------------------------------------+
```

---

## 🧪 Testing

* ✅ **Encryption Validation** – Verified file integrity post-encryption/decryption.
* ✅ **Authentication Testing** – Accuracy and reliability of biometric and PIN systems.
* ✅ **Performance Benchmarks** – Optimized for handling large files efficiently.
* ✅ **Usability Feedback** – Iterative testing with users for UI refinement.

---

## 🧭 Future Roadmap

* ☁️ Encrypted Cloud Sync (Optional backup layer).
* 🧾 OCR-based file indexing and smart search.
* 📱 Cross-platform support for macOS and Linux.
* 🔑 Hardware Token Integration (YubiKey/WebAuthn 2.0).
* 🌙 Dark Mode & Theming support.

---



## 📜 License

This project is released under the **MIT License** – you are free to use, modify, and distribute with attribution.


