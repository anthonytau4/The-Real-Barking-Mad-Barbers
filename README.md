# Barking Mad Barbers — Complete Python Render build

This is the compact GitHub-ready version for the current Render Python 3 setup.

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
OPENAI_API_KEY
REACT_APP_BACKEND_URL
SERVE_FRONTEND
```

`GEMINI_API_KEY` and `GEMINI_MODEL` power the Helper page. `OPENAI_API_KEY` is kept only as a fallback because it was in the Render variable list.

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
  .env.example
  static/
    index.html
    assets/
      logo.png
      favicon.png
      price-guide.webp
      team-beach.webp
      team-dog.webp
render.yaml
README.md
```

Only the provided Barking Mad Barbers images are included. The uploaded reference zip was used only for structure and business details, not copied as the project.
