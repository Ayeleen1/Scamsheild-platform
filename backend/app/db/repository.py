"""Unified data access: SQLite (default) or MongoDB."""

import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

import aiosqlite

from app.core.config import settings

DB_PATH = settings.SQLITE_PATH


def _new_email_otp() -> tuple[str, str]:
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
    return code, expires


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                email_verified INTEGER DEFAULT 0,
                otp_code TEXT,
                otp_expires TEXT,
                totp_secret TEXT,
                totp_enabled INTEGER DEFAULT 0
            )
            """
        )
        for stmt in (
            "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN otp_code TEXT",
            "ALTER TABLE users ADD COLUMN otp_expires TEXT",
            "ALTER TABLE users ADD COLUMN totp_secret TEXT",
            "ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0",
        ):
            try:
                await conn.execute(stmt)
            except Exception:
                pass
        await conn.execute(
            "UPDATE users SET email_verified = 1 WHERE otp_code IS NULL AND email_verified = 0"
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                email TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                created_by TEXT NOT NULL,
                created_by_name TEXT,
                source_type TEXT NOT NULL,
                source_value TEXT NOT NULL,
                summary TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL,
                is_public INTEGER DEFAULT 1
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS blacklist (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                kind TEXT NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS login_attempts (
                email TEXT PRIMARY KEY,
                failures INTEGER DEFAULT 0,
                locked_until TEXT
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked INTEGER DEFAULT 0
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS captchas (
                id TEXT PRIMARY KEY,
                answer TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER DEFAULT 0
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS security_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                actor TEXT,
                target TEXT,
                ip TEXT,
                meta TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id TEXT PRIMARY KEY,
                user_email TEXT,
                filename TEXT,
                sha256 TEXT,
                size_bytes INTEGER,
                risk_level TEXT,
                details TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        for stmt in ("ALTER TABLE reports ADD COLUMN is_public INTEGER DEFAULT 1",):
            try:
                await conn.execute(stmt)
            except Exception:
                pass
        await conn.commit()


def use_mongo() -> bool:
    return settings.DATABASE_BACKEND.lower() == "mongo"


# --- Users ---


async def find_user_by_email(email: str) -> dict[str, Any] | None:
    if use_mongo():
        from app.db.client import db

        doc = await db.users.find_one({"email": email})
        if doc:
            doc["id"] = str(doc["_id"])
        return doc

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT * FROM users WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def create_user(name: str, email: str, password_hash: str) -> tuple[str, str]:
    """Returns (user_id, otp_code). User is not verified until OTP confirmed."""
    otp_code, otp_expires = _new_email_otp()
    if use_mongo():
        from app.db.client import db

        result = await db.users.insert_one(
            {
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "role": "user",
                "email_verified": False,
                "otp_code": otp_code,
                "otp_expires": otp_expires,
            }
        )
        return str(result.inserted_id), otp_code

    from app.core.config import settings

    role = "admin" if settings.ADMIN_EMAIL and email == settings.ADMIN_EMAIL.lower() else "user"
    user_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            INSERT INTO users (id, name, email, password_hash, role, email_verified, otp_code, otp_expires)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (user_id, name, email, password_hash, role, otp_code, otp_expires),
        )
        await conn.commit()
    return user_id, otp_code


async def verify_user_email(email: str, otp: str) -> bool:
    user = await find_user_by_email(email)
    if not user:
        return False
    if str(user.get("otp_code", "")) != otp.strip():
        return False
    expires = user.get("otp_expires")
    if expires and datetime.utcnow() > datetime.fromisoformat(expires):
        return False
    if use_mongo():
        from app.db.client import db

        await db.users.update_one(
            {"email": email},
            {"$set": {"email_verified": True}, "$unset": {"otp_code": "", "otp_expires": ""}},
        )
        return True
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE users SET email_verified = 1, otp_code = NULL, otp_expires = NULL WHERE email = ?",
            (email,),
        )
        await conn.commit()
    return True


async def resend_user_otp(email: str) -> str | None:
    user = await find_user_by_email(email)
    if not user or user.get("email_verified") in (1, True):
        return None
    otp_code, otp_expires = _new_email_otp()
    if use_mongo():
        from app.db.client import db

        await db.users.update_one(
            {"email": email},
            {"$set": {"otp_code": otp_code, "otp_expires": otp_expires}},
        )
        return otp_code
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?",
            (otp_code, otp_expires, email),
        )
        await conn.commit()
    return otp_code


def is_email_verified(user: dict) -> bool:
    return bool(user.get("email_verified") in (1, True, "1"))


async def save_password_reset(email: str, code: str, expires_at: str) -> None:
    if use_mongo():
        from app.db.client import db

        await db.password_resets.update_one(
            {"email": email},
            {"$set": {"code": code, "expires_at": expires_at}},
            upsert=True,
        )
        return

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "INSERT OR REPLACE INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)",
            (email, code, expires_at),
        )
        await conn.commit()


async def get_password_reset(email: str) -> dict[str, Any] | None:
    if use_mongo():
        from app.db.client import db

        return await db.password_resets.find_one({"email": email})

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT * FROM password_resets WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def delete_password_reset(email: str) -> None:
    if use_mongo():
        from app.db.client import db

        await db.password_resets.delete_one({"email": email})
        return

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("DELETE FROM password_resets WHERE email = ?", (email,))
        await conn.commit()


async def update_password(email: str, password_hash: str) -> None:
    if use_mongo():
        from app.db.client import db

        await db.users.update_one({"email": email}, {"$set": {"password_hash": password_hash}})
        return

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (password_hash, email),
        )
        await conn.commit()


async def configure_user_totp(email: str, secret: str | None, enabled: bool) -> None:
    if use_mongo():
        from app.db.client import db

        update = {"totp_enabled": bool(enabled)}
        if secret is not None:
            update["totp_secret"] = secret
        else:
            update["totp_secret"] = None
        await db.users.update_one({"email": email}, {"$set": update})
        return

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE users SET totp_secret = ?, totp_enabled = ? WHERE email = ?",
            (secret, 1 if enabled else 0, email),
        )
        await conn.commit()


async def clear_user_totp(email: str) -> None:
    if use_mongo():
        from app.db.client import db

        await db.users.update_one({"email": email}, {"$set": {"totp_secret": None, "totp_enabled": False}})
        return

    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE email = ?",
            (email,),
        )
        await conn.commit()


# --- Reports ---


async def create_report(doc: dict[str, Any]) -> str:
    if use_mongo():
        from app.db.client import db

        result = await db.reports.insert_one(doc)
        return str(result.inserted_id)

    report_id = str(uuid.uuid4())
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            INSERT INTO reports (id, created_by, created_by_name, source_type, source_value, summary, details, created_at, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                doc["created_by"],
                doc.get("created_by_name", ""),
                doc["source_type"],
                doc["source_value"],
                doc["summary"],
                json.dumps(doc.get("details", [])),
                doc["created_at"],
                1 if doc.get("is_public", 1) else 0,
            ),
        )
        await conn.commit()
    return report_id


async def list_reports_for_user(email: str) -> list[dict[str, Any]]:
    if use_mongo():
        from app.db.client import db

        reports = []
        cursor = db.reports.find({"created_by": email}).sort("created_at", -1)
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            reports.append(doc)
        return reports

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM reports WHERE created_by = ? ORDER BY created_at DESC",
            (email,),
        ) as cur:
            rows = await cur.fetchall()
    out = []
    for row in rows:
        d = dict(row)
        d["details"] = json.loads(d.get("details") or "[]")
        out.append(d)
    return out


# --- Login security ---


async def check_login_allowed(email: str) -> str | None:
    if use_mongo():
        return None
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT * FROM login_attempts WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    locked = row["locked_until"]
    if locked and datetime.utcnow() < datetime.fromisoformat(locked):
        return "Too many failed attempts. Try again later."
    return None


async def get_login_failures(email: str) -> int:
    if use_mongo():
        return 0
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT failures FROM login_attempts WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()
    return int(row["failures"]) if row else 0


async def record_login_failure(email: str) -> None:
    from app.core.config import settings

    if use_mongo():
        return
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT failures FROM login_attempts WHERE email = ?", (email,)) as cur:
            row = await cur.fetchone()
        failures = (row["failures"] if row else 0) + 1
        locked_until = None
        if failures >= settings.MAX_LOGIN_ATTEMPTS:
            locked_until = (datetime.utcnow() + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)).isoformat()
        await conn.execute(
            """
            INSERT INTO login_attempts (email, failures, locked_until) VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until
            """,
            (email, failures, locked_until),
        )
        await conn.commit()


async def clear_login_failures(email: str) -> None:
    if use_mongo():
        return
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("DELETE FROM login_attempts WHERE email = ?", (email,))
        await conn.commit()


# --- Sessions ---


async def create_auth_session(email: str) -> dict[str, str]:
    sid = str(uuid.uuid4())
    now = datetime.utcnow()
    expires = now + timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            INSERT INTO auth_sessions (id, email, created_at, last_seen_at, expires_at, revoked)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (sid, email, now.isoformat(), now.isoformat(), expires.isoformat()),
        )
        await conn.commit()
    return {"id": sid, "expires_at": expires.isoformat()}


async def is_session_valid(session_id: str, email: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM auth_sessions WHERE id = ? AND email = ?",
            (session_id, email),
        ) as cur:
            row = await cur.fetchone()
    if not row:
        return False
    if int(row["revoked"]) == 1:
        return False
    if datetime.utcnow() > datetime.fromisoformat(row["expires_at"]):
        return False
    return True


async def touch_session(session_id: str) -> None:
    now = datetime.utcnow()
    expires = now + timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "UPDATE auth_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?",
            (now.isoformat(), expires.isoformat(), session_id),
        )
        await conn.commit()


async def revoke_session(session_id: str) -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute("UPDATE auth_sessions SET revoked = 1 WHERE id = ?", (session_id,))
        await conn.commit()


# --- CAPTCHA ---


async def create_captcha(answer: str, ttl_minutes: int = 5) -> str:
    cid = str(uuid.uuid4())
    expires = (datetime.utcnow() + timedelta(minutes=ttl_minutes)).isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "INSERT INTO captchas (id, answer, expires_at, used) VALUES (?, ?, ?, 0)",
            (cid, answer.strip(), expires),
        )
        await conn.commit()
    return cid


async def verify_captcha(captcha_id: str, answer: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT * FROM captchas WHERE id = ?", (captcha_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            return False
        if int(row["used"]) == 1:
            return False
        if datetime.utcnow() > datetime.fromisoformat(row["expires_at"]):
            return False
        if str(row["answer"]).strip() != str(answer).strip():
            return False
        await conn.execute("UPDATE captchas SET used = 1 WHERE id = ?", (captcha_id,))
        await conn.commit()
    return True


# --- SIEM / audit ---


async def log_security_event(
    event_type: str,
    severity: str,
    actor: str = "",
    target: str = "",
    ip: str = "",
    meta: dict | None = None,
) -> None:
    data = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "severity": severity,
        "actor": actor,
        "target": target,
        "ip": ip,
        "meta": json.dumps(meta or {}),
        "created_at": datetime.utcnow().isoformat(),
    }
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            INSERT INTO security_events (id, event_type, severity, actor, target, ip, meta, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["id"],
                data["event_type"],
                data["severity"],
                data["actor"],
                data["target"],
                data["ip"],
                data["meta"],
                data["created_at"],
            ),
        )
        await conn.commit()


async def list_security_events(limit: int = 200) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
    out = []
    for row in rows:
        d = dict(row)
        d["meta"] = json.loads(d.get("meta") or "{}")
        out.append(d)
    return out


async def detect_report_spike(source_type: str, source_value: str, minutes: int = 30, threshold: int = 3) -> bool:
    since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        async with conn.execute(
            """
            SELECT COUNT(*) FROM reports
            WHERE source_type = ? AND source_value = ? AND created_at >= ?
            """,
            (source_type, source_value, since),
        ) as cur:
            count = await cur.fetchone()
    return bool(count and int(count[0]) >= threshold)


async def save_file_scan(user_email: str, filename: str, content: bytes, risk_level: str, details: list[dict]) -> dict:
    file_id = str(uuid.uuid4())
    sha256 = hashlib.sha256(content).hexdigest()
    now = datetime.utcnow().isoformat()
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            """
            INSERT INTO uploaded_files (id, user_email, filename, sha256, size_bytes, risk_level, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (file_id, user_email, filename, sha256, len(content), risk_level, json.dumps(details), now),
        )
        await conn.commit()
    return {"id": file_id, "sha256": sha256, "created_at": now}


# --- Community & blacklist ---


async def list_community_reports(limit: int = 30) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            """
            SELECT id, source_type, source_value, summary, created_at
            FROM reports WHERE is_public = 1 ORDER BY created_at DESC LIMIT ?
            """,
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def list_all_reports(limit: int = 100) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT * FROM reports ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ) as cur:
            rows = await cur.fetchall()
    out = []
    for row in rows:
        d = dict(row)
        d["details"] = json.loads(d.get("details") or "[]")
        out.append(d)
    return out


async def create_anonymous_report(source_type: str, source_value: str, summary: str, platform: str) -> str:
    doc = {
        "created_by": "anonymous",
        "created_by_name": "Community",
        "source_type": source_type,
        "source_value": source_value,
        "summary": summary,
        "details": [{"label": "platform", "value": platform}],
        "created_at": datetime.utcnow().isoformat(),
        "is_public": 1,
    }
    rid = await create_report(doc)
    if source_type in ("url", "profile", "message"):
        await add_blacklist(source_value, source_type, summary[:120])
    return rid


async def add_blacklist(value: str, kind: str, reason: str = "") -> None:
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.execute(
            "INSERT OR IGNORE INTO blacklist (id, value, kind, reason, created_at) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), value.lower()[:500], kind, reason, datetime.utcnow().isoformat()),
        )
        await conn.commit()


async def list_blacklist(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT value, kind, reason, created_at FROM blacklist ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def match_blacklist(text: str) -> dict | None:
    lowered = text.lower()
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute(
            "SELECT value, kind, reason FROM blacklist WHERE instr(?, value) > 0 LIMIT 1",
            (lowered,),
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def admin_stats() -> dict:
    async with aiosqlite.connect(DB_PATH) as conn:
        users = await (await conn.execute("SELECT COUNT(*) FROM users")).fetchone()
        reports = await (await conn.execute("SELECT COUNT(*) FROM reports")).fetchone()
        blacklist = await (await conn.execute("SELECT COUNT(*) FROM blacklist")).fetchone()
        events = await (await conn.execute("SELECT COUNT(*) FROM security_events")).fetchone()
    return {
        "users": users[0] if users else 0,
        "reports": reports[0] if reports else 0,
        "blacklist_entries": blacklist[0] if blacklist else 0,
        "security_events": events[0] if events else 0,
    }


async def count_users() -> int:
    s = await admin_stats()
    return s["users"]
