import { readFileSync, existsSync, mkdirSync, renameSync, statSync } from "fs"
import { resolve, dirname } from "path"
import { pathToFileURL, fileURLToPath } from "url"
import { build as viteBuild } from "vite"

const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(__filename), "../../..")
const CACHE_DIR = resolve(ROOT, "examples/crediOS/cache")
const MANIFEST_PATH = resolve(CACHE_DIR, "manifest.json")
const DIST_DIR = resolve(ROOT, "dist")

const args = process.argv.slice(2)
const noVerify = args.includes("--no-verify")
const outIdx = args.indexOf("--out")
const outOverride = outIdx >= 0 ? args[outIdx + 1] : null

function fail(msg, code = 3) {
  console.error(`[build] ${msg}`)
  process.exit(code)
}

if (!existsSync(MANIFEST_PATH)) {
  fail("examples/crediOS/cache/manifest.json not found — run `node examples/crediOS/scripts/capture.mjs` first")
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))

function inlineAsset(relPath, nodeId, kind) {
  if (!relPath) return null
  const abs = resolve(CACHE_DIR, relPath)
  if (!existsSync(abs)) {
    console.warn(`[build] node ${nodeId} ${kind} missing: ${relPath} — leaving empty`)
    return null
  }
  const b64 = readFileSync(abs).toString("base64")
  return `data:image/webp;base64,${b64}`
}

manifest.nodes = manifest.nodes.map((n) => ({
  ...n,
  thumb: inlineAsset(n.thumb, n.id, "thumb") || "",
  full: inlineAsset(n.full, n.id, "full") || "",
}))

const sha = (manifest.crediOS?.commit || "0000000").slice(0, 7)
const defaultOut = resolve(DIST_DIR, `CrediOS-UIFlow-NTC+ETC-${sha}.html`)
const finalOut = outOverride ? resolve(process.cwd(), outOverride) : defaultOut

if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true })
mkdirSync(dirname(finalOut), { recursive: true })

const manifestJson = JSON.stringify(manifest).replace(/</g, "\\u003c")

console.log(`[build] running vite build...`)
await viteBuild({
  root: ROOT,
  logLevel: "warn",
  configFile: resolve(ROOT, "vite.config.js"),
  plugins: [
    {
      name: "flowshot-inject-manifest",
      transformIndexHtml(html) {
        return html.replace(
          "</body>",
          `<script type="application/json" id="uiflow-manifest">${manifestJson}</script></body>`,
        )
      },
    },
  ],
  build: {
    outDir: DIST_DIR,
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(ROOT, "index.html"),
      output: {
        inlineDynamicImports: true,
        entryFileNames: TMP_NAME.replace(/\.html$/, ".js"),
      },
    },
  },
})

const viteOutput = resolve(DIST_DIR, "index.html")
if (!existsSync(viteOutput)) {
  fail(`vite build did not produce ${viteOutput}`)
}
renameSync(viteOutput, finalOut)

const sizeBytes = statSync(finalOut).size
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)
console.log(`[build] wrote ${finalOut} (${sizeMB}MB)`)
if (sizeBytes > 10 * 1024 * 1024) {
  console.warn(`[build] WARNING: output > 10MB — may be unfriendly for email delivery`)
}

if (noVerify) {
  console.log("[build] --no-verify set, skipping verification")
  process.exit(0)
}

console.log("[verify] launching chromium...")
const { chromium } = await import("playwright")
const browser = await chromium.launch()
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`)
  })

  const fileUrl = pathToFileURL(finalOut).href
  await page.goto(fileUrl)
  await page.waitForSelector('.app-shell[data-ready="true"]', { timeout: 10000 })

  const nodeCount = await page.locator(".react-flow__node").count()
  const edgeCount = await page.locator(".react-flow__edge").count()

  if (nodeCount !== manifest.nodes.length) {
    fail(`[verify] node count mismatch: expected ${manifest.nodes.length}, got ${nodeCount}`)
  }
  if (edgeCount !== manifest.edges.length) {
    fail(`[verify] edge count mismatch: expected ${manifest.edges.length}, got ${edgeCount}`)
  }
  if (errors.length > 0) {
    console.error("[verify] console errors:")
    for (const e of errors) console.error("  " + e)
    fail("console errors during load")
  }

  console.log(`[verify] OK — ${nodeCount} nodes / ${edgeCount} edges / no console errors`)
} catch (err) {
  if (!String(err.message).startsWith("[verify]")) {
    console.error("[verify] FAILED:", err.message)
  }
  await browser.close()
  process.exit(3)
} finally {
  try { await browser.close() } catch {}
}

process.exit(0)
