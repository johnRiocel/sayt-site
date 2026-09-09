# Sayt — website

Static marketing and App Store compliance site for the Sayt iPhone app.
Served by GitHub Pages from the `main` branch of `johnRiocel/sayt-site`.

This repository is public so that GitHub Pages can publish it. The app source
lives in a separate private repository and is not published here.

| Page | Purpose |
|---|---|
| `index.html` | Landing page |
| `docs.html` | Whitepaper-style documentation of what the app records and produces |
| `support.html` | Support URL required by App Store Connect |
| `privacy.html` | Privacy Policy URL required by App Store Connect |
| `terms.html` | Terms of Use / EULA for the Sayt Pro purchase |
| `404.html` | Not-found page |

No JavaScript, no external requests, no trackers. Every page sets a strict
`Content-Security-Policy` that permits only same-origin styles, images and
media, so there is nothing for a third party to inject or observe.

Because that policy sets `style-src 'self'`, inline `style` attributes are
blocked. Spacing has to come from classes in `assets/style.css` — the `.mt-s`,
`.mt-m` and `.mt-l` utilities exist for that reason.

`.nojekyll` stops GitHub Pages running the files through Jekyll.

## Preview locally

    python3 -m http.server 8000 --bind 127.0.0.1

## Publishing

Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder
`/ (root)`. Then set the custom domain to `sayt-app.store` and tick
**Enforce HTTPS** once the certificate has been issued.

The `CNAME` file must stay in the branch. If a push removes it, GitHub drops
the custom domain.

DNS lives at Cloudflare and must be **DNS only** (grey cloud) — proxying breaks
GitHub's certificate issuance:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `johnriocel.github.io` |

Live at https://sayt-app.store/
