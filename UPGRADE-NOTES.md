# Orbit Arcade v3 upgrade notes

If you were using the previous `orbit-arcade-upgraded.zip` version, copy these three source files to your existing site:

- `index.html`
- `style.css`
- `script.js`

Do not rename the files. The website stores the browser's existing demo credits under the same localStorage keys (`orbit-arcade-demo-v2` and `orbit-arcade-unfinished-rounds-v2`). You do not need to reset your browser to get the games.

**Changes:** 7 new games; Sky Rush interactive crash flight; sticky header; no preset 250 CR stake limit; MAX stake button; custom virtual-credit top-ups; optional personal stake limit instead of mandatory 250 CR.

For existing players with exactly the old 250-credit default limit, this release resets the limit to uncapped. If you intentionally need a personal limit, open **Play limits** and set one again.
