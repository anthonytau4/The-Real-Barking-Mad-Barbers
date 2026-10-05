import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BUSINESS as B, ROUTES, esc } from '../site-core.js';
import { header, footer, renderPage } from '../site-views.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const version = '20261005-remaster';
function page(route) {
  const [title, description] = ROUTES[route], privatePage = ['/admin/', '/sign-in/', '/404/'].includes(route);
  const structuredData = {
    '@context':'https://schema.org', '@type':'LocalBusiness', name:B.name, url:B.url, telephone:B.sms,
    email:B.email, image:`${B.url}/assets/groomed-dog.webp`,
    address:{'@type':'PostalAddress',streetAddress:'5A Tawa Street',addressLocality:'Tawa, Wellington',addressCountry:'NZ'},
    openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],opens:'08:30',closes:'15:00'}
  };
  return `<!doctype html>
<html lang="en-NZ">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} | Barking Mad Barbers</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#282c27">
  ${privatePage ? '<meta name="robots" content="noindex,follow">' : `<link rel="canonical" href="${B.url}${route}">`}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_NZ">
  <meta property="og:site_name" content="${B.name}">
  <meta property="og:title" content="${esc(title)} | ${B.name}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${B.url}${route}">
  <meta property="og:image" content="${B.url}/assets/groomed-dog.webp">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link rel="stylesheet" href="/site.css?v=${version}">
  ${route === '/' ? '<link rel="preload" as="image" href="/assets/groomed-dog.webp" imagesrcset="/assets/groomed-dog-small.webp 560w, /assets/groomed-dog.webp 1120w" imagesizes="(max-width: 760px) 92vw, 46vw">' : ''}
  ${privatePage ? '' : `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`}
</head>
<body id="top" data-route="${route}">
  ${header(route)}
  <noscript><div class="noscript-notice">To enquire, text <a href="sms:${B.sms}">${B.phone}</a> or email <a href="mailto:${B.email}">${B.email}</a>. Interactive forms need JavaScript.</div></noscript>
  <main id="main" tabindex="-1">${renderPage(route)}</main>
  ${footer()}
  <script type="module" src="/static-site.js?v=${version}"></script>
</body>
</html>
`.replace(/[\t ]+$/gm, '');
}
for (const route of Object.keys(ROUTES)) {
  if (route === '/404/') continue;
  const dir = `${root}${route.slice(1)}`;
  await mkdir(dir, {recursive:true});
  await writeFile(`${dir}index.html`, page(route));
}
// The original capitalised link retains the lowercase canonical URL.
await mkdir(`${root}Sanctuary`, {recursive:true});
await writeFile(`${root}Sanctuary/index.html`, page('/sanctuary/'));
await writeFile(`${root}404.html`, page('/404/'));
await writeFile(`${root}sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(ROUTES).filter(route => !['/admin/','/sign-in/','/404/'].includes(route)).map(route => `<url><loc>${B.url}${route}</loc></url>`).join('')}</urlset>\n`);
await writeFile(`${root}robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${B.url}/sitemap.xml\n`);
console.log('Built all public pages, legacy routes, 404, sitemap and robots.txt.');
