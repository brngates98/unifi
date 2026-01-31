# UniFi endpoint discovery (headless)

Same idea as manually clicking around in Chrome and logging XHR/fetch requests from the Network tab, but automated with a headless browser.

## What it does

1. Launches Chromium (headless by default).
2. Navigates to your UniFi controller URL.
3. If it sees a login form, fills username/password and submits.
4. Optionally visits common UI paths (`/`, `/devices`, `/clients`, `/settings`, etc.) to trigger more API calls.
5. Captures every **XHR** and **fetch** request whose URL contains `/api` or `/proxy/` (same origin only).
6. Writes a markdown file under `endpoints_data/` with:
   - `METHOD /path` for each unique request
   - Grouped by path prefix (legacy API, proxy/network v1, proxy/network v2, etc.)
   - Sample request headers (X-*, Accept, etc.) from the first request.

Output file: `endpoints_data/API_ENDPOINTS_HEADLESS_YYYY-MM-DD.md`.

## Setup

```bash
cd tools/endpoint-discovery
npm install
```

## Usage

**Option A – environment variables**

```bash
UNIFI_URL=https://192.168.1.1 UNIFI_USER=admin UNIFI_PASS=yourpassword npm run discover
```

**Option B – `.env` (do not commit)**

```bash
cp .env.example .env
# Edit .env with your controller URL and credentials
npm run discover
```

**Headed (see the browser):**

```bash
HEADLESS=false npm run discover
```

## Requirements

- **Direct controller access** works best (e.g. `https://192.168.1.1`). The script only records same-origin requests; with direct access, `/api/` and `/proxy/network/` are same-origin.
- **Cloud UI** (e.g. `https://yourname.ui.com`) may proxy API calls via WebSockets or other hosts; you might see fewer endpoints. Use direct URL when possible.
- Node 18+ (for ES modules and Playwright).

## Notes

- Login flow is detected by the presence of an `input[type="password"]` and a submit button. If your controller uses SSO or a different layout, you may need to log in manually in headed mode or extend the script.
- Paths like `/devices`, `/clients` are best-effort; if your controller uses hash routing or different paths, add them or run with `HEADLESS=false` and watch what the UI loads.
