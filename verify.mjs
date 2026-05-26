import { chromium } from "playwright"
import { pathToFileURL } from "url"
import { resolve } from "path"

const url = pathToFileURL(resolve("./dist/index.html")).href
const browser = await chromium.launch({
  executablePath:
    "/Users/zhuaijun/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const errors = []
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`)
})

await page.goto(url)
await page.waitForSelector(".react-flow__node", { timeout: 5000 })

const nodeCount = await page.locator(".react-flow__node").count()
const edgeCount = await page.locator(".react-flow__edge").count()
const hasMinimap = (await page.locator(".react-flow__minimap").count()) > 0
const hasControls = (await page.locator(".react-flow__controls").count()) > 0
const nodeTitles = await page.locator(".react-flow__node").allInnerTexts()

const screenshotPath = "/tmp/uiflow-spike-s5/dist/_verify.png"
await page.screenshot({ path: screenshotPath })

await browser.close()

console.log(JSON.stringify({
  url,
  protocol: new URL(url).protocol,
  nodeCount,
  edgeCount,
  hasMinimap,
  hasControls,
  nodeTitles,
  errors,
  screenshotPath,
}, null, 2))

process.exit(errors.length === 0 && nodeCount === 4 && edgeCount === 3 ? 0 : 1)
