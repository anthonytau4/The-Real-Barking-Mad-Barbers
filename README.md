# Barking Mad Barbers Static Website

This version is fully static. It does not need Python, FastAPI, env vars, API keys, JWTs, Google auth, Gemini, OpenAI, a database, or any backend service.

## How enquiries work

- Booking requests open a ready-made SMS to `027 247 2493`.
- Contact messages open a ready-made SMS to `027 247 2493`.
- Family/gallery photo submissions open an email to `barkingmadbarbers@gmail.com`.
- The helper page is a local FAQ-style helper, not AI.
- Saved customer details are stored only in the visitor's browser.
- The admin page is only a local browser inbox for testing messages created on that same device.

Because there is no backend, there is no shared admin database, login system, Google sign-in verification, AI chat logging, user blocking, persistent upload storage, or server-side email notifications. Real customer enquiries arrive by text or email.

## Hosting

Any static host can serve this site:

- GitHub Pages
- Netlify
- Vercel static hosting
- Cloudflare Pages
- A normal static web server

The root files are:

```text
index.html
static-site.js
CNAME
assets/
```

For path routes like `/book`, `/services`, `/helper`, and `/admin`, configure your static host to fall back to `index.html`.

## Local preview

Open `index.html` in a browser, or serve the folder with any static server.

No build command is required.
No start command is required.
No environment variables are required.
