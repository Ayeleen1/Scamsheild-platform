from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(UserBase):
    id: str
    email_verified: bool = True


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr
    requires_verification: bool = True
    otp_demo: str | None = None


class TOTPSetupResponse(BaseModel):
    provisioning_uri: str
    secret: str
    totp_enabled: bool = False


class TOTPStatusResponse(BaseModel):
    totp_enabled: bool


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str


class ResendOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_code: str | None = None
