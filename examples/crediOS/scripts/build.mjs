import { readFileSync, existsSync, mkdirSync, renameSync, statSync } from "fs"
import { resolve, dirname } from "path"
import { pathToFileURL, fileURLToPath } from "url"
import { build as viteBuild } from "vite"

const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(dirname(__filename), "../../..")
const CACHE_DIR = resolve(ROOT, "examples/crediOS/cache")
const MANIFEST_PATH = resolve(CACHE_DIR, "manifest.json")
const DIST_DIR = resolve(ROOT, "dist")

async function main() {
  const args = process.argv.slice(2)
  const noVerify = args.includes("--no-verify")
  const outIdx = args.indexOf("--out")
  let outOverride = null
  if (outIdx >= 0) {
    const next = args[outIdx + 1]
    if (!next || next.startsWith("--")) {
      configFail("--out requires a path argument, e.g. --out dist/foo.html")
    }
    outOverride = next
  }

  if (!existsSync(MANIFEST_PATH)) {
    configFail("examples/crediOS/cache/manifest.json not found — run `node examples/crediOS/scripts/capture.mjs` first")
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))

  if (!Array.isArray(manifest.nodes) || manifest.nodes.length === 0) {
    configFail("manifest has zero nodes — re-run capture.mjs")
  }

  const commit = (manifest.crediOS?.commit || "").trim()
  if (!commit) {
    configFail("manifest has no crediOS.commit — capture may have failed")
  }

  function inlineAsset(relPath, nodeId, kind) {
    if (!relPath) return ""
    const abs = resolve(CACHE_DIR, relPath)
    if (!existsSync(abs)) {
      throw new Error(`[build] Missing image at ${abs} — re-run capture.mjs (node ${nodeId} ${kind})`)
    }
    const b64 = readFileSync(abs).toString("base64")
    return `data:image/webp;base64,${b64}`
  }

  manifest.nodes = manifest.nodes.map((n) => ({
    ...n,
    thumb: inlineAsset(n.thumb, n.id, "thumb"),
    full: inlineAsset(n.full, n.id, "full"),
  }))

  const sha = commit.slice(0, 7)
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
        output: { inlineDynamicImports: true },
      },
    },
  })

  const viteOutput = resolve(DIST_DIR, "index.html")
  if (!existsSync(viteOutput)) {
    throw new Error(`[build] vite build did not produce ${viteOutput}`)
  }

  const outputHtml = readFileSync(viteOutput, "utf8")
  assertSelfContained(outputHtml)

  if (existsSync(finalOut)) {
    console.log(`[build] overwriting existing ${finalOut}`)
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
    return
  }

  await verify(finalOut, manifest)
}

function configFail(msg) {
  console.error(`[build] ${msg}`)
  process.exit(1)
}

function assertSelfContained(html) {
  const patterns = [
    { re: /\bsrc\s*=\s*"([^"]*)"/gi, attr: "src" },
    { re: /\bhref\s*=\s*"([^"]*)"/gi, attr: "href" },
  ]
  for (const { re, attr } of patterns) {
    let m
    while ((m = re.exec(html)) !== null) {
      const val = m[1]
      if (!val) continue
      if (val.startsWith("data:") || val.startsWith("#")) continue
      throw new Error(`[build] single-HTML invariant violated: external ${attr}="${val}" found in output`)
    }
  }
}

async function verify(finalOut, manifest) {
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
    const expectedEdges = Array.isArray(manifest.edges) ? manifest.edges.length : 0

    if (nodeCount !== manifest.nodes.length) {
      throw new Error(`[verify] node count mismatch: expected ${manifest.nodes.length}, got ${nodeCount}`)
    }
    if (edgeCount !== expectedEdges) {
      throw new Error(`[verify] edge count mismatch: expected ${expectedEdges}, got ${edgeCount}`)
    }
    if (errors.length > 0) {
      console.error("[verify] console errors:")
      for (const e of errors) console.error("  " + e)
      throw new Error("[verify] console errors during load")
    }

    console.log(`[verify] OK — ${nodeCount} nodes / ${edgeCount} edges / no console errors`)
  } finally {
    try { await browser.close() } catch {}
  }
}

main().catch((err) => {
  const msg = err && err.message ? err.message : String(err)
  if (msg.startsWith("[verify]") || msg.startsWith("[build]")) {
    console.error(msg)
  } else {
    console.error(`[build] ${msg}`)
  }
  process.exit(3)
})
