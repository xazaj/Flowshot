import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { makeDraft } from "./seed.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, "..", "fixtures")
mkdirSync(FIXTURES_DIR, { recursive: true })

const SPECS = [
  { file: "a1.json", id: "flow-a1-identity", stage: "IDENTITY_SCOPE", customerType: "NTC" },
  { file: "a8.json", id: "flow-a8-final", stage: "FINAL_SUBMITTED", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000123" },
  { file: "a9.json", id: "flow-a9-review", stage: "FINAL_SUBMITTED", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000456" },
  { file: "a10.json", id: "flow-a10-edit", stage: "NTC_DE1_ENTRY", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000789" },
  { file: "n1.json", id: "flow-n1-ntc-de1", stage: "NTC_DE1_ENTRY", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000111" },
  { file: "n2.json", id: "flow-n2-ntc-de1-dual", stage: "NTC_DE1_DUAL_ENTRY", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000222" },
  { file: "n3.json", id: "flow-n3-aip-pending", stage: "NTC_AIP_PENDING_REVIEW", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000333" },
  { file: "n4.json", id: "flow-n4-aip-rejected", stage: "NTC_AIP_REJECTED_FINAL", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000444" },
  { file: "n5.json", id: "flow-n5-ntc-de2", stage: "NTC_DE2_ENTRY", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000555" },
  { file: "n6.json", id: "flow-n6-ntc-de2-dual", stage: "NTC_DE2_DUAL_ENTRY", customerType: "NTC", referenceNumber: "CC/CC/2026/L0000666" },
  { file: "e1.json", id: "flow-e1-etc-de1", stage: "ETC_DE1_ENTRY", customerType: "ETC", referenceNumber: "CC/CC/2026/L0000777" },
  { file: "e2.json", id: "flow-e2-etc-de1-dual", stage: "ETC_DE1_DUAL_ENTRY", customerType: "ETC", referenceNumber: "CC/CC/2026/L0000888" },
]

for (const spec of SPECS) {
  const draft = makeDraft(spec)
  const out = resolve(FIXTURES_DIR, spec.file)
  writeFileSync(out, JSON.stringify(draft, null, 2))
  console.log(`[gen-fixtures] wrote ${spec.file}`)
}
