import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure python path includes current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.db.session import engine, Base, SessionLocal
import app.models  # Register models
from app.models.user import User
from app.models.secret import Secret
from app.models.audit import AuditLog
from app.core.security import hash_password
from app.core.crypto import encrypt_secret, generate_masked_preview

def seed_database():
    print("\n========================================================")
    print("  Initializing Database & Seeding Lab Evaluation Data   ")
    print("========================================================")

    # 1. Create tables
    print("[1/4] Ensuring PostgreSQL tables exist...")
    try:
        Base.metadata.create_all(bind=engine)
        print("      [OK] Database tables verified/created successfully.")
    except Exception as exc:
        print(f"      [ERROR] Error connecting to PostgreSQL: {exc}")
        print("      Please verify that DATABASE_URL in server/.env is valid.")
        return

    db = SessionLocal()
    try:
        # 2. Seed Admin Account
        print("[2/4] Checking Admin account...")
        admin = db.query(User).filter(User.username == "admin_sec").first()
        if not admin:
            admin = User(
                username="admin_sec",
                email="admin@cybersec.lab",
                password_hash=hash_password("AdminSecure@2026"),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("      [OK] Created Admin user: 'admin_sec' / 'AdminSecure@2026'")
        else:
            print("      [OK] Admin user 'admin_sec' already exists.")

        # 3. Seed Developer Account
        print("[3/4] Checking Developer account...")
        dev = db.query(User).filter(User.username == "dev_tanuj").first()
        if not dev:
            dev = User(
                username="dev_tanuj",
                email="tanuj@cybersec.lab",
                password_hash=hash_password("DevSecure@2026"),
                role="DEVELOPER",
                is_active=True,
            )
            db.add(dev)
            db.commit()
            db.refresh(dev)
            print("      [OK] Created Developer user: 'dev_tanuj' / 'DevSecure@2026'")
        else:
            print("      [OK] Developer user 'dev_tanuj' already exists.")

        # 4. Seed Encrypted Secrets for Developer
        print("[4/4] Checking sample encrypted credentials...")
        sample_secrets_data = [
            {
                "name": "Stripe Live Production Key",
                "secret_type": "API_KEY",
                "environment": "PRODUCTION",
                "plaintext": "sk_live_51MszKlABCD9876543210ZYXWVUTSRQPONML",
                "description": "Production billing checkout gateway key",
                "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
            },
            {
                "name": "NeonDB Primary Cluster Password",
                "secret_type": "DB_PASSWORD",
                "environment": "PRODUCTION",
                "plaintext": "npg_s9XkQ82mLaPv01zRtYwe4_SecureDbPass",
                "description": "High-availability Postgres database password",
                "expires_at": datetime.now(timezone.utc) + timedelta(days=180),
            },
            {
                "name": "Staging Auth JWT Signing Secret",
                "secret_type": "ACCESS_TOKEN",
                "environment": "STAGING",
                "plaintext": "staging_jwt_super_secret_signing_key_994821",
                "description": "Internal microservice HMAC key for staging cluster",
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            },
            {
                "name": "Legacy Developer Test Webhook (Expired)",
                "secret_type": "API_KEY",
                "environment": "DEVELOPMENT",
                "plaintext": "whsec_legacy_expired_sample_webhook_token_1234",
                "description": "Demonstrates expired credential detection and security alerts",
                "expires_at": datetime.now(timezone.utc) - timedelta(days=5),  # Intentionally expired
            },
        ]

        existing_secrets_count = db.query(Secret).filter(Secret.owner_id == dev.id).count()
        if existing_secrets_count == 0:
            for s_data in sample_secrets_data:
                enc_value = encrypt_secret(s_data["plaintext"])
                masked = generate_masked_preview(s_data["plaintext"])
                secret_obj = Secret(
                    owner_id=dev.id,
                    name=s_data["name"],
                    secret_type=s_data["secret_type"],
                    environment=s_data["environment"],
                    encrypted_value=enc_value,
                    masked_preview=masked,
                    description=s_data["description"],
                    expires_at=s_data["expires_at"],
                )
                db.add(secret_obj)
            db.commit()
            print("      [OK] Encrypted and seeded 4 sample credentials with AES-256-GCM.")
        else:
            print(f"      [OK] Developer already has {existing_secrets_count} secret(s).")

        # Seed initial audit logs if empty
        if db.query(AuditLog).count() == 0:
            seed_logs = [
                AuditLog(
                    user_id=admin.id,
                    user_identifier=admin.username,
                    action="SYSTEM_INITIALIZED",
                    details="Security Manager database schema and demo accounts seeded",
                    ip_address="127.0.0.1",
                    user_agent="System CLI Seeder",
                ),
                AuditLog(
                    user_id=dev.id,
                    user_identifier=dev.username,
                    action="SECRET_CREATED",
                    details="Pre-seeded sample credentials encrypted via AES-256-GCM",
                    ip_address="127.0.0.1",
                    user_agent="System CLI Seeder",
                ),
            ]
            db.add_all(seed_logs)
            db.commit()
            print("      [OK] Created initial system audit entries.")

        print("\n========================================================")
        print("  [OK] SEEDING COMPLETED SUCCESSFULLY!                  ")
        print("========================================================")
        print(" Ready-to-use Lab Test Credentials:")
        print(" --------------------------------------------------------")
        print("  1) ADMIN ACCOUNT:")
        print("     Username: admin_sec")
        print("     Password: AdminSecure@2026")
        print("     Role:     ADMIN (Audit Logs, User Management, Stats)")
        print()
        print("  2) DEVELOPER ACCOUNT:")
        print("     Username: dev_tanuj")
        print("     Password: DevSecure@2026")
        print("     Role:     DEVELOPER (Secrets CRUD, Reveal, Rotation)")
        print("========================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
