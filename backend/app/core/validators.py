import re

from fastapi import HTTPException, status

EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$"
)

DISPOSABLE_DOMAINS = {
    "mailinator.com",
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str:
    email = normalize_email(email)
    if not email or len(email) > 254:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address")
    if ".." in email or email.startswith(".") or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format")
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use a valid email like name@gmail.com (must include @ and .com/.pk etc.)",
        )
    domain = email.split("@")[-1]
    if domain in DISPOSABLE_DOMAINS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Disposable email addresses are not allowed")
    return email


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    if len(password) > 128:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password needs at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password needs at least one lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password needs at least one number")


def validate_name(name: str) -> str:
    name = name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name must be at least 2 characters")
    if len(name) > 80:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is too long")
    return name
