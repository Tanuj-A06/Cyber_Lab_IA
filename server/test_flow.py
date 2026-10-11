import os
import sys
from starlette.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.main import app

def test_full_flow():
    client = TestClient(app)

    # 1. Health check
    print("--- 1. Testing Health Endpoint ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[OK] Health status:", res.json()["status"])

    # 2. Login Step 1 (Developer)
    print("\n--- 2. Testing Step 1 Login (Password Verification) ---")
    login_res = client.post("/api/auth/login", json={"username": "dev_tanuj", "password": "DevSecure@2026"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    data = login_res.json()
    mfa_token = data["mfa_token"]
    mock_otp = data["mock_otp"]
    print(f"[OK] Step 1 Login succeeded. Mock OTP received: {mock_otp}")

    # 3. Login Step 2 (MFA OTP)
    print("\n--- 3. Testing Step 2 MFA Verification ---")
    verify_res = client.post("/api/auth/verify-otp", json={"mfa_token": mfa_token, "otp_code": mock_otp})
    assert verify_res.status_code == 200, f"OTP verification failed: {verify_res.text}"
    token_data = verify_res.json()
    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    print(f"[OK] OTP verified. Received JWT Access Token for role: {token_data['role']}")

    # 4. List Secrets (Masked previews only)
    print("\n--- 4. Testing Secrets Retrieval (Masked Previews) ---")
    secrets_res = client.get("/api/secrets", headers=headers)
    assert secrets_res.status_code == 200, f"List secrets failed: {secrets_res.text}"
    secrets = secrets_res.json()
    print(f"[OK] Retrieved {len(secrets)} secrets for developer.")
    sample = secrets[0]
    print(f"     Secret Name: {sample['name']}")
    print(f"     Masked Preview: {sample['masked_preview']}")
    assert "sk_live" in sample["masked_preview"] or "••••" in sample["masked_preview"]

    # 5. Reveal Secret (AES-256 Decryption + Audit Log Trigger)
    print("\n--- 5. Testing Secret Decryption (AES-256-GCM + Audit Trigger) ---")
    reveal_res = client.get(f"/api/secrets/{sample['id']}/reveal", headers=headers)
    assert reveal_res.status_code == 200, f"Reveal secret failed: {reveal_res.text}"
    decrypted_data = reveal_res.json()
    print(f"[OK] Decrypted Plaintext: {decrypted_data['decrypted_value']}")
    print(f"     Auto-remask interval: {decrypted_data['auto_remask_seconds']} seconds")

    # 6. Admin RBAC Verification
    print("\n--- 6. Testing Admin RBAC Guard ---")
    # Developer attempting admin audit endpoint should receive 403 Forbidden
    forbidden_res = client.get("/api/admin/audit-logs", headers=headers)
    assert forbidden_res.status_code == 403, f"RBAC failed to reject developer: {forbidden_res.status_code}"
    print("[OK] RBAC verified: Developer correctly blocked from Admin Audit Logs (HTTP 403 Forbidden).")

    # Log in as Admin
    admin_login = client.post("/api/auth/login", json={"username": "admin_sec", "password": "AdminSecure@2026"})
    admin_mfa = admin_login.json()["mfa_token"]
    admin_otp = admin_login.json()["mock_otp"]
    admin_verify = client.post("/api/auth/verify-otp", json={"mfa_token": admin_mfa, "otp_code": admin_otp})
    admin_token = admin_verify.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Query audit logs as Admin
    audit_res = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    print(f"[OK] Admin retrieved {len(logs)} security audit log entries.")
    latest_action = logs[0]["action"]
    print(f"     Latest logged action: {latest_action} (Actor: {logs[0]['user_identifier']})")

    # 7. Logout & Token Revocation
    print("\n--- 7. Testing Logout & Token Revocation (Blacklist) ---")
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    print("[OK] Developer logged out successfully.")

    # Reusing the revoked token should now fail with 401 Unauthorized
    revoked_res = client.get("/api/secrets", headers=headers)
    assert revoked_res.status_code == 401, f"Revoked token was unexpectedly accepted: {revoked_res.status_code}"
    print(f"[OK] Token Blacklist verified: Revoked token was rejected with HTTP 401 ({revoked_res.json()['detail']}).")

    print("\n========================================================")
    print("  >>> ALL 7 CORE SECURITY FLOWS VERIFIED SUCCESSFULLY! <<<")
    print("========================================================")

if __name__ == "__main__":
    test_full_flow()
