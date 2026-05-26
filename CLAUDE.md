# Flowshot — Project Rules

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Touch minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **YAGNI Ruthlessly**: V1 is intentionally minimal (see `docs/00.Flowshot 产品方案.md` §6). Do not add features outside V1 scope without an explicit decision.

## Working Process

### 1. Plan First
- Enter plan mode for any non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, STOP and re-plan immediately — don't keep pushing.
- Write detailed specs upfront to reduce ambiguity.

### 2. Use Subagents Liberally
- Offload research, exploration, and parallel analysis to subagents.
- Keep main context window clean for decisions and synthesis.
- One task per subagent for focused execution.

### 3. Verification Before Done
- Never mark a task complete without proving it works.
- Run tests, check logs, demonstrate correctness.
- For CLI changes: run the command end-to-end against `examples/demo-site/`.
- Ask yourself: "Would a staff engineer approve this?"

### 4. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes — don't over-engineer.

### 5. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.

### 6. Modifying Existing Features
Strict sequence — never modify implementation code before tests reflect the new expected behavior:
1. **Audit regression tests first** — identify all existing tests covering the affected functionality; confirm they pass.
2. **Update tests before code** — if behavior changes, update or add tests first.
3. **Implement the change** — modify code to satisfy the updated tests.
4. **Run regression suite** — confirm all tests pass before considering the task complete.

## Things to Review When Modifying Code

- Is this just a "band-aid over a band-aid"?
- Are there redundant backwards-compatibility branches?
- Does the design feel intentional from the ground up, rather than hacked together later?

## Task Management

Use Claude's built-in TaskCreate/TaskUpdate for tracking. No external `todo.md` file.

1. **Plan First** — write tasks for any work with 3+ steps.
2. **One task in_progress at a time** — mark complete the moment it's done, don't batch.
3. **Capture follow-ups** — if implementation reveals new work, create new tasks immediately.

## Language

- Communicate with user in Chinese.
- Write all code, comments, and UI copy in English.
- Respond concisely. Lead with the answer. Skip preamble.

## Code Rules (Flowshot-specific)

### Module system
- ESM only. `package.json` must have `"type": "module"`.
- `src/` is TypeScript strict mode. No `any` without justification.

### CLI contract
- CLI commands: `flowshot capture`, `flowshot build` (V1 only; see product spec §3.1).
- Exit codes: `0` success, `1` config error, `2` capture error, `3` build error.
- Stable: do not rename commands or break flag semantics within `0.x`.

### Single-HTML invariant
The renderer (`src/build/renderer/`) is the source of the single-HTML deliverable. It MUST:
- Not reference any CDN, external URL, or `fetch()` call.
- Inline every asset via `vite-plugin-singlefile` + `<img src="data:...">` + `<script type="application/json">`.
- Run correctly under `file://` protocol with zero console errors.

Any PR that adds an external dependency to renderer is rejected by default.

### Dependency layering
- Playwright is a `peerDependency` — users install it themselves (avoid double browser binaries).
- React / Vite / React Flow are normal `dependencies` — internal implementation; user must not import them directly.
- Adding a new runtime `dependency` requires justification (package size matters).

### README is the user's only entrypoint (V1)
- Any change to `flowshot.config` shape, `seed.mjs` contract, or CLI flags MUST be reflected in README's copy-pasteable templates in the same commit.
- README examples must remain runnable against `examples/demo-site/`.

### Comments
- Default to no comments. Only add one when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).
- Do not write comments that restate what the code does — well-named identifiers carry that meaning.
- Do not write task-context comments like `// used by capture command` or `// added for the renderer migration`. Those belong in commit messages and rot fast.
- Do not delete existing comments unless the code they describe is being removed or the comment is wrong.

## Before Starting Work

Consult `docs/00.Flowshot 产品方案.md` first — it is the source of truth for:
- V1 scope (§6) — what's in / out
- Config + seed contracts (§3.2, §3.3)
- Tech stack rationale (§3.5, §3.6)
- Stability conventions for `flowshot capture` (§3.6 item 6)

If a task seems to conflict with the product spec, surface the conflict before coding.

## Communication & Reporting Discipline

### Collaborative judgment
- You are not only an executor — contribute judgment when it materially helps.
- If the user's request appears based on a misconception, say so clearly before acting.
- If you notice a nearby bug or flaw adjacent to the user's request, raise it directly instead of silently ignoring it.

### Faithful reporting
- Report outcomes exactly as they are. If tests fail, say they failed and include details.
- If you did not run a verification step, say so directly rather than implying success.
- Never suppress, soften, or reinterpret failing tests, lint errors, type errors, or broken behavior to present work as complete.
- When something is confirmed to work, state that plainly — don't hedge confirmed results.

### User-facing communication
- Assume the user cannot see most tool calls or internal reasoning.
- Before the first substantive action, briefly state what you are about to do.
- Give short progress updates at meaningful moments: found a root cause, changed direction, substantial progress without recent update.
- Use complete sentences. Prefer clarity first, then brevity — don't optimize for shortness if it harms understanding.
- Use prose by default. Use tables only when they genuinely help present compact factual data.
- For simple questions, answer directly without imposing structure.

### 沟通风格
- 不讲黑话。使用逻辑通顺、真实世界里人会讲的、专业的中文。
- 完成任务后不要做总结，除非有特别重要的信息需要告诉用户，或者有需要决策的信息要与用户确认。

## Debug 原则

1. 改代码之前必须先列假设
2. 每次实验最多改 5 行
3. 所有证据写文件 — 防上下文压缩丢掉推理链
4. 同一方向失败 2 次 → 强制换假设
