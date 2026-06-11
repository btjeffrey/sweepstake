# Family World Cup 2026 — Sweepstake Tracker

A self-updating scoreboard for your family World Cup sweepstake. Live league
table, the steal ledger, the 8×8 rivalry grid, every player's squad, and all
fixtures billed as family head-to-heads. Results pull automatically from
football-data.org and refresh every 15 minutes.

The scoring is your agreed system: group wins 3 / draws 1, +2 per team
reaching the Round of 32, knockout wins worth 4 / 5 / 7 / 9, third-place
play-off 3, the Final 12, penalty wins count in full, and the upset steal
transfers the tier gap from loser to winner.

---

## Deploy in 4 steps (~15 minutes, one-time)

### 1. Get a free API key
1. Go to **football-data.org** → Get your free API token (the free tier
   includes the FIFA World Cup).
2. Sign up, confirm your email, copy the token from your account page.

### 2. Put this folder on GitHub (recommended)
Why GitHub rather than drag-and-drop: every time you edit `config.js`
(fixing a team spelling, adding a result override), Netlify redeploys
automatically in ~30 seconds.

```bash
cd wc-sweepstake
git init && git add -A && git commit -m "Family World Cup tracker"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOURNAME/wc-sweepstake.git
git push -u origin main
```

*(Alternative: install the Netlify CLI — `npm i -g netlify-cli` — and run
`netlify deploy --prod` from this folder. Works fine, you just redeploy
manually after config edits.)*

### 3. Connect to Netlify
1. **app.netlify.com** → Add new site → Import an existing project → pick
   your repo. No build command needed; publish directory is `.` (already
   set in `netlify.toml`). Deploy.
2. **Site configuration → Environment variables → Add variable:**
   - Key: `FOOTBALL_DATA_API_KEY`
   - Value: your token from step 1
3. **Deploys → Trigger deploy** (so the function picks up the key).
4. Optional but worth it: Site configuration → Change site name →
   something like `smithfamilycup` → your link becomes
   `smithfamilycup.netlify.app`.

### 4. Set up the family in `config.js`
Open `config.js` — it's the only file you ever edit:

1. Replace `Player 1`–`Player 8` with real names.
2. Fill in each person's six teams against their tiers.
3. **Team names must match the API's spelling exactly** (it's
   "Korea Republic", not "South Korea"). Don't guess: deploy first, open
   the site, and the yellow **Setup check** banner lists every team name
   the live feed uses — copy-paste from there. The banner disappears once
   all 48 names match.
4. Commit and push; Netlify redeploys itself.

Until the config is filled in, the site runs in **demo mode** with
fictional results — handy for showing the family what's coming.

---

## Send it to the family

Text them the link with these instructions:

> Open the link in Safari → tap the Share button → **Add to Home Screen**.
> It'll sit on your phone like an app. Check the Steals tab before you
> talk to Dad.

No accounts, no installs, nothing to update. It refreshes itself whenever
they open it.

---

## If a result ever comes through wrong

Tap the match in the Matches tab to reveal its match id, then add an
override in `config.js` and push:

```js
resultOverrides: [
  { matchId: 12345, winner: "AWAY_TEAM", score: { home: 1, away: 2 } },
],
```

## How the auto-update works
- A tiny serverless function (`netlify/functions/results.mjs`) fetches all
  World Cup matches from football-data.org. Your API key lives only in
  Netlify's environment — never in anyone's browser.
- Responses are cached on Netlify's CDN for 15 minutes, so eight people
  refreshing obsessively costs ~4 API calls an hour (your free limit is
  10 per *minute*).
- The app also quietly refetches whenever someone reopens it.

## Files
| File | What it is |
|---|---|
| `config.js` | **Yours to edit** — names, teams, overrides, points |
| `engine.js` | The scoring rules (tested) |
| `app.js`, `styles.css`, `index.html` | The app itself |
| `sample-data.js` | Demo tournament shown before setup |
| `netlify/functions/results.mjs` | The results fetcher |
| `netlify.toml`, `manifest.webmanifest`, icons | Plumbing |
