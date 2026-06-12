# Barking Mad Barbers - Python Render build

This is the GitHub-ready version for the current Render Python setup.

## Render settings

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Runtime: Python 3

## Env variables to add in Render

```text
ADMIN_EMAILS
ADMIN_PASSWORD
ALLOWED_ORIGIN
APP_URL
CORS_ORIGINS
GEMINI_API_KEY
GEMINI_MODEL
GOOGLE_CLIENT_ID
JWT-SECRET
JWT_SECRET
OPENAI_API_KEY
REACT_APP_BACKEND_URL
SERVE_FRONTEND
DATA_DIR
```

`JWT_SECRET` should be set even if `JWT-SECRET` already exists. The backend accepts both names, but `JWT_SECRET` is the safest Render env name.

Admin/customer records are stored in SQLite at `DATA_DIR/barking_mad.sqlite3`. On Render, add a persistent disk and set `DATA_DIR` to the mounted path, for example `/var/data`. Without a persistent disk, Render can still clear local files during rebuilds.

Optional email notifications for bookings, contact messages, gallery submissions, and requests use these env vars when configured:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SMTP_TLS
ADMIN_NOTIFICATION_EMAILS
```

## Admin security

- Public registration is blocked for emails listed in `ADMIN_EMAILS`.
- Admin routes require a JWT with `is_admin: true`.
- Admin tokens are only issued when the email is in `ADMIN_EMAILS` and the admin password is correct, or when Google returns a verified email that is in `ADMIN_EMAILS`.
- Google sign-in must use the same `GOOGLE_CLIENT_ID` configured in Render and Google Cloud.

## Site paths

```text
/
/services
/Sanctuary
/sanctuary
/our-family
/team
/book
/helper
/contact
/sign-in
/admin
```

## File structure

```text
backend/
  server.py
  requirements.txt
  static/
    index.html
    assets/
      brand-logo.png
      favicon.png
      hero-advert.png
      team-beach.webp
      team-dog.webp
README.md
```
