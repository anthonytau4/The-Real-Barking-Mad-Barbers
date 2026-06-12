from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
ASSETS_DIR = STATIC_DIR / "assets"
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"
BOOKINGS_FILE = DATA_DIR / "bookings.json"

JWT_SECRET = (
    os.getenv("JWT_SECRET")
    or os.getenv("JWT-SECRET")
    or os.getenv("JWT_SECRET_KEY")
    or "dev-change-me-before-live"
)
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 45)))
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "false").strip().lower() in {"1", "true", "yes", "on"}

DATA_DIR.mkdir(parents=True, exist_ok=True)
for path, empty in ((USERS_FILE, {}), (BOOKINGS_FILE, [])):
    if not path.exists():
        path.write_text(json.dumps(empty), encoding="utf-8")


def split_env_list(*names: str) -> List[str]:
    values: List[str] = []
    for name in names:
        for item in os.getenv(name, "").split(","):
            clean = item.strip().rstrip("/")
            if clean and clean not in values:
                values.append(clean)
    return values


app = FastAPI(title="Barking Mad Barbers API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=split_env_list("CORS_ORIGINS", "ALLOWED_ORIGIN", "APP_URL") or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=500)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=500)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=10, max_length=5000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    provider: Optional[str] = Field(default="gemini", max_length=40)


class HelperRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    dog_size: Optional[str] = Field(default="", max_length=80)
    coat_type: Optional[str] = Field(default="", max_length=120)


class BookingRequest(BaseModel):
    first_name: Optional[str] = Field(default="", max_length=120)
    last_name: Optional[str] = Field(default="", max_length=120)
    owner_name: Optional[str] = Field(default="", max_length=160)
    phone: str = Field(min_length=3, max_length=80)
    email: Optional[str] = Field(default="", max_length=160)
    dog_name: str = Field(min_length=1, max_length=120)
    service_type: Optional[str] = Field(default="", max_length=120)
    service: Optional[str] = Field(default="", max_length=120)
    dog_size: Optional[str] = Field(default="", max_length=80)
    extras: Optional[List[str]] = Field(default_factory=list)
    breed: Optional[str] = Field(default="", max_length=120)
    preferred_date: Optional[str] = Field(default="", max_length=80)
    preferred_time: Optional[str] = Field(default="", max_length=80)
    estimated_total: Optional[float] = 0
    notes: Optional[str] = Field(default="", max_length=3000)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def email_norm(value: str) -> str:
    return clean(value).lower()


def read_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def admin_emails() -> List[str]:
    return [email_norm(email) for email in split_env_list("ADMIN_EMAILS")]


def role_for_email(email: str) -> str:
    return "admin" if email_norm(email) in admin_emails() else "user"


def password_hash(email: str, password: str) -> str:
    return hmac.new(JWT_SECRET.encode(), f"{email_norm(email)}:{password}".encode(), hashlib.sha256).hexdigest()


def b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + ("=" * (-len(data) % 4)))


def sign(payload: Dict[str, Any]) -> str:
    body = b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = b64e(hmac.new(JWT_SECRET.encode(), body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def verify(token: str, role: Optional[str] = None) -> Dict[str, Any]:
    try:
        body, sig = token.split(".", 1)
        expected = b64e(hmac.new(JWT_SECRET.encode(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        payload = json.loads(b64d(body))
        if float(payload.get("exp", 0)) < time.time():
            raise ValueError("expired")
        if role and payload.get("role") != role:
            raise ValueError("wrong role")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Not authenticated") from exc


def bearer(authorization: Optional[str], role: Optional[str] = None) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify(authorization.split(" ", 1)[1].strip(), role)


def auth_response(email: str, name: str = "") -> Dict[str, Any]:
    email = email_norm(email)
    role = role_for_email(email)
    exp = int(time.time() + TOKEN_TTL_SECONDS)
    user = {
        "id": hashlib.sha256(email.encode()).hexdigest()[:16],
        "name": clean(name) or email.split("@", 1)[0],
        "email": email,
        "role": role,
    }
    token = sign({"role": role, "email": email, "name": user["name"], "exp": exp, "iat": int(time.time())})
    return {"token": token, "access_token": token, "user": user, "profile": user, "expires_at": exp}


@app.get("/api/health")
@app.head("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "frontend_ready": (STATIC_DIR / "index.html").exists(),
        "cors_origins": split_env_list("CORS_ORIGINS", "ALLOWED_ORIGIN", "APP_URL"),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "available_ai_providers": [p for p, ok in (("gemini", os.getenv("GEMINI_API_KEY")), ("openai", os.getenv("OPENAI_API_KEY"))) if ok],
        "default_ai_provider": "gemini" if os.getenv("GEMINI_API_KEY") else "openai",
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "jwt_configured": JWT_SECRET != "dev-change-me-before-live",
    }


@app.get("/api/auth/google/config")
def google_auth_config() -> Dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    return {"enabled": bool(client_id), "client_id": client_id}


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    email = email_norm(payload.email)
    users = read_json(USERS_FILE, {})
    users[email] = {
        **users.get(email, {}),
        "email": email,
        "name": clean(payload.name),
        "password_hash": password_hash(email, payload.password),
        "role": role_for_email(email),
        "updated_at": now_iso(),
    }
    write_json(USERS_FILE, users)
    return auth_response(email, payload.name)


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    email = email_norm(payload.email)
    users = read_json(USERS_FILE, {})
    user = users.get(email)
    if user and hmac.compare_digest(user.get("password_hash", ""), password_hash(email, payload.password)):
        return auth_response(email, user.get("name", ""))
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if role_for_email(email) == "admin" and admin_password and hmac.compare_digest(payload.password, admin_password):
        return auth_response(email, email.split("@", 1)[0])
    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/api/auth/google")
async def google_auth(payload: GoogleAuthRequest) -> Dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": payload.id_token})
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified")
    data = response.json()
    if data.get("aud") != client_id:
        raise HTTPException(status_code=401, detail="Google sign-in used the wrong client")
    email = email_norm(str(data.get("email", "")))
    if not email or data.get("email_verified") not in {True, "true", "True", "1"}:
        raise HTTPException(status_code=401, detail="Google email is not verified")
    users = read_json(USERS_FILE, {})
    name = clean(str(data.get("name", ""))) or email.split("@", 1)[0]
    users[email] = {**users.get(email, {}), "email": email, "name": name, "google": True, "role": role_for_email(email), "updated_at": now_iso()}
    write_json(USERS_FILE, users)
    return auth_response(email, name)


@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = bearer(authorization)
    return {"user": auth_response(str(payload.get("email", "")), str(payload.get("name", "")))["user"]}


@app.post("/api/user/sign-in")
def old_user_sign_in(payload: RegisterRequest) -> Dict[str, Any]:
    return register(payload)


def local_answer(message: str) -> str:
    q = message.lower()
    if any(word in q for word in ("mat", "matted", "knot")):
        return "For matting, book a check first. Extra time or charges may apply because comfort comes before styling."
    if "flea" in q:
        return "If fleas are found, flea shampoo is added so the dog can be cleaned properly and safely."
    if any(word in q for word in ("price", "cost", "full groom", "wash")):
        return "Full Groom starts from $80 and Wash & Dry starts from $45. Final pricing depends on size, coat and condition."
    return "Tell us the dog size, coat condition and service you want. A calm one-on-one groom is planned around comfort."


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> Dict[str, Any]:
    system_prompt = (
        "You are The Barking Mad Helper for Barking Mad Barbers in Tawa, Wellington. "
        "Give short, kind grooming answers. Do not diagnose. For urgent health issues, tell the user to contact a vet. "
        "Facts: appointments only, text 027 247 2493, Mon-Sat 8:30am-3:00pm, Full Groom from $80, Wash & Dry from $45."
    )
    gemini_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=18) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent",
                    params={"key": gemini_key},
                    json={"contents": [{"parts": [{"text": f"{system_prompt}\n\nQuestion: {payload.message}"}]}]},
                )
            response.raise_for_status()
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if text:
                return {"reply": text.strip(), "answer": text.strip(), "provider": "gemini", "model": gemini_model}
        except Exception:
            pass
    answer = local_answer(payload.message)
    return {"reply": answer, "answer": answer, "provider": "local", "model": "local"}


@app.get("/api/chat/test")
async def chat_test(provider: Optional[str] = None) -> Dict[str, Any]:
    del provider
    return await chat(ChatRequest(message="Hello"))


@app.post("/api/helper")
async def helper(payload: HelperRequest) -> Dict[str, Any]:
    msg = "\n".join(part for part in (payload.question, payload.dog_size, payload.coat_type) if part)
    result = await chat(ChatRequest(message=msg))
    return {"answer": result["reply"], "reply": result["reply"], "source": result["provider"]}


@app.post("/api/bookings")
def submit_booking(payload: BookingRequest, request: Request) -> Dict[str, Any]:
    owner = clean(payload.owner_name) or clean(f"{payload.first_name} {payload.last_name}") or "Customer"
    service = clean(payload.service_type) or clean(payload.service)
    if not service:
        raise HTTPException(status_code=422, detail="Service is required")
    booking = {
        "id": uuid.uuid4().hex,
        "owner_name": owner,
        "first_name": clean(payload.first_name) or owner.split(" ", 1)[0],
        "last_name": clean(payload.last_name),
        "phone": clean(payload.phone),
        "email": email_norm(payload.email or ""),
        "dog_name": clean(payload.dog_name),
        "dog_size": clean(payload.dog_size),
        "service": service,
        "service_type": service,
        "extras": payload.extras or [],
        "breed": clean(payload.breed),
        "preferred_date": clean(payload.preferred_date),
        "preferred_time": clean(payload.preferred_time),
        "estimated_total": payload.estimated_total or 0,
        "notes": clean(payload.notes),
        "status": "New",
        "created_at": now_iso(),
        "source_ip": request.client.host if request.client else "",
    }
    bookings = read_json(BOOKINGS_FILE, [])
    if not isinstance(bookings, list):
        bookings = []
    bookings.insert(0, booking)
    write_json(BOOKINGS_FILE, bookings)
    return {"message": "Booking request submitted! We'll confirm via text soon.", "id": booking["id"], "booking": {k: v for k, v in booking.items() if k != "source_ip"}}


@app.get("/api/admin/bookings")
def admin_bookings(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, "admin")
    bookings = read_json(BOOKINGS_FILE, [])
    return {"bookings": [{k: v for k, v in booking.items() if k != "source_ip"} for booking in bookings if isinstance(booking, dict)]}


@app.put("/api/admin/bookings/{booking_id}/confirm")
def admin_confirm_booking(booking_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, "admin")
    bookings = read_json(BOOKINGS_FILE, [])
    for booking in bookings:
        if booking.get("id") == booking_id:
            booking["status"] = "Confirmed"
            booking["updated_at"] = now_iso()
            write_json(BOOKINGS_FILE, bookings)
            return {"ok": True, "booking": booking}
    raise HTTPException(status_code=404, detail="Booking not found")


@app.delete("/api/admin/bookings/{booking_id}")
def admin_delete_booking(booking_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, "admin")
    bookings = read_json(BOOKINGS_FILE, [])
    next_bookings = [booking for booking in bookings if booking.get("id") != booking_id]
    write_json(BOOKINGS_FILE, next_bookings)
    return {"ok": True}


@app.get("/")
@app.head("/")
def root():
    if SERVE_FRONTEND and (STATIC_DIR / "index.html").exists():
        return FileResponse(STATIC_DIR / "index.html")
    return {"ok": True, "service": "barking-mad-barbers-api", "health": "/api/health", "frontend_served_here": SERVE_FRONTEND}


@app.get("/{full_path:path}")
def frontend_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    requested = (STATIC_DIR / full_path).resolve()
    try:
        inside_static = requested.is_relative_to(STATIC_DIR.resolve())
    except AttributeError:
        inside_static = str(requested).startswith(str(STATIC_DIR.resolve()))
    if inside_static and requested.is_file():
        return FileResponse(requested)
    if SERVE_FRONTEND and (STATIC_DIR / "index.html").exists():
        return FileResponse(STATIC_DIR / "index.html")
    raise HTTPException(status_code=404, detail="Not Found")
