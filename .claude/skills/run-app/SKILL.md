---
name: run-app
description: Launch the Vite dev server and drive the app in a real browser — render pages, read rendered text, exercise filters via URL params, and check responsive layout at a true viewport width. Use when asked to run the app, screenshot it, or confirm a change works in the real UI.
---

# Running this app

React SPA on Vite. `curl` returns only the empty shell — every content check
needs a real browser that runs JS.

## 1. The backend must already be up

The frontend reads `VITE_API_BASE_URL` from `.env` (`http://localhost:8080`).
It is a separate Spring Boot project the human starts; this skill never starts
it. Check before doing anything else:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 4 \
  "http://localhost:8080/api/listings?page=0&size=1"
```

`200` means go. Anything else — say so and stop, or deliberately exercise the
error state (see §5). Do not edit `.env` to point somewhere else.

## 2. Start the dev server

```bash
npm run dev > "$CLAUDE_JOB_DIR/tmp/vite.log" 2>&1 &
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:5173/
```

Kill it when done (§6). Use a scratch dir, never bare `/tmp` — parallel jobs
share it.

## 3. Read rendered content

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=6000 \
  --dump-dom "http://localhost:5173/?cardName=Charizard" > out.html
grep -o 'Showing page[^<]*' out.html
```

`--virtual-time-budget` waits for React to render and the fetch to land. Below
~5000 you capture the loading state.

## 4. Responsive layout — read this before trusting any screenshot

**`--window-size=375 --screenshot` does NOT set the layout viewport.** Chrome
lays out wider and crops the PNG. Narrow screenshots look clipped — inputs run
off the edge, right-hand header content vanishes — and it is an artifact of the
capture, not the page.

This is a trap that manufactures phantom responsive bugs, and it is stable
across `--headless` and `--headless=new`, so re-rendering "to confirm" agrees
with itself and reads as corroboration. Comparing two commits does not help
either: both render the same wrong way and match.

For anything width-sensitive, measure the DOM inside a **real** viewport by
loading the app in a sized iframe. Same-origin, so the parent can measure it.
`public/` is served by Vite at the web root; this file is scratch — delete it
in §6.

```bash
mkdir -p public
cat > public/probe.html <<'HTML'
<!doctype html><meta charset=utf-8><title>probe</title>
<body style="margin:0"><pre id=out>measuring…</pre>
<iframe id=f src="/" style="width:375px;height:1400px;border:0"></iframe>
<script>
document.getElementById('f').onload = () => {
  const f = document.getElementById('f'), d = f.contentDocument, w = f.contentWindow;
  const lines = ['viewport=' + w.innerWidth + ' scrollWidth=' + d.documentElement.scrollWidth];
  let over = 0, worst = null;
  d.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > w.innerWidth + 0.5) {
      over++;
      if (!worst || r.right > worst.right) {
        worst = { tag: el.tagName, cls: (el.className || '').toString().slice(0, 50),
                  right: Math.round(r.right), width: Math.round(r.width) };
      }
    }
  });
  lines.push('past viewport: ' + over + (worst ? '  worst=' + worst.tag + ' w=' + worst.width + ' :: ' + worst.cls : ''));
  document.getElementById('out').textContent = lines.join('\n');
};
</script>
HTML
```

Change the iframe `width` for other breakpoints. Then:

```bash
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=9000 \
  --dump-dom "http://localhost:5173/probe.html" > probe.html
python3 -c "
import re,html
d=open('probe.html',encoding='utf-8',errors='replace').read()
m=re.search(r'<pre id=\"out\">(.*?)</pre>', d, re.S)
print(html.unescape(m.group(1)) if m else 'no match')
"
```

`scrollWidth == viewport` and `past viewport: 0` means no overflow. To *look*
at a narrow layout, screenshot `probe.html` in a window wider than the iframe —
the iframe region is a truthful render at its own width.

Screenshots at 640px and above are fine directly, since the crop only bites
when the requested width is below Chrome's minimum layout width.

## 5. What to exercise

Everything is URL-driven, so most states need no clicking:

| URL | Expect |
|---|---|
| `/` | "Showing page 1 of N · M listings" |
| `?cardName=Charizard` | filtered count, summary names the filter |
| `?cardName=X&condition=NM&printing=HOLOFOIL&minPrice=10&maxPrice=50` | all five in the summary |
| `?minPrice=50&maxPrice=10` | "Min price is higher than max price" + bar hint |
| `?cardName=zzzznotathing` | "No listings match …" + Clear all filters |
| `?page=5` | "Nothing on this page" + Back to first page |
| `?page=-3&sort=bogus` | clamps to page 1 / Newest first, address bar untouched |
| `?setName=x&cardName=y` | only `cardName` applies; stray param ignored, not scrubbed |

**Error state:** stop the backend, or start Vite with a bad base URL on another
port. Never edit `.env`.

**Focus and clicking** need CDP — `--dump-dom` cannot click. Only reach for it
when verifying focus handoff (Clear all → card-name input; Try again and Back
to first page → the `<h1>`).

**Empty catalogue** cannot be reached without deleting real data. Don't. Reason
from `emptyStateCopy` instead.

## 6. Clean up, every time

```bash
rm -f public/probe.html && rmdir public 2>/dev/null
pkill -f vite
```

Confirm with `git status --short` — it must be clean. `public/probe.html` is
untracked but the repo is checked for cleanliness constantly; leaving it behind
shows up as a phantom change in the next review.

## Gotchas

- **Do not run `git show <sha>:<path> | wc -l` in a shell loop here** — it
  returns corrupted counts (halved, or `0` for files that plainly exist).
  Single invocations are correct; redirect to a file and measure that.
- `CLAUDE.md` and `BACKEND.md` are gitignored, so edits to them never show in
  `git status` and cannot be committed.
- Chrome is at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
  There is no `chromium-cli` and no Playwright browser cache on this machine.
- Never add a browser driver to `package.json` — CLAUDE.md forbids new
  dependencies. `npx` for a one-off is fine; it does not touch the manifest.
