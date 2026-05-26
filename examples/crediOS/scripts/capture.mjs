#!/usr/bin/env node
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { chromium } from "playwright"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const FIXTURES_DIR = resolve(ROOT, "fixtures")
const CACHE_DIR = resolve(ROOT, "cache")
const SHOTS_FULL = resolve(CACHE_DIR, "shots", "full")
const SHOTS_THUMB = resolve(CACHE_DIR, "shots", "thumbs")

const CREDIOS_REPO = "/Users/zhuaijun/Work-space/CrediOS"
const BASE_URL = "http://localhost:3000"
const LOGIN_EMAIL = "flowshot@webnak.com"
const VIEWPORT = { width: 1280, height: 800 }
const UI_FLOW_VERSION = "v0.1.0"

const NODES = [
  { id: "W1", title: "Data Entry Workbench", lane: "shared", x: 0, y: 200, stage: "WORKBENCH",
    desc: "Sales officer landing — view drafts, start new application, jump to inquiry.",
    route: "/sales-workspace", fixture: null },
  { id: "W2", title: "Application Inquiry", lane: "shared", x: 0, y: 400, stage: "INQUIRY",
    desc: "Search submitted/rejected applications by reference or identity.",
    route: "/sales-workspace?app=search", fixture: null },
  { id: "A1", title: "Identity Scope", lane: "shared", x: 300, y: 300, stage: "IDENTITY_SCOPE",
    desc: "Capture applicant identity, run identify, decide NTC vs ETC + apply-for scope.",
    route: "/sales-workspace/applications/flow-a1-identity", fixture: "a1.json" },
  { id: "N1", title: "NTC DE1 Entry", lane: "ntc", x: 600, y: 100, stage: "NTC_DE1_ENTRY",
    desc: "NTC first-pass data entry — applicant, employment, card application.",
    route: "/sales-workspace/applications/flow-n1-ntc-de1", fixture: "n1.json" },
  { id: "N2", title: "NTC DE1 Dual Entry", lane: "ntc", x: 900, y: 100, stage: "NTC_DE1_DUAL_ENTRY",
    desc: "NTC dual-entry data quality check — re-key locked fields to confirm.",
    route: "/sales-workspace/applications/flow-n2-ntc-de1-dual", fixture: "n2.json" },
  { id: "N3", title: "NTC AIP Pending", lane: "ntc", x: 1200, y: 100, stage: "NTC_AIP_PENDING_REVIEW",
    desc: "Waiting for AIP (approval-in-principle) decision after DE1 submission.",
    route: "/sales-workspace/applications/flow-n3-aip-pending", fixture: "n3.json" },
  { id: "N4", title: "NTC AIP Rejected", lane: "ntc", x: 1500, y: 0, stage: "NTC_AIP_REJECTED_FINAL",
    desc: "Terminal — AIP rejected, application closed with rejection reason.",
    route: "/sales-workspace/applications/flow-n4-aip-rejected", fixture: "n4.json" },
  { id: "N5", title: "NTC DE2 Entry", lane: "ntc", x: 1500, y: 200, stage: "NTC_DE2_ENTRY",
    desc: "Post-AIP second-pass entry — supplementary cardholders + remaining details.",
    route: "/sales-workspace/applications/flow-n5-ntc-de2", fixture: "n5.json",
    unlockKey: "ntc-de2-entry:flow-n5-ntc-de2" },
  { id: "N6", title: "NTC DE2 Dual Entry", lane: "ntc", x: 1800, y: 200, stage: "NTC_DE2_DUAL_ENTRY",
    desc: "Tab-based dual-entry on supplementary + card application data.",
    route: "/sales-workspace/applications/flow-n6-ntc-de2-dual", fixture: "n6.json" },
  { id: "E1", title: "ETC DE1 Entry", lane: "etc", x: 600, y: 500, stage: "ETC_DE1_ENTRY",
    desc: "ETC single-pass data entry — leverages existing CIF data.",
    route: "/sales-workspace/applications/flow-e1-etc-de1", fixture: "e1.json" },
  { id: "E2", title: "ETC DE1 Dual Entry", lane: "etc", x: 900, y: 500, stage: "ETC_DE1_DUAL_ENTRY",
    desc: "ETC dual-entry data quality check before final submission.",
    route: "/sales-workspace/applications/flow-e2-etc-de1-dual", fixture: "e2.json" },
  { id: "A8", title: "Final Submitted", lane: "shared", x: 2100, y: 350, stage: "FINAL_SUBMITTED",
    desc: "Terminal — application submitted, read-only summary view.",
    route: "/sales-workspace/applications/flow-a8-final", fixture: "a8.json" },
  { id: "A9", title: "Review (Read-only)", lane: "shared", x: 300, y: 600, stage: "REVIEW",
    desc: "Read-only review of a finished/submitted draft.",
    route: "/sales-workspace/applications/flow-a9-review/review", fixture: "a9.json" },
  { id: "A10", title: "Edit Draft", lane: "shared", x: 600, y: 600, stage: "EDIT",
    desc: "Resume editing an in-progress draft from the workbench.",
    route: "/sales-workspace/applications/flow-a10-edit/edit", fixture: "a10.json" },
]

const EDGES = [
  { from: "W1", to: "A1", label: "New Application" },
  { from: "A1", to: "N1", label: "NTC" },
  { from: "A1", to: "E1", label: "ETC" },
  { from: "N1", to: "N2", label: "Submit" },
  { from: "N2", to: "N3", label: "Submit" },
  { from: "N3", to: "N4", label: "Rejected" },
  { from: "N3", to: "N5", label: "Approved" },
  { from: "N5", to: "N6", label: "Submit" },
  { from: "N6", to: "A8", label: "Submit" },
  { from: "E1", to: "E2", label: "Submit" },
  { from: "E2", to: "A8", label: "Submit" },
  { from: "W1", to: "A9", label: "View Reviewed" },
  { from: "W1", to: "A10", label: "Edit Draft" },
]

const DRAFT_KEY_PREFIX = "application_draft:"
const INDEX_KEY = "application_drafts_index"

function ensureDirs() {
  for (const d of [CACHE_DIR, SHOTS_FULL, SHOTS_THUMB]) {
    mkdirSync(d, { recursive: true })
  }
}

function assertCleanWorktree() {
  const out = execSync(`git -C ${CREDIOS_REPO} status --porcelain`, { encoding: "utf8" })
  if (out.trim().length > 0) {
    throw new Error(`CrediOS worktree is dirty:\n${out}\nCommit or stash before capture.`)
  }
  const commit = execSync(`git -C ${CREDIOS_REPO} rev-parse --short HEAD`, { encoding: "utf8" }).trim()
  const commitTime = execSync(`git -C ${CREDIOS_REPO} log -1 --format=%cI`, { encoding: "utf8" }).trim()
  return { commit, commitTime }
}

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL, { method: "GET" })
    if (!res.ok && res.status >= 500) {
      throw new Error(`server returned ${res.status}`)
    }
  } catch (err) {
    throw new Error(
      `Cannot reach ${BASE_URL}. Start CrediOS dev server first.\nUnderlying: ${err.message}`,
    )
  }
}

async function login(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', LOGIN_EMAIL)
  await page.getByRole("button", { name: /send/i }).first().click()
  const otpInput = page.locator('input[inputMode="numeric"]').first()
  await otpInput.waitFor({ state: "visible", timeout: 15000 })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('input[inputMode="numeric"]')
      return !!el && el.value && el.value.length >= 6
    },
    { timeout: 15000 },
  )
  await page.getByRole("button", { name: /verify|login|sign in/i }).first().click()
  await page.waitForURL(/\/(dashboard|sales-workspace)/, { timeout: 20000 })

  const storagePath = resolve(tmpdir(), `crediOS-storage-${Date.now()}.json`)
  await context.storageState({ path: storagePath })
  await context.close()
  return storagePath
}

function loadFixture(name) {
  if (!name) return null
  const p = resolve(FIXTURES_DIR, name)
  if (!existsSync(p)) throw new Error(`fixture not found: ${p}`)
  return JSON.parse(readFileSync(p, "utf8"))
}

async function captureNode(browser, storagePath, node) {
  const start = Date.now()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: storagePath,
  })

  const draft = loadFixture(node.fixture)
  const seedScript = `
    (() => {
      try {
        const draft = ${JSON.stringify(draft)};
        if (draft) {
          localStorage.setItem(${JSON.stringify(DRAFT_KEY_PREFIX)} + draft.id, JSON.stringify(draft));
          const raw = localStorage.getItem(${JSON.stringify(INDEX_KEY)});
          const idx = raw ? JSON.parse(raw) : [];
          if (!idx.includes(draft.id)) {
            idx.push(draft.id);
            localStorage.setItem(${JSON.stringify(INDEX_KEY)}, JSON.stringify(idx));
          }
        }
        ${node.unlockKey ? `localStorage.setItem(${JSON.stringify(node.unlockKey)}, "1");` : ""}
      } catch (e) {
        console.error("[seed]", e);
      }
    })();
  `
  await context.addInitScript({ content: seedScript })
  await context.addInitScript({
    content: `
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{transition:none !important;animation:none !important;caret-color:transparent !important;}';
      const apply = () => { if (document.head) document.head.appendChild(style); else requestAnimationFrame(apply); };
      apply();
    `,
  })

  const page = await context.newPage()
  await page.goto(`${BASE_URL}${node.route}`, { waitUntil: "domcontentloaded" })
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 })
  } catch {
    // best-effort; some Next.js apps keep streams open
  }
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(500)

  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    type: "png",
  })

  const fullOut = resolve(SHOTS_FULL, `${node.id}.webp`)
  const thumbOut = resolve(SHOTS_THUMB, `${node.id}.webp`)
  await sharp(png).webp({ quality: 85 }).toFile(fullOut)
  await sharp(png).resize({ width: 400 }).webp({ quality: 80 }).toFile(thumbOut)

  await context.close()
  const dt = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[capture] ${node.id} ... ok (${dt}s)`)
}

async function main() {
  ensureDirs()
  console.log("[capture] checking CrediOS worktree...")
  const { commit, commitTime } = assertCleanWorktree()
  console.log(`[capture] CrediOS HEAD ${commit} @ ${commitTime}`)

  console.log("[capture] checking dev server...")
  await assertServerUp()

  console.log("[capture] launching chromium...")
  const browser = await chromium.launch({ headless: true })
  let storagePath
  try {
    console.log("[capture] logging in once...")
    storagePath = await login(browser)
    console.log(`[capture] storage state saved`)

    for (const node of NODES) {
      try {
        await captureNode(browser, storagePath, node)
      } catch (err) {
        console.error(`[capture] ${node.id} FAILED: ${err.message}`)
        await browser.close()
        process.exit(1)
      }
    }
  } finally {
    await browser.close()
    if (storagePath && existsSync(storagePath)) {
      try { rmSync(storagePath) } catch {}
    }
  }

  const manifest = {
    uiFlowVersion: UI_FLOW_VERSION,
    project: { name: "CrediOS Sales Workspace", scope: "Sales Officer · NTC + ETC" },
    crediOS: {
      commit,
      commitTime,
      repo: "https://github.com/xazaj/CrediOS",
    },
    capturedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    nodes: NODES.map((n) => ({
      id: n.id,
      title: n.title,
      lane: n.lane,
      x: n.x,
      y: n.y,
      stage: n.stage,
      desc: n.desc,
      thumb: `shots/thumbs/${n.id}.webp`,
      full: `shots/full/${n.id}.webp`,
    })),
    edges: EDGES,
  }
  writeFileSync(resolve(CACHE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2))
  console.log("[capture] wrote manifest.json")
  console.log("[capture] done")
}

main().catch((err) => {
  console.error("[capture] FATAL:", err)
  process.exit(1)
})
