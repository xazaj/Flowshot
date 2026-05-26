#!/usr/bin/env node
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { setTimeout as sleep } from "node:timers/promises"
import { chromium } from "playwright"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const FLOWSHOT_ROOT = resolve(__dirname, "..", "..", "..")
const FIXTURES_DIR = resolve(ROOT, "fixtures")
const CACHE_DIR = resolve(ROOT, "cache")
const SHOTS_FULL = resolve(CACHE_DIR, "shots", "full")
const SHOTS_THUMB = resolve(CACHE_DIR, "shots", "thumbs")

const CREDIOS_REPO = "/Users/zhuaijun/Work-space/CrediOS"
const BASE_URL = "http://localhost:3000"
const LOGIN_EMAIL = "flowshot@webnak.com"
const VIEWPORT = { width: 1280, height: 800 }

const FLOWSHOT_PKG = JSON.parse(
  readFileSync(resolve(FLOWSHOT_ROOT, "package.json"), "utf8"),
)
const UI_FLOW_VERSION = `v${FLOWSHOT_PKG.version}`

const NODES = [
  { id: "W1", title: "Data Entry Workbench", lane: "shared", x: 0, y: 200, stage: "WORKBENCH",
    desc: "Sales officer landing — view drafts, start new application, jump to inquiry.",
    route: "/sales-workspace", fixture: null, kind: "workspace" },
  { id: "W2", title: "Application Inquiry", lane: "shared", x: 0, y: 400, stage: "INQUIRY",
    desc: "Search submitted/rejected applications by reference or identity.",
    route: "/sales-workspace?app=search", fixture: null, kind: "workspace" },
  { id: "A1", title: "Identity Scope", lane: "shared", x: 300, y: 300, stage: "IDENTITY_SCOPE",
    desc: "Capture applicant identity, run identify, decide NTC vs ETC + apply-for scope.",
    route: "/sales-workspace/applications/flow-a1-identity", fixture: "a1.json", kind: "application" },
  { id: "N1", title: "NTC DE1 Entry", lane: "ntc", x: 600, y: 100, stage: "NTC_DE1_ENTRY",
    desc: "NTC first-pass data entry — applicant, employment, card application.",
    route: "/sales-workspace/applications/flow-n1-ntc-de1", fixture: "n1.json", kind: "application" },
  { id: "N2", title: "NTC DE1 Dual Entry", lane: "ntc", x: 900, y: 100, stage: "NTC_DE1_DUAL_ENTRY",
    desc: "NTC dual-entry data quality check — re-key locked fields to confirm.",
    route: "/sales-workspace/applications/flow-n2-ntc-de1-dual", fixture: "n2.json", kind: "application" },
  { id: "N3", title: "NTC AIP Pending", lane: "ntc", x: 1200, y: 100, stage: "NTC_AIP_PENDING_REVIEW",
    desc: "Waiting for AIP (approval-in-principle) decision after DE1 submission.",
    route: "/sales-workspace/applications/flow-n3-aip-pending", fixture: "n3.json", kind: "application" },
  { id: "N4", title: "NTC AIP Rejected", lane: "ntc", x: 1500, y: 0, stage: "NTC_AIP_REJECTED_FINAL",
    desc: "Terminal — AIP rejected, application closed with rejection reason.",
    route: "/sales-workspace/applications/flow-n4-aip-rejected", fixture: "n4.json", kind: "application" },
  { id: "N5", title: "NTC DE2 Entry", lane: "ntc", x: 1500, y: 200, stage: "NTC_DE2_ENTRY",
    desc: "Post-AIP second-pass entry — supplementary cardholders + remaining details.",
    route: "/sales-workspace/applications/flow-n5-ntc-de2", fixture: "n5.json", kind: "application",
    unlockKey: "ntc-de2-entry:flow-n5-ntc-de2" },
  { id: "N6", title: "NTC DE2 Dual Entry", lane: "ntc", x: 1800, y: 200, stage: "NTC_DE2_DUAL_ENTRY",
    desc: "Tab-based dual-entry on supplementary + card application data.",
    route: "/sales-workspace/applications/flow-n6-ntc-de2-dual", fixture: "n6.json", kind: "application" },
  { id: "E1", title: "ETC DE1 Entry", lane: "etc", x: 600, y: 500, stage: "ETC_DE1_ENTRY",
    desc: "ETC single-pass data entry — leverages existing CIF data.",
    route: "/sales-workspace/applications/flow-e1-etc-de1", fixture: "e1.json", kind: "application" },
  { id: "E2", title: "ETC DE1 Dual Entry", lane: "etc", x: 900, y: 500, stage: "ETC_DE1_DUAL_ENTRY",
    desc: "ETC dual-entry data quality check before final submission.",
    route: "/sales-workspace/applications/flow-e2-etc-de1-dual", fixture: "e2.json", kind: "application" },
  { id: "A8", title: "Final Submitted", lane: "shared", x: 2100, y: 350, stage: "FINAL_SUBMITTED",
    desc: "Terminal — application submitted, read-only summary view.",
    route: "/sales-workspace/applications/flow-a8-final", fixture: "a8.json", kind: "application" },
  { id: "A9", title: "Review (Read-only)", lane: "shared", x: 300, y: 600, stage: "REVIEW",
    desc: "Read-only review of a finished/submitted draft.",
    route: "/sales-workspace/applications/flow-a9-review/review", fixture: "a9.json", kind: "application" },
  { id: "A10", title: "Edit Draft", lane: "shared", x: 600, y: 600, stage: "EDIT",
    desc: "Resume editing an in-progress draft from the workbench.",
    route: "/sales-workspace/applications/flow-a10-edit/edit", fixture: "a10.json", kind: "application" },
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

const ANIM_KILL_CSS = `*,*::before,*::after{
  animation-duration:0s !important;
  animation-delay:0s !important;
  transition-duration:0s !important;
  transition-delay:0s !important;
  caret-color:transparent !important;
  scroll-behavior:auto !important;
}`

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
  let repoUrl = "https://github.com/xazaj/CrediOS"
  try {
    const remote = execSync(`git -C ${CREDIOS_REPO} remote get-url origin`, { encoding: "utf8" }).trim()
    if (remote.startsWith("git@")) {
      repoUrl = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "")
    } else if (remote.startsWith("http")) {
      repoUrl = remote.replace(/\.git$/, "")
    }
  } catch {
    // keep fallback
  }
  return { commit, commitTime, repoUrl }
}

async function assertServerUp() {
  const probe = `${BASE_URL}/login`
  try {
    const res = await fetch(probe, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
      redirect: "manual",
    })
    if (res.status >= 500) {
      throw new Error(`server returned ${res.status}`)
    }
  } catch (err) {
    throw new Error(
      `CrediOS dev server not reachable at ${BASE_URL}. ` +
      `Start it with \`cd ${CREDIOS_REPO} && pnpm dev\`.\nUnderlying: ${err.message}`,
    )
  }
}

async function login(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" })
  await page.fill('input#email', LOGIN_EMAIL)

  const sendBtn = page.getByRole("button", { name: /^send code$/i })
  await sendBtn.waitFor({ state: "visible", timeout: 10000 })
  if (await sendBtn.isDisabled()) {
    throw new Error("Send code button is disabled — check email input or cooldown state.")
  }
  await sendBtn.click()

  const otpInput = page.locator('input[inputMode="numeric"]').first()
  await otpInput.waitFor({ state: "visible", timeout: 15000 })
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('input[inputMode="numeric"]')
        return !!el && el.value && el.value.length >= 6
      },
      { timeout: 15000 },
    )
  } catch (err) {
    throw new Error(
      "OTP did not auto-fill in 15s. Ensure CrediOS runs in dev mode " +
      "(`pnpm dev`, not `next start`). The dev API at /api/auth/request-code " +
      "returns devCode which the form pre-fills.\nUnderlying: " + err.message,
    )
  }

  await page.locator('button[type="submit"]').click()
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

async function assertReady(page, node) {
  const url = page.url()
  if (/\/login(\?|$)/.test(url)) {
    throw new Error(`navigated to login (session lost or guard rejected): ${url}`)
  }

  if (node.kind === "workspace") {
    await page
      .locator('[data-sidebar="sidebar"]')
      .first()
      .waitFor({ state: "visible", timeout: 8000 })
      .catch(() => {})
    return
  }

  // For application stage nodes: ensure we're not on the not-found / forbidden screen.
  const errorLocator = page.getByText(/Application Not Found|Access Denied/i).first()
  const ready = page
    .locator('[data-sidebar="sidebar"]')
    .first()
    .waitFor({ state: "visible", timeout: 8000 })

  await Promise.race([ready, sleep(3000)]).catch(() => {})

  if (await errorLocator.isVisible().catch(() => false)) {
    throw new Error(`application shell rendered "Not Found / Access Denied" for ${node.route}`)
  }

  if (/\/login(\?|$)/.test(page.url())) {
    throw new Error(`bounced to login after navigation: ${page.url()}`)
  }
}

async function captureNode(browser, storagePath, node) {
  const start = Date.now()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: storagePath,
  })

  const seedErrors = []
  context.on("console", (msg) => {
    const t = msg.text()
    if (t.startsWith("[seed]")) seedErrors.push(t)
  })

  const draft = loadFixture(node.fixture)
  await context.addInitScript(
    (args) => {
      try {
        if (args.draft) {
          localStorage.setItem(args.prefix + args.draft.id, JSON.stringify(args.draft))
          const raw = localStorage.getItem(args.indexKey)
          const idx = raw ? JSON.parse(raw) : []
          if (!idx.includes(args.draft.id)) {
            idx.push(args.draft.id)
            localStorage.setItem(args.indexKey, JSON.stringify(idx))
          }
        }
        if (args.unlockKey) {
          localStorage.setItem(args.unlockKey, "1")
        }
      } catch (e) {
        console.error("[seed] failed:", e && e.message ? e.message : String(e))
      }
    },
    {
      draft,
      unlockKey: node.unlockKey ?? null,
      prefix: DRAFT_KEY_PREFIX,
      indexKey: INDEX_KEY,
    },
  )

  await context.addInitScript((css) => {
    const inject = () => {
      if (!document.head) return requestAnimationFrame(inject)
      const style = document.createElement("style")
      style.textContent = css
      document.head.appendChild(style)
    }
    inject()
  }, ANIM_KILL_CSS)

  const page = await context.newPage()
  await page.goto(`${BASE_URL}${node.route}`, { waitUntil: "domcontentloaded" })
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 })
  } catch {
    // best-effort; some Next.js apps keep streams open
  }

  if (seedErrors.length > 0) {
    throw new Error(`seed script reported errors:\n${seedErrors.join("\n")}`)
  }

  if (draft) {
    const ok = await page.evaluate(
      ({ prefix, id }) => !!localStorage.getItem(prefix + id),
      { prefix: DRAFT_KEY_PREFIX, id: draft.id },
    )
    if (!ok) {
      throw new Error(`fixture was not written to localStorage for draft id=${draft.id}`)
    }
  }

  await assertReady(page, node)

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

async function captureWithRetry(browser, storagePath, node) {
  try {
    await captureNode(browser, storagePath, node)
    return { id: node.id, ok: true }
  } catch (err) {
    console.warn(`[capture] ${node.id} first attempt failed: ${err.message}`)
    await sleep(1000)
    try {
      await captureNode(browser, storagePath, node)
      console.log(`[capture] ${node.id} ... ok (after retry)`)
      return { id: node.id, ok: true, retried: true }
    } catch (err2) {
      console.error(`[capture] ${node.id} FAILED after retry: ${err2.message}`)
      return { id: node.id, ok: false, error: err2.message }
    }
  }
}

async function main() {
  ensureDirs()
  console.log("[capture] checking CrediOS worktree...")
  const { commit, commitTime, repoUrl } = assertCleanWorktree()
  console.log(`[capture] CrediOS HEAD ${commit} @ ${commitTime}`)

  console.log("[capture] checking dev server...")
  await assertServerUp()

  console.log("[capture] launching chromium...")
  const browser = await chromium.launch({ headless: true })
  let storagePath
  const results = []
  try {
    console.log("[capture] logging in once...")
    storagePath = await login(browser)
    console.log(`[capture] storage state saved`)

    for (const node of NODES) {
      results.push(await captureWithRetry(browser, storagePath, node))
    }
  } finally {
    await browser.close()
    if (storagePath && existsSync(storagePath)) {
      try { rmSync(storagePath) } catch {}
    }
  }

  const ok = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)
  console.log(`[capture] ${ok.length}/${results.length} ok${failed.length ? `, ${failed.length} failed: ${failed.map((f) => f.id).join(", ")}` : ""}`)

  if (failed.length > 0) {
    console.error("[capture] aborting before manifest write — some nodes failed.")
    process.exit(2)
  }

  const manifest = {
    uiFlowVersion: UI_FLOW_VERSION,
    project: { name: "CrediOS Sales Workspace", scope: "Sales Officer · NTC + ETC" },
    crediOS: {
      commit,
      commitTime,
      repo: repoUrl,
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
  process.exit(2)
})
