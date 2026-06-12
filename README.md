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

If `barkingmadbarbers.com` is served by a static host instead of this Render web service, set `REACT_APP_BACKEND_URL` to the public Render backend URL and add this before the app script in the served HTML:

```html
<script>window.BMB_API_BASE_URL = "https://YOUR-RENDER-SERVICE.onrender.com";</script>
```

When the custom domain is attached directly to the Render backend, leave `window.BMB_API_BASE_URL` unset and the site will use same-origin `/api/...` routes.

For GitHub Pages hosting, each app route is also emitted as a static folder with its own `index.html`, so direct links like `/helper` and `/sign-in` load cleanly.

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
