# Barking Mad Barbers

A static, responsive website for dog grooming and boarding in Tawa, Wellington.

## Preview and edit

Serve the repository root over HTTP (ES modules do not run reliably from `file://`):

```sh
npm run preview
```

Open `http://localhost:4173`. The site has no runtime dependencies or backend.

- `site-core.js`: business details, published prices, estimates and enquiry formatting.
- `site-views.js`: shared layouts and page content.
- `site.css`: responsive design.
- `static-site.js`: booking, price selector, navigation and forms.
- `scripts/build.mjs`: generates complete HTML pages and search metadata.

After changing shared content or business details, run:

```sh
npm test
npm run build
```

Commit the generated HTML along with the source. Node 22 or later is sufficient; no dependency installation is needed. Pull requests check pricing rules and generated-page consistency.

## Enquiries

The booking flow prepares an SMS to **027 247 2493**. Customers review the exact message and send it from their own messaging app. An enquiry does not reserve an appointment; the team confirms availability and price by reply. Desktop visitors can copy the message or open a messaging app. Contact enquiries work the same way. Photo submissions open an email to **barkingmadbarbers@gmail.com**; photos can be attached in the visitor’s email app.

Prices remain the published Tiny, Small, Medium, Large and Extra Large rates. The estimate prevents double charging for both grooming packages and includes the appropriate nail, face and gland services at no additional charge. Boarding prices remain by arrangement. Boarding date checks use Pacific/Auckland and require pick-up after drop-off.

Saved contact details are opt-in and stored only on the visitor’s device. Existing saved profiles are supported. `/admin/` shows only enquiry drafts prepared in that browser; it is not a shared inbox and does not verify delivery. Storage failures do not block an enquiry. There is no authentication, database, analytics or automated message sending.

## Hosting

The existing GitHub Pages deployment and `CNAME` are retained. Every page has its own generated `index.html`, including `/boarding/`, so direct links and refreshes work on static hosting without a single-page-app fallback. `/Sanctuary/` is retained as a legacy alias. Unknown pages show a proper `404.html`.

The main content, contact links and FAQ remain readable without JavaScript. Forms and the live price selector require JavaScript; a direct text/email fallback is shown when scripting is disabled.

The original grooming advert and white-and-gold background are used throughout the remaster. Original brand and family photographs are preserved; see `assets/ASSETS.md`.
