# Authentication System with Email OTP Verification

A full-stack authentication system built with **Node.js**, **Express**, **bcrypt**, **JWT**, and **React (Vite)** featuring secure **Email OTP (One-Time Password) Verification**, HTTP-only cookie sessions, and a modern glassmorphism UI.

---

## 📂 Project Structure

```text
D:\Business\auth-system\
├── backend/
│   ├── .env                       # Environment variables (PORT, JWT_SECRET, optional SMTP)
│   ├── server.js                  # Express app entry, CORS & cookie-parser setup
│   ├── package.json
│   ├── models/
│   │   └── users.js               # In-memory array storing users, OTPs, and verification flags
│   ├── utils/
│   │   └── emailService.js        # Nodemailer dispatcher with local dev simulation fallback
│   ├── routes/
│   │   └── authRoutes.js          # API routes for register, verify-otp, resend-otp, login, logout, profile
│   ├── controllers/
│   │   └── authController.js      # Business logic (bcrypt hashing, OTP lifecycle, JWT cookies)
│   └── middleware/
│       └── authMiddleware.js      # Protects routes by validating HTTP-only JWT cookies
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                # React Router setup (/register, /login, /verify-otp, /profile)
        ├── main.jsx
        ├── index.css              # Custom responsive dark glassmorphism theme & OTP boxes
        └── pages/
            ├── Register.jsx       # Registration form (triggers OTP generation)
            ├── VerifyOtp.jsx      # 6-digit OTP verification screen with countdown & auto-fill
            ├── Login.jsx          # Login form with unverified account detection
            └── Profile.jsx        # Protected dashboard with verified badges & logout
```

---

## 🔐 How Email OTP Verification Works

1. **User Registers:**
   - User inputs Full Name, Email, and Password.
   - Password is encrypted using `bcrypt` (10 salt rounds).
   - System generates a cryptographically random 6-digit OTP with a **10-minute expiration window**.
   - User account is stored with `isVerified: false`.
   - `emailService` dispatches the code via email (or prints clearly in the terminal for development).
   - Frontend seamlessly transitions to the `/verify-otp` screen.

2. **User Enters 6-Digit OTP:**
   - User inputs the code across 6 animated digit boxes (supports paste, backspace auto-navigation, and auto-focus).
   - Upon submitting to `POST /api/auth/verify-otp`, the server validates that the code matches and is within 10 minutes.
   - On success:
     - User is marked `isVerified: true`.
     - OTP is cleared from memory.
     - A JWT session is signed and automatically set into a secure **HTTP-only cookie**.
     - User is immediately logged in and redirected to their protected `/profile`.

3. **Login Protection:**
   - If an unverified user attempts to log in via `POST /api/auth/login`, the request is intercepted with `403 Forbidden` (`requireVerification: true`).
   - The user is automatically prompted and guided to the `/verify-otp` page to complete verification.

4. **Resend OTP:**
   - A 60-second cooldown timer prevents abuse while allowing users to request a fresh code anytime.

---

## 🚀 Running the Project

Both servers run concurrently:

```bash
# 1. Backend API (runs on http://localhost:5000)
cd D:\Business\auth-system\backend
node server.js

# 2. Frontend React App (runs on http://localhost:5173)
cd D:\Business\auth-system\frontend
npm run dev
```

Open your browser at: **[http://localhost:5173/](http://localhost:5173/)**

---

## 📧 Email Configuration (Optional)

By default, the system runs in **Instant Local Development Mode**:
- Every generated OTP is logged directly to the backend terminal in a formatted box:
  ```text
  ======================================================
  📨 [EMAIL VERIFICATION OTP]
  👤 To: Alice Smith <alice@example.com>
  🔑 OTP Code: 982271
  ⏱️  Valid for: 10 minutes
  ======================================================
  ```
- The OTP is also returned in development JSON responses (`devOtp`) and auto-filled on the UI for quick testing.

To send real emails to inboxes via Gmail or custom SMTP, simply update `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM="Auth System" <noreply@yourdomain.com>
```

---

## 🧪 API Endpoints Reference

### 1. Register Account
- **POST** `/api/auth/register`
- **Body:** `{"fullName": "Alice", "email": "alice@example.com", "password": "secure123"}`
- **Response:** `201 Created` with `{ "message": "...", "requireVerification": true, "email": "...", "devOtp": "123456" }`

### 2. Verify OTP
- **POST** `/api/auth/verify-otp`
- **Body:** `{"email": "alice@example.com", "otp": "123456"}`
- **Response:** `200 OK` (Sets HTTP-only JWT `token` cookie)

### 3. Resend OTP
- **POST** `/api/auth/resend-otp`
- **Body:** `{"email": "alice@example.com"}`
- **Response:** `200 OK`

### 4. Login
- **POST** `/api/auth/login`
- **Body:** `{"email": "alice@example.com", "password": "secure123"}`
- **Response:** `200 OK` (Sets HTTP-only JWT cookie) OR `403 Forbidden` if unverified

### 5. Protected Profile
- **GET** `/api/auth/profile`
- **Headers:** `Cookie: token=...`
- **Response:** `200 OK` with user details & verified status

### 6. Logout
- **POST** `/api/auth/logout`
- **Response:** `200 OK` (Clears HTTP-only cookie)
