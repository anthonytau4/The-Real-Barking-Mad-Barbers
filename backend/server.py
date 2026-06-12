from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
ASSETS_DIR = STATIC_DIR / "assets"
DATA_DIR = BASE_DIR / "data"
BOOKINGS_FILE = DATA_DIR / "bookings.json"
USERS_FILE = DATA_DIR / "users.json"

JWT_SECRET = os.getenv("JWT-SECRET") or os.getenv("JWT_SECRET") or "dev-change-me-before-live"
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 45)))
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "true").strip().lower() not in {"0", "false", "no", "off"}

DATA_DIR.mkdir(parents=True, exist_ok=True)
for file_path, empty_value in ((BOOKINGS_FILE, []), (USERS_FILE, {})):
    if not file_path.exists():
        file_path.write_text(json.dumps(empty_value), encoding="utf-8")

store_lock = threading.Lock()


def split_env_list(*names: str) -> List[str]:
    values: List[str] = []
    for name in names:
        raw = os.getenv(name, "")
        for item in raw.split(","):
            clean = item.strip().rstrip("/")
            if clean and clean not in values:
                values.append(clean)
    return values


cors_origins = split_env_list("CORS_ORIGINS", "ALLOWED_ORIGIN", "APP_URL", "REACT_APP_BACKEND_URL")
if not cors_origins:
    cors_origins = ["*"]

app = FastAPI(title="Barking Mad Barbers", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


class UserSignInPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=160)
    phone: Optional[str] = Field(default="", max_length=80)
    dog_name: Optional[str] = Field(default="", max_length=120)


class AdminLoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=1, max_length=500)


class BookingCreate(BaseModel):
    owner_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=3, max_length=80)
    email: Optional[str] = Field(default="", max_length=160)
    dog_name: str = Field(min_length=1, max_length=120)
    dog_size: str = Field(min_length=1, max_length=30)
    service: str = Field(min_length=1, max_length=80)
    preferred_date: Optional[str] = Field(default="", max_length=40)
    preferred_time: Optional[str] = Field(default="", max_length=40)
    notes: Optional[str] = Field(default="", max_length=2000)


class BookingUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=60)
    staff_notes: Optional[str] = Field(default=None, max_length=2000)


class HelperPayload(BaseModel):
    question: str = Field(min_length=2, max_length=1200)
    dog_size: Optional[str] = Field(default="", max_length=50)
    coat_type: Optional[str] = Field(default="", max_length=80)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_text(value: Optional[str]) -> str:
    value = (value or "").strip()
    return re.sub(r"\s+", " ", value)


def normalise_email(email: str) -> str:
    return clean_text(email).lower()


def admin_emails() -> List[str]:
    return [normalise_email(email) for email in split_env_list("ADMIN_EMAILS")]


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def sign_payload(payload: Dict[str, Any]) -> str:
    body = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(JWT_SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{b64url_encode(sig)}"


def verify_token(token: str, required_role: Optional[str] = None) -> Dict[str, Any]:
    try:
        body, sig = token.split(".", 1)
        expected = b64url_encode(hmac.new(JWT_SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        payload = json.loads(b64url_decode(body))
        if float(payload.get("exp", 0)) < time.time():
            raise ValueError("expired")
        if required_role and payload.get("role") != required_role:
            raise ValueError("wrong role")
        return payload
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Please sign in again.") from exc


def bearer_payload(authorization: Optional[str], required_role: Optional[str] = None) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    return verify_token(authorization.split(" ", 1)[1].strip(), required_role)


def current_admin(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = bearer_payload(authorization, "admin")
    if normalise_email(str(payload.get("email", ""))) not in admin_emails():
        raise HTTPException(status_code=401, detail="Admin sign in required.")
    return payload


def current_user_optional(authorization: Optional[str] = Header(default=None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        return verify_token(authorization.split(" ", 1)[1].strip(), "user")
    except HTTPException:
        return None


def read_json(path: Path, fallback: Any) -> Any:
    with store_lock:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data
        except Exception:  # noqa: BLE001
            return fallback


def write_json(path: Path, data: Any) -> None:
    with store_lock:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "Barking Mad Barbers",
        "python_backend": True,
        "serve_frontend": SERVE_FRONTEND,
        "admin_configured": bool(admin_emails() and os.getenv("ADMIN_PASSWORD")),
        "helper_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")),
        "time": now_iso(),
    }


@app.get("/api/config")
def public_config() -> Dict[str, Any]:
    return {
        "google_client_id_configured": bool(os.getenv("GOOGLE_CLIENT_ID")),
        "app_url": os.getenv("APP_URL", ""),
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "site": "Barking Mad Barbers",
    }


@app.post("/api/user/sign-in")
def user_sign_in(payload: UserSignInPayload) -> Dict[str, Any]:
    email = normalise_email(payload.email)
    profile = {
        "id": hashlib.sha256(email.encode("utf-8")).hexdigest()[:16],
        "name": clean_text(payload.name),
        "email": email,
        "phone": clean_text(payload.phone),
        "dog_name": clean_text(payload.dog_name),
        "updated_at": now_iso(),
    }
    users = read_json(USERS_FILE, {})
    users[email] = profile
    write_json(USERS_FILE, users)
    exp = int(time.time() + TOKEN_TTL_SECONDS)
    token = sign_payload({"role": "user", "email": email, "name": profile["name"], "exp": exp, "iat": int(time.time())})
    return {"token": token, "profile": profile, "expires_at": exp}


@app.get("/api/user/me")
def user_me(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = bearer_payload(authorization, "user")
    email = normalise_email(str(payload.get("email", "")))
    users = read_json(USERS_FILE, {})
    profile = users.get(email, {"email": email, "name": payload.get("name", "")})
    return {"profile": profile, "expires_at": payload.get("exp")}


@app.post("/api/admin/login")
def admin_login(payload: AdminLoginPayload) -> Dict[str, Any]:
    configured_emails = admin_emails()
    configured_password = os.getenv("ADMIN_PASSWORD")
    if not configured_emails or not configured_password:
        raise HTTPException(status_code=500, detail="ADMIN_EMAILS and ADMIN_PASSWORD are not configured on Render yet.")
    email = normalise_email(payload.email)
    if email not in configured_emails or not hmac.compare_digest(payload.password, configured_password):
        raise HTTPException(status_code=401, detail="Wrong admin email or password.")
    exp = int(time.time() + TOKEN_TTL_SECONDS)
    token = sign_payload({"role": "admin", "email": email, "exp": exp, "iat": int(time.time())})
    return {"token": token, "email": email, "expires_at": exp}


@app.get("/api/admin/me")
def admin_me(admin: Dict[str, Any] = Depends(current_admin)) -> Dict[str, Any]:
    return {"email": normalise_email(str(admin.get("email"))), "expires_at": admin.get("exp")}


@app.post("/api/bookings", status_code=201)
def create_booking(payload: BookingCreate, request: Request, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user_payload = current_user_optional(authorization)
    booking = {
        "id": uuid.uuid4().hex[:12],
        "owner_name": clean_text(payload.owner_name),
        "phone": clean_text(payload.phone),
        "email": normalise_email(payload.email or ""),
        "dog_name": clean_text(payload.dog_name),
        "dog_size": clean_text(payload.dog_size),
        "service": clean_text(payload.service),
        "preferred_date": clean_text(payload.preferred_date),
        "preferred_time": clean_text(payload.preferred_time),
        "notes": clean_text(payload.notes),
        "status": "New",
        "staff_notes": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "user_email": normalise_email(str(user_payload.get("email", ""))) if user_payload else "",
        "source_ip": request.client.host if request.client else "",
    }
    bookings = read_json(BOOKINGS_FILE, [])
    if not isinstance(bookings, list):
        bookings = []
    bookings.insert(0, booking)
    write_json(BOOKINGS_FILE, bookings)
    return {"ok": True, "booking": {k: v for k, v in booking.items() if k != "source_ip"}}


@app.get("/api/bookings/mine")
def my_bookings(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = bearer_payload(authorization, "user")
    email = normalise_email(str(user.get("email", "")))
    bookings = read_json(BOOKINGS_FILE, [])
    mine = [
        {k: v for k, v in booking.items() if k != "source_ip"}
        for booking in bookings
        if normalise_email(booking.get("email", "")) == email or normalise_email(booking.get("user_email", "")) == email
    ]
    return {"bookings": mine}


@app.get("/api/admin/bookings")
def list_admin_bookings(admin: Dict[str, Any] = Depends(current_admin)) -> Dict[str, Any]:
    del admin
    bookings = read_json(BOOKINGS_FILE, [])
    if not isinstance(bookings, list):
        bookings = []
    safe = [{k: v for k, v in booking.items() if k != "source_ip"} for booking in bookings]
    return {"bookings": safe}


@app.patch("/api/admin/bookings/{booking_id}")
def update_booking(booking_id: str, payload: BookingUpdate, admin: Dict[str, Any] = Depends(current_admin)) -> Dict[str, Any]:
    del admin
    bookings = read_json(BOOKINGS_FILE, [])
    for booking in bookings:
        if booking.get("id") == booking_id:
            if payload.status is not None:
                booking["status"] = clean_text(payload.status) or booking.get("status", "New")
            if payload.staff_notes is not None:
                booking["staff_notes"] = clean_text(payload.staff_notes)
            booking["updated_at"] = now_iso()
            write_json(BOOKINGS_FILE, bookings)
            return {"ok": True, "booking": {k: v for k, v in booking.items() if k != "source_ip"}}
    raise HTTPException(status_code=404, detail="Booking not found.")


@app.delete("/api/admin/bookings/{booking_id}")
def delete_booking(booking_id: str, admin: Dict[str, Any] = Depends(current_admin)) -> Dict[str, Any]:
    del admin
    bookings = read_json(BOOKINGS_FILE, [])
    next_bookings = [booking for booking in bookings if booking.get("id") != booking_id]
    if len(next_bookings) == len(bookings):
        raise HTTPException(status_code=404, detail="Booking not found.")
    write_json(BOOKINGS_FILE, next_bookings)
    return {"ok": True}


def local_helper_answer(payload: HelperPayload) -> str:
    question = clean_text(payload.question).lower()
    bits = []
    if any(word in question for word in ["matted", "mat", "knot", "knots"]):
        bits.append("For matting, the safest next step is to book a check first. Extra time or extra charges may apply if the coat is badly matted, because comfort comes before styling.")
    if any(word in question for word in ["flea", "fleas"]):
        bits.append("If fleas are found, flea shampoo is added to the groom so the dog can be cleaned properly and safely.")
    if any(word in question for word in ["price", "cost", "full groom", "wash"]):
        bits.append("Full Groom starts from $80 for tiny dogs and Wash & Dry starts from $45. Final pricing depends on size, coat condition and the service chosen.")
    if any(word in question for word in ["cancel", "cancellation", "reschedule"]):
        bits.append("Please give at least 1 day of notice for cancellations. The price guide notes a 50% cancellation fee if not notified 1 day prior.")
    if not bits:
        bits.append("Tell us the dog size, coat condition and the service you want. A calm one-on-one groom is usually best planned around your dog's coat, confidence and comfort level.")
    if payload.dog_size or payload.coat_type:
        bits.append(f"Noted details: {clean_text(payload.dog_size)} {clean_text(payload.coat_type)}.".strip())
    return " ".join(bits)


@app.post("/api/helper")
async def helper(payload: HelperPayload) -> Dict[str, Any]:
    # Optional Gemini helper. It stays useful even when no AI key is configured.
    system_prompt = (
        "You are Barky, the friendly Barking Mad Barbers grooming helper for a home-based dog grooming business in Tawa, Wellington, New Zealand. "
        "Give short, practical, kind answers. Do not diagnose dogs. For urgent health issues, tell the user to contact a vet. "
        "Use these facts when relevant: appointments only, text 027 247 2493 for booking, email barkingmadbarbers@gmail.com, Tawa Wellington, Monday to Thursday 8:30am to 3:00pm. "
        "Full Groom includes warm bath, shampoo and condition, blow dry, brush out, full body clip, scissor-finish face and feet, nail trim, ear cleaning, anal gland expression. Prices: tiny $80, small $90, medium $110, large $130. "
        "Wash and Dry includes warm bath, shampoo and condition, blow dry, brush out, nail trim, anal gland expression and cologne. Prices: tiny $45, small $50, medium $55, large $60. "
        "Extras: flea shampoo $20, nail trim $20, teeth brush $10, face tidy $10, anal gland expression $20. "
        "Mention that additional charges may apply for badly matted dogs, flea shampoo is added if fleas are found, and a 50% cancellation fee applies without 1 day notice. "
        "Do not use markdown tables unless asked. Keep it simple."
    )
    gemini_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    openai_key = os.getenv("OPENAI_API_KEY")
    question = clean_text(payload.question)
    details = f"Dog size: {clean_text(payload.dog_size)}\nCoat type: {clean_text(payload.coat_type)}"
    try:
        if gemini_key:
            async with httpx.AsyncClient(timeout=18) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}",
                    json={
                        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{details}\nQuestion: {question}"}]}],
                        "generationConfig": {"temperature": 0.35, "maxOutputTokens": 260},
                    },
                )
                response.raise_for_status()
                data = response.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text:
                    return {"answer": text.strip(), "source": "gemini"}
        if openai_key:
            async with httpx.AsyncClient(timeout=18) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={
                        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"{details}\nQuestion: {question}"},
                        ],
                        "temperature": 0.35,
                        "max_tokens": 260,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return {"answer": data["choices"][0]["message"]["content"].strip(), "source": "openai-fallback"}
    except Exception:  # noqa: BLE001
        pass
    return {"answer": local_helper_answer(payload), "source": "local"}


@app.get("/")
def index():
    if SERVE_FRONTEND and (STATIC_DIR / "index.html").exists():
        return FileResponse(STATIC_DIR / "index.html")
    return JSONResponse({"ok": True, "service": "Barking Mad Barbers API"})


@app.get("/{full_path:path}")
def frontend_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")
    requested = (STATIC_DIR / full_path).resolve()
    static_root = STATIC_DIR.resolve()
    try:
        inside_static = requested.is_relative_to(static_root)
    except AttributeError:
        inside_static = str(requested).startswith(str(static_root))
    if inside_static and requested.is_file():
        return FileResponse(requested)
    if SERVE_FRONTEND and (STATIC_DIR / "index.html").exists():
        return FileResponse(STATIC_DIR / "index.html")
    raise HTTPException(status_code=404, detail="Not found.")
