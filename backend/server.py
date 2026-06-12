from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import smtplib
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
ASSETS_DIR = STATIC_DIR / "assets"
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data"))).resolve()
DB_FILE = DATA_DIR / "barking_mad.sqlite3"
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("JWT-SECRET") or os.getenv("JWT_SECRET_KEY") or "dev-change-me-before-live"
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 45)))
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "false").strip().lower() in {"1", "true", "yes", "on"}
DATA_DIR.mkdir(parents=True, exist_ok=True)


def split_env_list(*names: str) -> List[str]:
    out: List[str] = []
    for name in names:
        for item in os.getenv(name, "").split(","):
            value = item.strip().rstrip("/")
            if value and value not in out:
                out.append(value)
    return out


def clean(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def email_norm(value: str) -> str:
    return clean(value).lower()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def admin_emails() -> List[str]:
    return [email_norm(email) for email in split_env_list("ADMIN_EMAILS")]


def is_admin_email(email: str) -> bool:
    return email_norm(email) in admin_emails()


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


def verify_token(token: str, require_admin: bool = False) -> Dict[str, Any]:
    try:
        body, sig = token.split(".", 1)
        expected = b64e(hmac.new(JWT_SECRET.encode(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        payload = json.loads(b64d(body))
        if float(payload.get("exp", 0)) < time.time():
            raise ValueError("expired")
        if require_admin and not (payload.get("is_admin") is True and is_admin_email(str(payload.get("email", "")))):
            raise ValueError("admin required")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Not authenticated") from exc


def bearer(authorization: Optional[str], require_admin: bool = False) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(authorization.split(" ", 1)[1].strip(), require_admin=require_admin)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def row_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    data = dict(row)
    if "dogs" in data:
        try:
            data["dogs"] = json.loads(data["dogs"] or "[]")
        except json.JSONDecodeError:
            data["dogs"] = []
    for key in ("is_admin", "google", "google_email_verified", "is_read"):
        if key in data:
            data[key] = bool(data[key])
    return data


def rows(rows_in: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_dict(row) or {} for row in rows_in]


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL DEFAULT '',password_hash TEXT,google INTEGER NOT NULL DEFAULT 0,google_email_verified INTEGER NOT NULL DEFAULT 0,is_admin INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,user_email TEXT,owner_name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',dog_name TEXT NOT NULL DEFAULT '',dogs TEXT NOT NULL DEFAULT '[]',dog_size TEXT NOT NULL DEFAULT '',breed TEXT NOT NULL DEFAULT '',service TEXT NOT NULL DEFAULT '',preferred_date TEXT NOT NULL DEFAULT '',preferred_time TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'New',staff_notes TEXT NOT NULL DEFAULT '',source_ip TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS contacts(id TEXT PRIMARY KEY,name TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',is_read INTEGER NOT NULL DEFAULT 0,source_ip TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS gallery(id TEXT PRIMARY KEY,user_email TEXT,owner_name TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',dog_name TEXT NOT NULL DEFAULT '',caption TEXT NOT NULL DEFAULT '',image_url TEXT NOT NULL DEFAULT '',image_data TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS family_requests(id TEXT PRIMARY KEY,user_email TEXT,name TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',request_type TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS chat_logs(id TEXT PRIMARY KEY,user_email TEXT,message TEXT NOT NULL DEFAULT '',reply TEXT NOT NULL DEFAULT '',provider TEXT NOT NULL DEFAULT '',model TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
        """)


def upsert_user(email: str, name: str, *, password: Optional[str] = None, google: bool = False, google_verified: bool = False, is_admin: bool = False) -> Dict[str, Any]:
    email = email_norm(email)
    user_id = hashlib.sha256(email.encode()).hexdigest()[:16]
    now = now_iso()
    with db() as conn:
        existing = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        existing_hash = existing["password_hash"] if existing else None
        created_at = existing["created_at"] if existing else now
        conn.execute(
            """
            INSERT INTO users(id,email,name,password_hash,google,google_email_verified,is_admin,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=COALESCE(excluded.password_hash,users.password_hash),google=MAX(users.google,excluded.google),google_email_verified=MAX(users.google_email_verified,excluded.google_email_verified),is_admin=excluded.is_admin,updated_at=excluded.updated_at
            """,
            (user_id, email, clean(name), password_hash(email, password) if password is not None else existing_hash, int(google), int(google_verified), int(is_admin), created_at, now),
        )
        return row_dict(conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()) or {}


def auth_response(email: str, name: str = "", is_admin: bool = False) -> Dict[str, Any]:
    email = email_norm(email)
    exp = int(time.time() + TOKEN_TTL_SECONDS)
    user = {"id": hashlib.sha256(email.encode()).hexdigest()[:16], "name": clean(name) or email.split("@", 1)[0], "email": email, "role": "admin" if is_admin else "user", "is_admin": bool(is_admin)}
    token = sign({"email": email, "name": user["name"], "role": user["role"], "is_admin": bool(is_admin), "exp": exp, "iat": int(time.time())})
    return {"token": token, "access_token": token, "user": user, "profile": user, "expires_at": exp}


def request_email(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    try:
        return email_norm(str(bearer(authorization).get("email", "")))
    except HTTPException:
        return ""


def notify_admin(subject: str, lines: List[str]) -> None:
    recipients = split_env_list("ADMIN_NOTIFICATION_EMAILS", "ADMIN_EMAILS")
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "")).strip() or (recipients[0] if recipients else "")
    if not recipients or not host or not sender:
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.set_content("\n".join(lines))
    try:
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=10) as smtp:
            if os.getenv("SMTP_TLS", "true").strip().lower() not in {"0", "false", "no", "off"}:
                smtp.starttls()
            if os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
                smtp.login(os.getenv("SMTP_USER", ""), os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(msg)
    except Exception:
        return


app = FastAPI(title="Barking Mad Barbers API", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=split_env_list("CORS_ORIGINS", "ALLOWED_ORIGIN", "APP_URL") or ["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
init_db()


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
    dog_name: Optional[str] = Field(default="", max_length=120)
    dogs: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    service_type: Optional[str] = Field(default="", max_length=120)
    service: Optional[str] = Field(default="", max_length=120)
    dog_size: Optional[str] = Field(default="", max_length=80)
    breed: Optional[str] = Field(default="", max_length=120)
    preferred_date: Optional[str] = Field(default="", max_length=80)
    preferred_time: Optional[str] = Field(default="", max_length=80)
    notes: Optional[str] = Field(default="", max_length=3000)


class BookingUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=80)
    staff_notes: Optional[str] = Field(default=None, max_length=3000)


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: Optional[str] = Field(default="", max_length=160)
    phone: Optional[str] = Field(default="", max_length=80)
    message: str = Field(min_length=1, max_length=3000)


class GallerySubmitRequest(BaseModel):
    owner_name: Optional[str] = Field(default="", max_length=160)
    email: Optional[str] = Field(default="", max_length=160)
    dog_name: str = Field(min_length=1, max_length=120)
    caption: Optional[str] = Field(default="", max_length=1000)
    image_url: Optional[str] = Field(default="", max_length=1000)
    image_data: Optional[str] = Field(default="", max_length=1_500_000)


class FamilyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: Optional[str] = Field(default="", max_length=160)
    phone: Optional[str] = Field(default="", max_length=80)
    request_type: Optional[str] = Field(default="", max_length=120)
    message: str = Field(min_length=1, max_length=3000)


@app.get("/api/health")
@app.head("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "frontend_ready": (STATIC_DIR / "index.html").exists(), "cors_origins": split_env_list("CORS_ORIGINS", "ALLOWED_ORIGIN", "APP_URL"), "gemini_configured": bool(os.getenv("GEMINI_API_KEY")), "openai_configured": bool(os.getenv("OPENAI_API_KEY")), "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), "jwt_configured": JWT_SECRET != "dev-change-me-before-live", "storage": "sqlite", "database": str(DB_FILE)}


@app.get("/api/auth/google/config")
def google_config() -> Dict[str, Any]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    return {"enabled": bool(client_id), "client_id": client_id}


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    email = email_norm(payload.email)
    if is_admin_email(email):
        raise HTTPException(status_code=403, detail="Please use admin sign-in for this email address.")
    user = upsert_user(email, payload.name, password=payload.password, is_admin=False)
    return auth_response(email, user.get("name", ""), False)


@app.post("/api/auth/login")
@app.post("/api/admin/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    email = email_norm(payload.email)
    with db() as conn:
        user = row_dict(conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone())
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if is_admin_email(email) and admin_password and hmac.compare_digest(payload.password, admin_password):
        user = upsert_user(email, user.get("name", email.split("@", 1)[0]) if user else email.split("@", 1)[0], is_admin=True)
        return auth_response(email, user.get("name", ""), True)
    if user and user.get("password_hash") and hmac.compare_digest(user["password_hash"], password_hash(email, payload.password)):
        if user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Please use the admin password for this email address.")
        return auth_response(email, user.get("name", ""), False)
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
    verified = data.get("email_verified") in {True, "true", "True", "1"}
    if not email or not verified:
        raise HTTPException(status_code=401, detail="Google email is not verified")
    is_admin = is_admin_email(email)
    user = upsert_user(email, clean(str(data.get("name", ""))) or email.split("@", 1)[0], google=True, google_verified=True, is_admin=is_admin)
    return auth_response(email, user.get("name", ""), is_admin)


@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = bearer(authorization)
    return {"user": auth_response(str(payload.get("email", "")), str(payload.get("name", "")), bool(payload.get("is_admin")))["user"]}


@app.post("/api/user/sign-in")
def old_sign_in(payload: RegisterRequest) -> Dict[str, Any]:
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
async def chat(payload: ChatRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    answer = ""
    provider = "local"
    model = "local"
    gemini_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = "You are The Barking Mad Helper for Barking Mad Barbers in Tawa, Wellington. Give short, kind grooming answers. Do not diagnose. Facts: appointments only, text 027 247 2493, Mon-Sat 8:30am-3:00pm, Full Groom from $80, Wash & Dry from $45.\n\nQuestion: " + payload.message
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=18) as client:
                response = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent", params={"key": gemini_key}, json={"contents": [{"parts": [{"text": prompt}]}]})
            response.raise_for_status()
            answer = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            if answer:
                provider, model = "gemini", gemini_model
        except Exception:
            answer = ""
    if not answer:
        answer = local_answer(payload.message)
    with db() as conn:
        conn.execute("INSERT INTO chat_logs(id,user_email,message,reply,provider,model,created_at) VALUES(?,?,?,?,?,?,?)", (uuid.uuid4().hex, request_email(authorization), clean(payload.message), answer, provider, model, now_iso()))
    return {"reply": answer, "answer": answer, "provider": provider, "model": model}


@app.get("/api/chat/test")
async def chat_test(provider: Optional[str] = None) -> Dict[str, Any]:
    del provider
    return await chat(ChatRequest(message="Hello"))


@app.post("/api/helper")
async def helper(payload: HelperRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    result = await chat(ChatRequest(message="\n".join(part for part in (payload.question, payload.dog_size, payload.coat_type) if part)), authorization=authorization)
    return {"answer": result["reply"], "reply": result["reply"], "source": result["provider"]}


@app.post("/api/bookings")
def submit_booking(payload: BookingRequest, request: Request, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user_email = request_email(authorization)
    owner = clean(payload.owner_name) or clean(f"{payload.first_name} {payload.last_name}") or "Customer"
    service = clean(payload.service_type) or clean(payload.service)
    dogs = payload.dogs or []
    if not dogs and payload.dog_name:
        dogs = [{"dog_name": payload.dog_name, "dog_size": payload.dog_size, "breed": payload.breed, "service": service}]
    dog_name = clean(payload.dog_name) or clean(str((dogs[0] if dogs else {}).get("dog_name", "")))
    service = service or clean(str((dogs[0] if dogs else {}).get("service", "")))
    if not dog_name or not service:
        raise HTTPException(status_code=422, detail="Dog name and service are required")
    booking = {"id": uuid.uuid4().hex, "user_email": user_email, "owner_name": owner, "phone": clean(payload.phone), "email": email_norm(payload.email or user_email), "dog_name": dog_name, "dogs": dogs, "dog_size": clean(payload.dog_size), "breed": clean(payload.breed), "service": service, "preferred_date": clean(payload.preferred_date), "preferred_time": clean(payload.preferred_time), "notes": clean(payload.notes), "status": "New", "staff_notes": "", "source_ip": request.client.host if request.client else "", "created_at": now_iso(), "updated_at": now_iso()}
    with db() as conn:
        conn.execute("INSERT INTO bookings(id,user_email,owner_name,phone,email,dog_name,dogs,dog_size,breed,service,preferred_date,preferred_time,notes,status,staff_notes,source_ip,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (booking["id"], booking["user_email"], booking["owner_name"], booking["phone"], booking["email"], booking["dog_name"], json.dumps(dogs), booking["dog_size"], booking["breed"], booking["service"], booking["preferred_date"], booking["preferred_time"], booking["notes"], booking["status"], booking["staff_notes"], booking["source_ip"], booking["created_at"], booking["updated_at"]))
    notify_admin("New Barking Mad Barbers booking", [f"Name: {owner}", f"Phone: {booking['phone']}", f"Email: {booking['email']}", f"Dog: {dog_name}", f"Service: {service}", f"Preferred: {booking['preferred_date']} {booking['preferred_time']}", f"Notes: {booking['notes']}"])
    booking.pop("source_ip", None)
    return {"message": "Booking request submitted! We'll confirm via text soon.", "id": booking["id"], "booking": booking}


@app.get("/api/bookings/mine")
def my_bookings(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    email = email_norm(str(bearer(authorization).get("email", "")))
    with db() as conn:
        data = rows(conn.execute("SELECT * FROM bookings WHERE user_email=? OR email=? ORDER BY created_at DESC", (email, email)).fetchall())
    return {"bookings": [{k: v for k, v in item.items() if k != "source_ip"} for item in data]}


@app.post("/api/contact")
def submit_contact(payload: ContactRequest, request: Request) -> Dict[str, Any]:
    item_id, now = uuid.uuid4().hex, now_iso()
    with db() as conn:
        conn.execute("INSERT INTO contacts(id,name,email,phone,message,source_ip,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", (item_id, clean(payload.name), email_norm(payload.email or ""), clean(payload.phone), clean(payload.message), request.client.host if request.client else "", now, now))
    notify_admin("New Barking Mad Barbers contact message", [f"Name: {payload.name}", f"Phone: {payload.phone or ''}", f"Email: {payload.email or ''}", "", clean(payload.message)])
    return {"ok": True, "id": item_id, "message": "Thanks, your message has been sent."}


@app.get("/api/gallery")
def public_gallery() -> Dict[str, Any]:
    with db() as conn:
        return {"photos": rows(conn.execute("SELECT * FROM gallery WHERE status='approved' ORDER BY created_at DESC").fetchall())}


@app.post("/api/gallery/submit")
def submit_gallery(payload: GallerySubmitRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user_email = request_email(authorization)
    item_id, now = uuid.uuid4().hex, now_iso()
    email = email_norm(payload.email or user_email)
    with db() as conn:
        conn.execute("INSERT INTO gallery(id,user_email,owner_name,email,dog_name,caption,image_url,image_data,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)", (item_id, user_email, clean(payload.owner_name), email, clean(payload.dog_name), clean(payload.caption), clean(payload.image_url), payload.image_data or "", "pending", now, now))
    notify_admin("New Barking Mad Barbers gallery submission", [f"Owner: {payload.owner_name}", f"Email: {email}", f"Dog: {payload.dog_name}", f"Caption: {payload.caption or ''}"])
    return {"ok": True, "id": item_id, "status": "pending"}


@app.get("/api/gallery/mine")
def my_gallery(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    email = email_norm(str(bearer(authorization).get("email", "")))
    with db() as conn:
        return {"photos": rows(conn.execute("SELECT * FROM gallery WHERE user_email=? OR email=? ORDER BY created_at DESC", (email, email)).fetchall())}


@app.post("/api/requests")
def submit_request(payload: FamilyRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user_email = request_email(authorization)
    item_id, now = uuid.uuid4().hex, now_iso()
    with db() as conn:
        conn.execute("INSERT INTO family_requests(id,user_email,name,email,phone,request_type,message,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)", (item_id, user_email, clean(payload.name), email_norm(payload.email or user_email), clean(payload.phone), clean(payload.request_type), clean(payload.message), "pending", now, now))
    notify_admin("New Barking Mad Barbers request", [f"Name: {payload.name}", f"Phone: {payload.phone or ''}", f"Email: {payload.email or user_email}", f"Type: {payload.request_type or ''}", "", clean(payload.message)])
    return {"ok": True, "id": item_id, "status": "pending"}


def update_status(table: str, item_id: str, status: str, id_name: str = "id") -> Dict[str, Any]:
    with db() as conn:
        conn.execute(f"UPDATE {table} SET status=?, updated_at=? WHERE {id_name}=?", (status, now_iso(), item_id))
        item = row_dict(conn.execute(f"SELECT * FROM {table} WHERE {id_name}=?", (item_id,)).fetchone())
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.get("/api/admin/bookings")
def admin_bookings(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        data = rows(conn.execute("SELECT * FROM bookings ORDER BY created_at DESC").fetchall())
    return {"bookings": [{k: v for k, v in item.items() if k != "source_ip"} for item in data]}


@app.patch("/api/admin/bookings/{booking_id}")
def admin_update_booking(booking_id: str, payload: BookingUpdate, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("UPDATE bookings SET status=COALESCE(?,status), staff_notes=COALESCE(?,staff_notes), updated_at=? WHERE id=?", (clean(payload.status) if payload.status is not None else None, clean(payload.staff_notes) if payload.staff_notes is not None else None, now_iso(), booking_id))
        item = row_dict(conn.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone())
    if not item:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"ok": True, "booking": item}


@app.put("/api/admin/bookings/{booking_id}/confirm")
def admin_confirm_booking(booking_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    return admin_update_booking(booking_id, BookingUpdate(status="Confirmed"), authorization)


@app.delete("/api/admin/bookings/{booking_id}")
def admin_delete_booking(booking_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("DELETE FROM bookings WHERE id=?", (booking_id,))
    return {"ok": True}


@app.get("/api/admin/gallery")
def admin_gallery(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        return {"photos": rows(conn.execute("SELECT * FROM gallery ORDER BY created_at DESC").fetchall())}


@app.put("/api/admin/gallery/{photo_id}/approve")
def approve_gallery(photo_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    return {"ok": True, "photo": update_status("gallery", photo_id, "approved")}


@app.put("/api/admin/gallery/{photo_id}/reject")
def reject_gallery(photo_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    return {"ok": True, "photo": update_status("gallery", photo_id, "rejected")}


@app.delete("/api/admin/gallery/{photo_id}")
def delete_gallery(photo_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("DELETE FROM gallery WHERE id=?", (photo_id,))
    return {"ok": True}


@app.get("/api/admin/contacts")
def admin_contacts(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        return {"contacts": rows(conn.execute("SELECT * FROM contacts ORDER BY created_at DESC").fetchall())}


@app.put("/api/admin/contacts/{contact_id}/read")
def read_contact(contact_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("UPDATE contacts SET is_read=1, updated_at=? WHERE id=?", (now_iso(), contact_id))
    return {"ok": True}


@app.delete("/api/admin/contacts/{contact_id}")
def delete_contact(contact_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("DELETE FROM contacts WHERE id=?", (contact_id,))
    return {"ok": True}


@app.get("/api/admin/requests")
def admin_requests(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        return {"requests": rows(conn.execute("SELECT * FROM family_requests ORDER BY created_at DESC").fetchall())}


@app.put("/api/admin/requests/{request_id}/approve")
def approve_request(request_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    return {"ok": True, "request": update_status("family_requests", request_id, "approved")}


@app.put("/api/admin/requests/{request_id}/reject")
def reject_request(request_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    return {"ok": True, "request": update_status("family_requests", request_id, "rejected")}


@app.delete("/api/admin/requests/{request_id}")
def delete_request(request_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        conn.execute("DELETE FROM family_requests WHERE id=?", (request_id,))
    return {"ok": True}


@app.get("/api/admin/chat-stats")
def chat_stats(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        total = conn.execute("SELECT COUNT(*) AS count FROM chat_logs").fetchone()["count"]
        recent = rows(conn.execute("SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 50").fetchall())
    return {"total_chats": total, "recent": recent, "logs": recent}


@app.get("/api/admin/users")
def admin_users(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    bearer(authorization, True)
    with db() as conn:
        data = rows(conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall())
    return {"users": [{"id": u.get("id"), "name": u.get("name", ""), "email": u.get("email", ""), "created_at": u.get("created_at"), "updated_at": u.get("updated_at"), "is_admin": bool(u.get("is_admin")), "role": "admin" if u.get("is_admin") else "user"} for u in data]}


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
        inside = requested.is_relative_to(STATIC_DIR.resolve())
    except AttributeError:
        inside = str(requested).startswith(str(STATIC_DIR.resolve()))
    if inside and requested.is_file():
        return FileResponse(requested)
    if SERVE_FRONTEND and (STATIC_DIR / "index.html").exists():
        return FileResponse(STATIC_DIR / "index.html")
    raise HTTPException(status_code=404, detail="Not Found")
