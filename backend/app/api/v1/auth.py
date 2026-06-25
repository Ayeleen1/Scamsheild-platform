import secrets
from datetime import datetime, timedelta
import random

import pyotp
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.core.validators import normalize_email, validate_email, validate_name, validate_password
from app.db import repository as repo
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RegisterResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    TOTPSetupResponse,
    TOTPStatusResponse,
    UserCreate,
    Token,
    UserResponse,
    VerifyEmailRequest,
)

router = APIRouter(tags=["auth"])


@router.get("/captcha")
async def get_captcha():
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    op = random.choice(["+", "-"])
    answer = str(a + b) if op == "+" else str(a - b)
    captcha_id = await repo.create_captcha(answer)
    return {"captcha_id": captcha_id, "question": f"{a} {op} {b} = ?"}


@router.post("/register", response_model=RegisterResponse)
async def register(user_create: UserCreate):
    name = validate_name(user_create.name)
    email = validate_email(str(user_create.email))
    validate_password(user_create.password)

    existing = await repo.find_user_by_email(email)
    if existing:
        if repo.is_email_verified(existing):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        otp = await repo.resend_user_otp(email)
        return RegisterResponse(
            message="Account exists but email not verified. New OTP generated (demo: shown below).",
            email=email,
            otp_demo=otp,
        )

    _, otp_code = await repo.create_user(name, email, get_password_hash(user_create.password))
    return RegisterResponse(
        message="Account created. Verify email with OTP before login (demo: OTP shown below).",
        email=email,
        otp_demo=otp_code,
    )


@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_2fa(current_user: dict = Depends(get_current_user)):
    user = await repo.find_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.get("totp_enabled") in (1, True, "1"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA already enabled")

    secret = pyotp.random_base32()
    await repo.configure_user_totp(current_user["email"], secret, False)
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user["email"], issuer_name="ScamShield AI"
    )
    return TOTPSetupResponse(provisioning_uri=provisioning_uri, secret=secret, totp_enabled=False)


@router.post("/2fa/verify")
async def verify_2fa(code: str = Form(...), current_user: dict = Depends(get_current_user)):
    user = await repo.find_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    secret = user.get("totp_secret")
    if not secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup required first")
    totp = pyotp.TOTP(secret)
    if not totp.verify(code.strip(), valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    await repo.configure_user_totp(current_user["email"], secret, True)
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
async def disable_2fa(code: str = Form(...), current_user: dict = Depends(get_current_user)):
    user = await repo.find_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.get("totp_enabled") not in (1, True, "1"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")
    secret = user.get("totp_secret")
    if not secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA secret missing")
    totp = pyotp.TOTP(secret)
    if not totp.verify(code.strip(), valid_window=1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    await repo.clear_user_totp(current_user["email"])
    return {"message": "2FA disabled successfully"}


@router.get("/2fa/status", response_model=TOTPStatusResponse)
async def totp_status(current_user: dict = Depends(get_current_user)):
    user = await repo.find_user_by_email(current_user["email"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    enabled = user.get("totp_enabled") in (1, True, "1")
    return TOTPStatusResponse(totp_enabled=enabled)


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest):
    email = validate_email(str(body.email))
    otp = body.otp.strip()
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be 6 digits")

    user = await repo.find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found. Register first.")

    if repo.is_email_verified(user):
        return {"message": "Email already verified. You can log in."}

    if not await repo.verify_user_email(email, otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    return {"message": "Email verified successfully. You can log in now."}


@router.post("/resend-otp")
async def resend_otp(body: ResendOtpRequest):
    email = validate_email(str(body.email))
    user = await repo.find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="No account with this email. Register first.")
    if repo.is_email_verified(user):
        return {"message": "Email already verified.", "otp_demo": None}

    otp = await repo.resend_user_otp(email)
    return {
        "message": "New OTP generated (demo: shown on screen; production would email it).",
        "otp_demo": otp,
    }


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    totp_code: str | None = Form(None),
    captcha_id: str | None = Form(None),
    captcha_answer: str | None = Form(None),
):
    email = validate_email(form_data.username)
    user = await repo.find_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account with this email. Please register first.",
        )

    lock_msg = await repo.check_login_allowed(email)
    if lock_msg:
        await repo.log_security_event(
            event_type="login_blocked",
            severity="high",
            actor=email,
            ip=request.client.host if request.client else "",
            meta={"reason": lock_msg},
        )
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=lock_msg)

    failures = await repo.get_login_failures(email)
    captcha_needed = settings.CAPTCHA_ALWAYS_ON or failures >= settings.CAPTCHA_TRIGGER_FAILURES
    if captcha_needed:
        if not captcha_id or not captcha_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Captcha required. Call /api/v1/auth/captcha and submit captcha_id + captcha_answer.",
            )
        if not await repo.verify_captcha(captcha_id, captcha_answer):
            await repo.record_login_failure(email)
            await repo.log_security_event(
                event_type="captcha_failed",
                severity="medium",
                actor=email,
                ip=request.client.host if request.client else "",
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid captcha")

    if not repo.is_email_verified(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Enter OTP at /auth/verify-email before login.",
        )

    if not verify_password(form_data.password, user["password_hash"]):
        await repo.record_login_failure(email)
        await repo.log_security_event(
            event_type="login_failed",
            severity="medium",
            actor=email,
            ip=request.client.host if request.client else "",
            meta={"reason": "bad_password"},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    if user.get("totp_enabled") in (1, True, "1"):
        secret = user.get("totp_secret") or ""
        if not totp_code:
            await repo.record_login_failure(email)
            await repo.log_security_event(
                event_type="login_failed",
                severity="medium",
                actor=email,
                ip=request.client.host if request.client else "",
                meta={"reason": "totp_required"},
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="TOTP code required")
        if not pyotp.TOTP(secret).verify(totp_code.strip(), valid_window=1):
            await repo.record_login_failure(email)
            await repo.log_security_event(
                event_type="login_failed",
                severity="medium",
                actor=email,
                ip=request.client.host if request.client else "",
                meta={"reason": "totp_invalid"},
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid TOTP code")

    await repo.clear_login_failures(email)
    session = await repo.create_auth_session(user["email"])
    token = create_access_token(
        {"sub": user["email"], "name": user["name"], "role": user.get("role", "user")},
        session_id=session["id"],
    )
    await repo.log_security_event(
        event_type="login_success",
        severity="low",
        actor=email,
        ip=request.client.host if request.client else "",
    )
    return Token(access_token=token)


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    if current_user.get("sid"):
        await repo.revoke_session(current_user["sid"])
    return {"message": "Logged out. Remove token on the client."}


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: dict = Depends(get_current_user)):
    user = await repo.find_user_by_email(current_user["email"])
    uid = user["id"] if user else "unknown"
    if isinstance(uid, bytes):
        uid = uid.decode()
    verified = repo.is_email_verified(user) if user else True
    return UserResponse(
        id=str(uid),
        name=current_user["name"],
        email=current_user["email"],
        email_verified=verified,
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest):
    email = validate_email(str(body.email))
    user = await repo.find_user_by_email(email)

    if not user:
        return ForgotPasswordResponse(
            message="If this email is registered, a reset code has been generated.",
            reset_code=None,
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    await repo.save_password_reset(email, code, expires)

    return ForgotPasswordResponse(
        message="Reset code generated (demo: shown below; production would email this code).",
        reset_code=code,
    )


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    email = validate_email(str(body.email))
    validate_password(body.new_password)

    if len(body.reset_code.strip()) != 6 or not body.reset_code.strip().isdigit():
        raise HTTPException(status_code=400, detail="Reset code must be 6 digits")

    record = await repo.get_password_reset(email)
    if not record:
        raise HTTPException(status_code=400, detail="No reset request found. Request a new code.")

    if record["code"] != body.reset_code.strip():
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if datetime.utcnow() > datetime.fromisoformat(record["expires_at"]):
        raise HTTPException(status_code=400, detail="Reset code expired. Request a new one.")

    user = await repo.find_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    await repo.update_password(email, get_password_hash(body.new_password))
    await repo.delete_password_reset(email)
    return {"message": "Password reset successful. You can log in now."}


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    validate_password(request.new_password)

    user = await repo.find_user_by_email(current_user["email"])
    if not user or not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    await repo.update_password(current_user["email"], get_password_hash(request.new_password))
    return {"message": "Password updated successfully"}
