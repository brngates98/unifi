#!/usr/bin/env node
/**
 * Headless endpoint discovery: navigate the UniFi controller UI and capture
 * all XHR/fetch requests (method, URL, optional headers), similar to manually
 * clicking around in Chrome and logging network traffic.
 *
 * Usage:
 *   UNIFI_URL=https://192.168.1.1 UNIFI_USER=admin UNIFI_PASS=... node discover.js
 *   Or copy .env.example to .env and run: npm run discover
 *
 * Output: endpoints_data/API_ENDPOINTS_HEADLESS_<date>.md
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

// Load .env if present (optional)
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: join(__dirname, ".env") });
} catch {
  // no dotenv
}

const UNIFI_URL = process.env.UNIFI_URL || "";
const UNIFI_USER = process.env.UNIFI_USER || "";
const UNIFI_PASS = process.env.UNIFI_PASS || "";
const HEADLESS = process.env.HEADLESS !== "false";
const OUTPUT_DIR = process.env.OUTPUT_DIR || join(repoRoot, "endpoints_data");

if (!UNIFI_URL || !UNIFI_USER || !UNIFI_PASS) {
  console.error("Set UNIFI_URL, UNIFI_USER, and UNIFI_PASS (env or .env).");
  process.exit(1);
}

const baseUrl = UNIFI_URL.replace(/\/$/, "");
const captured = new Map(); // key = "METHOD URL" (path only, same-origin), value = { method, url, requestHeaders }

function isApiLike(url) {
  const path = new URL(url).pathname;
  return path.includes("/api") || path.includes("/proxy/");
}

function normalizeUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.origin + u.pathname + (u.search || "");
  } catch {
    return urlStr;
  }
}

function runGroup(pathname) {
  if (pathname.startsWith("/api/")) return "api";
  if (pathname.startsWith("/proxy/network/api/")) return "proxy-network-api";
  if (pathname.startsWith("/proxy/network/v2/")) return "proxy-network-v2";
  if (pathname.startsWith("/proxy/users/")) return "proxy-users";
  if (pathname.startsWith("/proxy/")) return "proxy-other";
  return "other";
}

async function main() {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--ignore-certificate-errors"],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Capture XHR and fetch requests to same origin (or any URL if we're on a proxy)
  await page.route("**/*", (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (request.resourceType() !== "xhr" && request.resourceType() !== "fetch") {
      return route.continue();
    }

    try {
      const u = new URL(url);
      const ourOrigin = new URL(baseUrl).origin;
      const sameOrigin = u.origin === ourOrigin;
      const isApi = isApiLike(url);
      if (sameOrigin && isApi) {
        const key = `${method} ${normalizeUrl(url)}`;
        if (!captured.has(key)) {
          captured.set(key, {
            method,
            url: normalizeUrl(url),
            pathname: u.pathname,
            requestHeaders: request.headers(),
          });
        }
      }
    } catch (_) {
      // ignore
    }
    return route.continue();
  });

  console.log("Navigating to", baseUrl);
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});

  // Login: look for password field and submit
  const passwordSel = 'input[type="password"]';
  const usernameSel = 'input[name="username"], input[name="email"], input[type="text"]:not([type="search"])';
  const submitSel = 'button[type="submit"], input[type="submit"], [type="submit"], button:has-text("Login"), button:has-text("Sign in"), a:has-text("Login")';

  const hasPassword = await page.locator(passwordSel).count() > 0;
  if (hasPassword) {
    console.log("Login form detected, submitting credentials...");
    await page.locator(usernameSel).first().fill(UNIFI_USER);
    await page.locator(passwordSel).fill(UNIFI_PASS);
    await page.locator(submitSel).first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Optional: visit common UI paths to trigger more API calls (SPA may use same base URL)
  const pathsToTry = ["/", "/devices", "/clients", "/settings", "/insights", "/topology", "/dashboard"];
  for (const p of pathsToTry) {
    const url = baseUrl + p;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(2000);
    } catch (_) {
      // ignore timeouts
    }
  }

  await browser.close();

  // Build markdown
  const date = new Date().toISOString().slice(0, 10);
  const entries = [...captured.values()].sort((a, b) => a.url.localeCompare(b.url));
  const byGroup = new Map();
  for (const e of entries) {
    const g = runGroup(e.pathname);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(e);
  }

  const groupOrder = ["api", "proxy-network-api", "proxy-network-v2", "proxy-users", "proxy-other", "other"];
  const groupTitles = {
    api: "API (legacy)",
    "proxy-network-api": "Proxy /network API (v1)",
    "proxy-network-v2": "Proxy /network v2 API",
    "proxy-users": "Proxy /users API",
    "proxy-other": "Proxy (other)",
    other: "Other",
  };

  let md = `# API Endpoints (headless discovery)\n\n`;
  md += `- **Date**: ${date}\n`;
  md += `- **Controller**: ${baseUrl}\n`;
  md += `- **Total unique requests**: ${entries.length}\n\n`;
  md += `---\n\n`;

  for (const g of groupOrder) {
    const list = byGroup.get(g);
    if (!list || list.length === 0) continue;
    md += `## ${groupTitles[g] || g}\n\n`;
    for (const e of list) {
      const pathOnly = new URL(e.url).pathname + (new URL(e.url).search || "");
      md += `- \`${e.method} ${pathOnly}\`\n`;
    }
    md += `\n`;
  }

  md += `---\n\n## Sample request headers (first request)\n\n`;
  const first = entries[0];
  if (first && first.requestHeaders) {
    md += "```\n";
    for (const [k, v] of Object.entries(first.requestHeaders)) {
      if (k.toLowerCase().startsWith("x-") || k.toLowerCase() === "accept" || k.toLowerCase() === "authorization") {
        md += `${k}: ${v}\n`;
      }
    }
    md += "```\n";
  }

  const outPath = join(OUTPUT_DIR, `API_ENDPOINTS_HEADLESS_${date}.md`);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(outPath, md, "utf8");
  console.log("Wrote", outPath, "(" + entries.length, "unique endpoints)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
