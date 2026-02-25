# Webhook Secret Security Design

## Status
> **PLANNED** — Not yet implemented. This document captures the agreed design approach for securing 
> GitHub Webhook secrets stored per-repository in the `Project` model.

---

## Problem Statement

Each project in the AI Orchestrator can have **multiple GitHub repositories**.
Each GitHub repository requires its own **webhook secret** to verify that incoming 
webhook payloads are genuinely from GitHub and not from a malicious actor.

### Why Not `.env`?
Storing a single global `GITHUB_WEBHOOK_SECRET` in `.env` is insufficient because:
- Each repo's webhook is independently registered on GitHub with its own secret.
- All three webhooks share the same endpoint (`POST /api/webhooks/github`), but each sends a different signature.
- A single hardcoded secret cannot verify signatures from multiple repos.

### Why Not Plain Text in the Database?
Storing secrets as plain text in `Project.github_repos` JSON is a security breach risk:
- **SQL injection** → attacker dumps plaintext secrets from the `projects` table.
- **Leaked DB backups** → secrets visible immediately in any backup file.
- **Production terminal access** → secrets appear in logs or `SELECT *` queries.
- **Compromised read replicas** → secrets exposed without accessing the primary DB.

---

## Chosen Approach: Application-Level AES-256 Encryption

Store secrets **encrypted at rest** in the database. 
The encryption/decryption key lives **only** in the environment (`.env` / Kubernetes Secret), 
never in the database.

### Tool
- **Library:** `cryptography` (Fernet — AES-128-CBC with HMAC-SHA256 authentication)
- **Key Storage:** `APP_ENCRYPTION_KEY` environment variable only

---

## Data Storage Format

`Project.github_repos` JSON column stores a **list of repo objects** (not just repo names):

```json
[
  {
    "repo": "org/frontend",
    "webhook_secret": "gAAAAABl2kJ..."
  },
  {
    "repo": "org/backend-api",
    "webhook_secret": "gAAAAABm9nK..."
  }
]
```

- The `webhook_secret` field stores the **AES-encrypted ciphertext** of the raw GitHub webhook secret.
- Even if the entire database is dumped, the values are unreadable without `APP_ENCRYPTION_KEY`.

---

## Encryption Module Design

**File:** `backend/core/encryption.py`

```python
from cryptography.fernet import Fernet
from backend.config import get_settings

settings = get_settings()
_fernet = Fernet(settings.APP_ENCRYPTION_KEY.encode())

def encrypt_secret(plain_text: str) -> str:
    """Encrypt a raw secret before storing in DB."""
    return _fernet.encrypt(plain_text.encode()).decode()

def decrypt_secret(cipher_text: str) -> str:
    """Decrypt a stored ciphertext back to the raw secret for runtime use only."""
    return _fernet.decrypt(cipher_text.encode()).decode()
```

**Generating the key (one-time setup):**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Paste the output into `.env` as `APP_ENCRYPTION_KEY=<value>`.

---

## Data Flow

### On Repo Registration (Write Path)
```
User submits webhook secret via UI
          ↓
API receives plain text secret
          ↓
encrypt_secret("my_raw_secret") → "gAAAAABl2kJ..."
          ↓
Store ciphertext in Project.github_repos JSON
```

### On Webhook Arrival (Read Path)
```
GitHub fires POST /api/webhooks/github
          ↓
Extract repo name from payload["repository"]["full_name"]
          ↓
DB Query: Find Project with matching repo in github_repos JSON
          ↓
Fetch encrypted secret for that repo from the JSON
          ↓
decrypt_secret("gAAAAABl2kJ...") → "my_raw_secret"
          ↓
Verify X-Hub-Signature-256 header using decrypted secret
          ↓
Discard decrypted value (never log or store it again)
          ↓
Route event: PR merged → DONE | Comment added → AI re-review
```

---

## Config Changes Required

**`backend/config.py`** — Add the following field:

```python
APP_ENCRYPTION_KEY: str  # Fernet-compatible base64 key (32 URL-safe bytes)
```

**`.env`** — Add:
```env
APP_ENCRYPTION_KEY=<generated_fernet_key>
```

**`backend/.env.example`** — Add:
```env
APP_ENCRYPTION_KEY=generate-with-python-cryptography-fernet
```

---

## Webhook Event Routing Design

Once signature verification passes, the handler routes based on GitHub event type:

| GitHub Event Header        | Action Field      | Handler                        |
|----------------------------|-------------------|--------------------------------|
| `pull_request`             | `closed` + merged | `handle_pr_merged(pr_number, repo)` |
| `issue_comment`            | `created`         | `handle_pr_comment(pr_number, comment, repo)` |
| `pull_request_review`      | `submitted`       | `handle_pr_review(pr_number, review, repo)` |

---

## Task Lookup Strategy

To correctly resolve which Task a webhook belongs to, always query using **both**:
- `task.github_pr_id == pr_number`
- `task.github_repo == "org/repo-name"` 

This prevents collisions when two different projects have PRs with the same number (e.g., both have PR #5).

---

## Key Rotation Strategy

If `APP_ENCRYPTION_KEY` needs to be rotated:
1. Generate a new Fernet key.
2. Write a one-time migration script that:
   - Reads all `Project.github_repos` records.
   - Decrypts each `webhook_secret` with the **old key**.
   - Re-encrypts with the **new key**.
   - Saves back to DB.
3. Replace `APP_ENCRYPTION_KEY` in `.env` / Kubernetes Secret.

---

## Security Properties Summary

| Threat                          | Mitigation                                          |
|---------------------------------|-----------------------------------------------------|
| DB dump / stolen backup         | Ciphertext only — useless without encryption key    |
| SQL injection → SELECT *        | Returns encrypted ciphertext                        |
| Production terminal access      | Secrets in DB are unreadable                        |
| Compromised read replica        | Same — only ciphertext stored                       |
| Leaked encryption key           | Rotate key + re-encrypt all secrets (see above)     |
| Secrets appearing in logs       | `decrypt_secret()` result is never logged           |

---

## Future Consideration: HashiCorp Vault / OpenBao

If the system scales to enterprise-grade requirements where:
- Automatic secret rotation is needed
- Full audit trail of every secret access is needed
- The encryption key itself must never touch application servers

Replace `APP_ENCRYPTION_KEY` + Fernet with a **Vault Transit Engine** call.
The application sends the ciphertext to Vault for decryption. The key never leaves Vault.
This aligns with the existing OpenBao integration in the IAM service.
