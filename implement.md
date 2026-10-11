# Secure API Key and Secret Manager — Implementation Blueprint

**Project Title:** Secure API Key and Secret Manager  
**Course Context:** Cyber Security Lab Internal Assessment  
**Architecture:** Decoupled Client-Server (React.js Frontend + FastAPI Backend + NeonDB PostgreSQL)

---

## 1. Executive Summary & Objective

The **Secure API Key and Secret Manager** is a defense-in-depth web platform designed for developers to store, manage, and inspect sensitive credentials (API tokens, database credentials, private keys). 

The primary objective is to implement and demonstrate **10+ industry-standard cybersecurity mechanisms** addressing the OWASP Top 10 web application vulnerabilities, including data confidentiality at rest, authenticated encryption, multi-factor authentication, tamper-resistant audit trails, and strict role-based access control.

---

## 2. Security Mechanisms Matrix

| # | Security Mechanism | Standard / Algorithm | Threat Mitigated | Implementation Location |
|---|--------------------|----------------------|------------------|-------------------------|
| 1 | **Password Hashing** | `bcrypt` (work factor 12) | Offline rainbow table attacks, credential dumps | `server/app/core/security.py` |
| 2 | **Data-at-Rest Encryption** | `AES-256-GCM` (Authenticated Encryption) | Database breach, data tampering, plaintext leakage | `server/app/core/crypto.py` |
| 3 | **Multi-Factor Auth (MFA)** | 6-digit cryptographically secure OTP (5-min TTL) | Credential stuffing, compromised passwords | `server/app/api/auth.py` |
| 4 | **Role-Based Access Control (RBAC)** | 2-Tier: `ADMIN` vs `DEVELOPER` | Broken Access Control (OWASP #1), privilege escalation | `server/app/core/deps.py` |
| 5 | **Session & JWT Security** | Signed `HMAC-SHA256` tokens + 30-min expiry + revocation blacklist | Session hijacking, replay attacks, stale token reuse | `server/app/core/jwt.py` & DB |
| 6 | **Input Validation & Sanitization** | `Pydantic v2` strict types + Regex filters | SQL Injection, XSS, Buffer overflows | `server/app/schemas/` |
| 7 | **API Rate Limiting** | `SlowAPI` (fixed/sliding window per IP) | Brute-force attacks, credential stuffing, DoS | `server/app/main.py` |
| 8 | **Audit Logging** | Append-only database table + IP + user + timestamp | Repudiation, unauthorized insider actions | `server/app/services/audit.py` |
| 9 | **Secret Masking & Auto-Remask** | Frontend state mask + 15-second countdown timer | Shoulder surfing, accidental screen-share exposure | `client/src/components/` |
| 10 | **Secret Expiration & Lifecycle** | Stored expiry timestamp + automated status flag | Stale credentials, abandoned API keys | Backend & Dashboard |
| 11 | **Environment Isolation** | Separate `.env` per service + `.gitignore` exclusions | Secret leak via version control (Git leak) | Root, `server/`, `client/` |
| 12 | **Secure HTTP Headers & CORS** | Restrictive CORS origins + Content-Security policy | Cross-Origin Request Forgery, unauthorized origins | FastAPI Middleware |

---

## 3. Threat Model & Architectural Data Flow

```
   [ Client: React + Vite ]
              │
              │ 1. HTTPS / REST Request (JSON)
              ▼
   [ Rate Limiter Middleware ] (SlowAPI: 5 req/min on login, 60 req/min on secrets)
              │
              ▼
   [ Pydantic Input Validator ] (Rejects malformed inputs, strict types)
              │
              ▼
   [ Authentication & RBAC ] 
     ├─ Verify bcrypt hash / JWT Bearer Signature
     ├─ Check Token Blacklist in DB
     └─ Verify Role Permissions (Admin vs Developer)
              │
              ▼
   [ Cryptography Engine (AES-256-GCM) ]
     ├─ Master Key (32 bytes from .env)
     ├─ Generate unique 12-byte random IV/Nonce
     └─ Compute Ciphertext + 16-byte Authentication Tag
              │
              ▼
   [ Audit Logger ] (Asynchronously logs action, actor, client IP, timestamp)
              │
              ▼
   [ NeonDB PostgreSQL ] (Stores encrypted blobs, user hashes, and audit trails)
```

---

## 4. Cryptographic Specification

### 4.1. Password Hashing (Bcrypt)
- **Algorithm:** `bcrypt` via Python `passlib[bcrypt]` or `bcrypt`.
- **Rounds (Salt):** Work factor `12`.
- **Verification:** Constant-time hash comparison to prevent timing attacks.

### 4.2. Authenticated Secret Encryption (AES-256-GCM)
Unlike legacy ECB or plain CBC mode, **AES-GCM (Galois/Counter Mode)** provides both **Confidentiality** and **Integrity/Authenticity**.
- **Master Key (`MASTER_ENCRYPTION_KEY`):** 32-byte cryptographically secure random key (hex-encoded in `server/.env`).
- **Initialization Vector (Nonce):** 12 bytes generated freshly for every encryption via `os.urandom(12)`. Nonce is never reused with the same key.
- **Ciphertext:** Encrypted payload.
- **Authentication Tag:** 16 bytes produced by GCM mode. If any byte in the ciphertext or nonce is altered in the database, decryption raises an `InvalidTag` exception and rejects the payload.
- **Storage Format:** Stored in database as a base64-encoded structured blob or JSON:
  `base64( nonce (12B) + auth_tag (16B) + ciphertext )`

### 4.3. Multi-Factor Authentication (OTP)
- **Generation:** Cryptographically secure 6-digit random integer generated via `secrets.randbelow(900000) + 100000`.
- **Storage:** Stored in `otp_verifications` table with hashed OTP or encrypted OTP, user reference, and a 5-minute expiry (`datetime.utcnow() + timedelta(minutes=5)`).
- **Delivery:** Logged to server terminal/console (Mock Delivery Mode) for offline college lab evaluation.
- **One-Time Consumption:** Once verified or after 3 failed attempts, the OTP record is invalidated.

### 4.4. JWT Session & Token Blacklist
- **Algorithm:** `HS256` (HMAC with SHA-256).
- **Claims:**
  - `sub`: User ID
  - `role`: `ADMIN` | `DEVELOPER`
  - `exp`: 30 minutes from issuance
  - `jti`: Unique UUID v4 identifying the token instance
- **Revocation on Logout:** On logout, the token's `jti` is stored in the database `token_blacklist` table until its natural expiration. Every authenticated request checks this table.

---

## 5. Database Schema (NeonDB PostgreSQL)

### 5.1. `users`
- `id` (UUID, Primary Key)
- `username` (VARCHAR(50), Unique, Indexed)
- `email` (VARCHAR(100), Unique, Indexed)
- `password_hash` (VARCHAR(255))
- `role` (VARCHAR(20), Default: `'DEVELOPER'`) — Values: `'ADMIN'`, `'DEVELOPER'`
- `is_active` (BOOLEAN, Default: `TRUE`)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)

### 5.2. `secrets`
- `id` (UUID, Primary Key)
- `owner_id` (UUID, Foreign Key -> `users.id`, Indexed)
- `name` (VARCHAR(100)) — e.g. "Stripe Production API Key"
- `secret_type` (VARCHAR(50)) — e.g. "API_KEY", "DB_PASSWORD", "ACCESS_TOKEN", "SSH_KEY"
- `environment` (VARCHAR(20)) — e.g. "DEVELOPMENT", "STAGING", "PRODUCTION"
- `encrypted_value` (TEXT) — Base64 payload containing `nonce + tag + ciphertext`
- `masked_preview` (VARCHAR(50)) — e.g. `sk_live_••••••••9f2a`
- `description` (TEXT, Nullable)
- `expires_at` (TIMESTAMP WITH TIME ZONE, Nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- `updated_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)

### 5.3. `audit_logs`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable for unauth events)
- `user_identifier` (VARCHAR(100)) — Username or email
- `action` (VARCHAR(50)) — e.g. `USER_LOGIN`, `MFA_FAILED`, `SECRET_CREATED`, `SECRET_REVEALED`, `SECRET_DELETED`, `SECRET_UPDATED`
- `resource_id` (VARCHAR(100), Nullable)
- `details` (TEXT, Nullable)
- `ip_address` (VARCHAR(45))
- `user_agent` (VARCHAR(255), Nullable)
- `timestamp` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`, Indexed)

### 5.4. `otp_verifications`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `otp_code` (VARCHAR(6))
- `expires_at` (TIMESTAMP WITH TIME ZONE)
- `attempts` (INTEGER, Default: 0)
- `is_used` (BOOLEAN, Default: `FALSE`)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)

### 5.5. `token_blacklist`
- `id` (UUID, Primary Key)
- `jti` (VARCHAR(64), Unique, Indexed)
- `expires_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)

---

## 6. Project Structure

```
Lab_IA/
├── client/                          # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/                     # Axios / Fetch client with Auth interceptors
│   │   ├── components/              # UI components (Navbar, Modal, SecretCard, AuditTable)
│   │   ├── context/                 # AuthContext (user, role, token, login, logout)
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Step 1: Username & Password
│   │   │   ├── MfaVerify.jsx        # Step 2: 6-digit OTP verification
│   │   │   ├── Register.jsx         # New Developer onboarding
│   │   │   ├── Dashboard.jsx        # Developer Secret Management
│   │   │   ├── AdminDashboard.jsx   # Admin Audit Logs & User Oversight
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py              # Login, Register, MFA verify, Logout
│   │   │   ├── secrets.py           # CRUD for secrets, Reveal secret endpoint
│   │   │   ├── admin.py             # User list, System audit logs
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (.env loader)
│   │   │   ├── security.py          # bcrypt password hashing & verification
│   │   │   ├── crypto.py            # AES-256-GCM encryption & decryption
│   │   │   ├── jwt.py               # Token creation, decoding, validation
│   │   │   ├── deps.py              # FastAPI dependencies (get_current_user, check_role)
│   │   │   └── limiter.py           # SlowAPI rate limiter setup
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── secret.py
│   │   │   ├── audit.py
│   │   │   ├── otp.py
│   │   │   └── blacklist.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   │   ├── auth.py
│   │   │   ├── secret.py
│   │   │   └── audit.py
│   │   ├── services/
│   │   │   └── audit_service.py     # Centralized audit logging helper
│   │   ├── db/
│   │   │   └── session.py           # SQLAlchemy engine & session maker for NeonDB
│   │   └── main.py                  # FastAPI app instance, CORS, middleware, routers
│   ├── seed.py                      # Database initialization & demo account seeder
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── .gitignore                       # Root gitignore
└── implement.md                     # This specification document
```

---

## 7. API Endpoints Specification

### 7.1. Authentication & MFA
- `POST /api/auth/register` — Register a new account (`DEVELOPER` role).
- `POST /api/auth/login` — Step 1: Validates username/password, generates 6-digit OTP, prints to server console, returns `mfa_token`. Rate-limited: 5 req/min.
- `POST /api/auth/verify-otp` — Step 2: Validates `mfa_token` + 6-digit OTP. Returns 30-min JWT Bearer token + role.
- `POST /api/auth/logout` — Blacklists current JWT `jti` in database.

### 7.2. Secrets Management (Developer / Admin)
- `GET /api/secrets` — List secrets owned by user (values masked: `sk_live_•••••••9f2a`).
- `POST /api/secrets` — Create a new secret (encrypts via AES-256-GCM, logs `SECRET_CREATED`).
- `GET /api/secrets/{id}/reveal` — Decrypts AES-256-GCM value, logs `SECRET_REVEALED` with IP/user. Client auto-remasks in 15 seconds.
- `PUT /api/secrets/{id}` — Updates secret (re-encrypts, logs `SECRET_UPDATED`).
- `DELETE /api/secrets/{id}` — Deletes secret, logs `SECRET_DELETED`.

### 7.3. Administration (Admin Role Only)
- `GET /api/admin/users` — List all registered users and status.
- `GET /api/admin/audit-logs` — Filterable system-wide security audit trail (action, IP, timestamp).
- `GET /api/admin/stats` — Metrics: Total secrets stored, expired count, security events today.

---

## 8. Pre-Seeded Accounts (for Evaluation / Demo)

Upon running `python seed.py`:
1. **Admin Account:**
   - **Username:** `admin_sec`
   - **Password:** `AdminSecure@2026`
   - **Role:** `ADMIN`
   - **Privileges:** Inspect system audit logs, view user accounts, system metrics.
2. **Developer Account:**
   - **Username:** `dev_tanuj`
   - **Password:** `DevSecure@2026`
   - **Role:** `DEVELOPER`
   - **Pre-seeded Secrets:** Sample Stripe API Key, NeonDB connection string, AWS S3 secret.

---

## 9. Evaluation & Viva Defense Talking Points

When presenting to examiners:
1. **Why AES-256-GCM instead of AES-CBC or AES-ECB?**
   *Answer:* ECB preserves plaintext patterns. CBC provides confidentiality but is vulnerable to padding oracle attacks unless paired with HMAC. GCM is an AEAD (Authenticated Encryption with Associated Data) mode that guarantees both confidentiality and ciphertext integrity via its 16-byte authentication tag.
2. **How is the Master Key protected?**
   *Answer:* The key resides exclusively in the server runtime environment (`.env`), never transmitted to clients and excluded from Git commits via `.gitignore`.
3. **How does the system prevent Brute-Force attacks?**
   *Answer:* SlowAPI enforces IP-level rate limiting on `/api/auth/login` (5 attempts/min) and OTP verification (3 max attempts per OTP).
4. **How are stale JWTs invalidated before 30 minutes?**
   *Answer:* JWTs contain a unique `jti`. On logout, this identifier is recorded in the `token_blacklist` table, and incoming requests are validated against this table via FastAPI dependency injection.
5. **How does secret masking protect against shoulder surfing?**
   *Answer:* The frontend displays only the first few and last few characters by default. When the user clicks "Reveal", an audit log entry (`SECRET_REVEALED`) is recorded on the server, and a 15-second frontend countdown automatically re-masks the value.
