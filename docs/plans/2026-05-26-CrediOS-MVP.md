# CrediOS UI Flow MVP 开发计划

> 日期：2026-05-26
> 状态：待用户拍板 3 项决策后开工
> 目标：最快路径产出 CrediOS Sales Workspace UI Flow 单 HTML 评审稿
> 关联文档：
> - 产品方案 `docs/00.Flowshot 产品方案.md`
> - 案例 spec `docs/cases/CrediOS-Sales-Workspace.md`
> - 设计系统 `docs/figma-design.md`
> - Spike 报告 `docs/01.Spike S5 报告.md`
> - **CrediOS 路由与交互权威来源**：`/Users/zhuaijun/Work-space/CrediOS/docs/业务需求/CrediOS-Sitemap-QA-Guide.md`（路由、Tab、auth、stage flow、ApplicationDraft 源码位置）。capture 脚本编写时以此为准，与本文档 / 案例 spec 不一致时以 sitemap 为准

---

## 0. 最小化简化决策

为「最快出第一版」，主动砍掉以下：

| 砍掉项 | 理由 | 何时补 |
|--------|------|------|
| Flowshot CLI 抽象（`flowshot capture/build` 命令） | MVP 不需要复用，直接写 CrediOS 专用脚本 | V2 抽取 |
| TypeScript / tsup 包构建 | MVP 用 `.mjs`/`.jsx` 即可，省 1h setup | V2 重构 |
| `flowshot.config.ts` 通用 schema | 节点数据直接硬编码 JSON | V2 抽取 |
| `examples/demo-site/` | CrediOS 本身就是真实示例 | V2 时补一个轻量 demo |
| 支路弹窗节点 B1–B4（Cancel/Appeal/Document/Memo dialogs） | 4 张 dialog 截图需要额外 click 编排，砍掉省 1–2h | V1.1 补 |
| 多浏览器验证（Safari/Firefox） | Spike S5 已验过 Chromium，MVP 只保证 Chrome/Edge | V1.1 补 |
| `flowshot dev` 拖节点编辑器 | 手填坐标 | V2 |

**MVP 节点数：18 → 14**（砍掉 B1–B4 四张 dialog 截图）

---

## 1. 范围（14 节点 + 14 张截图）

> ⚠️ 路由已对照 CrediOS sitemap §2 修正 —— 案例 spec 部分路由缺失 `/sales-workspace` 前缀，本表为准。

| 节点 ID | 节点名 | 路由 | seed 需求 |
|---------|-------|------|----------|
| W1 | Data Entry Workbench | `/sales-workspace` | ❌ 默认状态 |
| W2 | Application Inquiry | `/sales-workspace?app=search` | ❌（W2 是 tab，不是独立路由） |
| A1 | Identity Scope | `/sales-workspace/applications/[id]` (stage=IDENTITY) | ✅ |
| A8 | Final Submitted | `/sales-workspace/applications/[id]` (stage=FINAL_SUBMITTED) | ✅ |
| A9 | Review | `/sales-workspace/applications/[id]/review` | ✅（复用草稿） |
| A10 | Edit | `/sales-workspace/applications/[id]/edit` | ✅（复用草稿） |
| N1–N6 | NTC DE1/Dual/AIP/Rejected/DE2/DE2-Dual | `/sales-workspace/applications/[id]` (stage=*) | ✅ 6 份 |
| E1–E2 | ETC DE1/Dual | `/sales-workspace/applications/[id]` (stage=ETC_*) | ✅ 2 份 |

共 **12 份 seed fixture**（A9/A10 复用 NTC/ETC 草稿）。节点拓扑见 `docs/cases/CrediOS-Sales-Workspace.md` §2.6。

**A1 截图特殊处理**：sitemap §13 说 `/sales-workspace/applications/new` 是 server 生成 UUID 后重定向，**不能直接 goto**。MVP 用 seed 提前写好固定 ID 的草稿到 localStorage，直接 `goto('/sales-workspace/applications/<fixed-id>')` 即可。

---

## 2. 阶段拆解（总工期 ~8h）

### Phase A — 仓库准备（0.5h）

- 添加依赖：`playwright`（含浏览器二进制）、`sharp`、`@fontsource-variable/inter`、`@fontsource/geist-mono`
- 重构现有 `src/main.jsx`（Spike S5 4 节点 demo） → `src/renderer/` 目录
- 在 `examples/crediOS/` 下建脚本目录
- `.gitignore` 增加 `examples/crediOS/cache/`、`dist/`

### Phase B — 截图采集脚本（3h）

**文件**：`examples/crediOS/capture.mjs`

**前置：CrediOS dev server 已运行在 `http://localhost:3000`**（用户自行保证；脚本启动时先 `GET /` 探活，失败明示报错）。

**功能流程**：
1. 从 CrediOS repo 读 git HEAD commit（要求 worktree clean）
2. 启动 Playwright（Chromium）
3. **认证一次性建立**（CrediOS dev mode 简化登录）：
   - 起一个 base `BrowserContext`
   - 访问 `/login`
   - 填邮箱 `flowshot@webnak.com`（domain `@webnak.com` 是本地 dev 白名单）
   - 点 "Send" 按钮 → **OTP 自动反显**到验证码输入框（dev mode 行为）
   - 等待 OTP 输入框出现非空值（`page.waitForFunction(() => document.querySelector('input[inputMode="numeric"]').value.length === 6)`）
   - 点 "Verify / 登陆" → 重定向到 `/dashboard` → workspace
   - `context.storageState()` 导出 cookie + localStorage → 复用给所有节点
4. 对每个节点：
   - 新建独立 `BrowserContext({ storageState })`（带 auth）
   - `addInitScript` 追加注入对应 fixture 到 `localStorage`（草稿数据）
   - 注入 CSS 禁用所有动画/过渡（产品方案 §3.6 item 6）
   - `goto(route)`，等待 `document.fonts.ready` + `networkidle`
   - 等待 500ms 兜底（CrediOS 没有 `data-flowshot-ready` 信号，MVP 不改）
   - `screenshot({ clip: { width: 1280, height: 800 } })` → PNG buffer
5. sharp 批转 webp：
   - 高清 q=85 → `cache/shots/full/<id>.webp`
   - 缩略 400px 宽 → `cache/shots/thumbs/<id>.webp`
6. 写 `cache/manifest.json`（节点元数据 + git commit + capture timestamp）

**硬编码内容**（MVP 不抽象）：
- `BASE_URL = 'http://localhost:3000'`
- `CREDIOS_REPO = '/Users/zhuaijun/Work-space/CrediOS'`
- `LOGIN_EMAIL = 'flowshot@webnak.com'`（dev mode：OTP 自动反显到输入框，无需读邮箱）
- 12 份 fixture — 参考 sitemap §15 列出的源文件：
  - `CrediOS/src/lib/forms/card-manifest.ts`（卡片定义）
  - `CrediOS/src/lib/forms/application-sections.ts`（section 结构）
  - `CrediOS/src/app/sales-workspace/applications/[id]/_components/application-client.tsx`（主控制器，含 stage 流转）
- 14 个节点的 route 表（已对齐 sitemap §2.2）+ seed 名映射

**前置假设（用户责任）**：
- CrediOS dev server 已运行（`http://localhost:3000` 可访问）
- CrediOS worktree clean（`git status --porcelain` 为空）

### Phase C — Renderer（Figma 设计落地）（3h）

**文件结构**：`src/renderer/`

| 文件 | 职责 |
|------|------|
| `main.jsx` | Vite 入口，读 `<script id="uiflow-manifest">` JSON |
| `FlowCanvas.jsx` | React Flow 容器 + 节点/边/泳道背景 |
| `ScreenNode.jsx` | 自定义节点组件（Figma 风格） |
| `Lightbox.jsx` | 原生 `<dialog>` 高清图弹层 |
| `VersionBadge.jsx` | 右上角徽章（pill 形态） |
| `tokens.css` | Figma 设计 tokens 转 CSS custom properties |
| `fonts.css` | `@fontsource` 字体声明 |

**Figma 设计系统落地映射**：

| Flowshot 元素 | Figma 系统映射 |
|--------------|---------------|
| 画布背景 | `{colors.canvas}` 白底 |
| 泳道分组（NTC/ETC/共享） | React Flow `<Background>` 之上叠加 3 个色块矩形：**NTC = `{colors.block-cream}`** / **ETC = `{colors.block-lilac}`** / 共享 = canvas 留白；`{rounded.lg}` 24px 圆角 |
| 节点卡片 | 240×180px，`{colors.canvas}` 背景，`{colors.hairline}` 1px 描边，`{rounded.md}` 8px 圆角，**无阴影**（Figma 反阴影） |
| 节点标题 | `{typography.body-sm}` 16px / weight 540 / `{colors.ink}` |
| 节点 stage 标签 | `{typography.caption}` 12px / Geist Mono / 全大写 / `{colors.ink}` 60% 透明 |
| 边 label | `{typography.body-sm}` 16px / weight 480 / 白色背景 pill |
| 顶部工具栏 | 仿 Figma `top-nav`：56px 高、白底、左 wordmark "CrediOS UI Flow"、右版本徽章 |
| 版本徽章 | `button-secondary` 风格 pill（白底黑字 + `{colors.hairline}` 边框） |
| Lightbox | `{colors.overlay-scrim}` 60% scrim + 中央高清图 + 右上 `button-icon-circular-inverse` 关闭按钮 |
| 字体 | figmaSans → **Inter Variable**；figmaMono → **Geist Mono** |
| React Flow Controls | 重写 CSS 改为白底 hairline 边框、pill 形 |
| MiniMap | 隐藏（14 节点不需要） |

字体处理：用 `@fontsource-variable/inter` + `@fontsource/geist-mono`，构建时 base64 内联到单 HTML。

### Phase D — 构建管线 + 验证（1.5h）

**文件**：`examples/crediOS/build.mjs`

**功能流程**：
1. 读 `cache/manifest.json`
2. 把所有 webp 转 base64 dataURI，写入 manifest 的 `nodes[].thumb` / `nodes[].full`
3. 编程式调 `vite build`：
   - 注入完整 manifest 为 `<script type="application/json" id="uiflow-manifest">`
   - `vite-plugin-singlefile` 内联所有 JS/CSS
4. 输出：`dist/CrediOS-UIFlow-NTC+ETC-<shortSHA>.html`
5. 改造现有 `verify.mjs` 跑一遍 file:// 验证：节点数 = 14、edge 数 = N、无控制台错误

---

## 3. 关键技术决策

1. **不动 CrediOS 源码** — 全部 seed 用 Playwright `addInitScript` 写 localStorage，CrediOS repo 零侵入
2. **截图分辨率 1280×800** — 符合 CrediOS 案例约定；renderer 节点用 400px 缩略，lightbox 用全尺寸
3. **泳道色块用 React Flow Background 自定义图层** — 不用真实节点占位，避免影响布局
4. **HEAD commit 从 CrediOS repo 取**（不是 Flowshot repo） — 版本徽章锁定的是 CrediOS 代码版本
5. **节点位置手填** — MVP 不做拖拽编辑器，开发时在 capture.mjs 里写死 `x/y`

---

## 4. 风险与待决策

| # | 风险 / 决策点 | 默认方案 |
|---|--------------|---------|
| 1 | **12 份 fixture 的 `ApplicationDraft` schema 不熟** | Phase B 时读 `CrediOS/src/lib/draft-local-store.ts` + 相关类型；若复杂可能 +1h |
| 2 | **某些 stage 有解锁键**（如 `ntc-de2-entry:<id> = "1"`） | capture 脚本已规划处理，参考 CrediOS 案例 §3.5 |
| 3 | **CrediOS 没有 `data-flowshot-ready` DOM 信号** | MVP 用 `waitForLoadState('networkidle')` + 500ms 兜底；后续若 flaky 再补信号 |
| 4 | **泳道色块视觉细节** | 我先做、commit 截图给用户看，迭代 1–2 轮 |
| 5 | **deliverable 文件命名** | `dist/CrediOS-UIFlow-NTC+ETC-<shortSHA>.html`（按 CrediOS 案例 §8.6） |
| 6 | **Playwright 浏览器二进制下载时长** | 首次 `npm install` 后跑一次 `npx playwright install chromium`；提醒用户 |
| 7 | **登录认证** | ✅ 已解决：dev mode 接受 `@webnak.com` 邮箱，点 "Send" 后 OTP 自动反显到输入框，等其填充后点 "Verify" 即可。脚本一次登录、storageState 复用给 14 个节点 |

---

## 5. 工期估算

| 阶段 | 时间 | 输出可见 |
|------|------|---------|
| A. 仓库准备 | 0.5h | 装好依赖，目录骨架 |
| B. 截图采集 | 3h | `cache/shots/*.webp` 14 张 |
| C. Renderer | 3h | Vite dev 下能看 14 节点 + Figma 风格 |
| D. 构建 + 验证 | 1.5h | `dist/CrediOS-UIFlow-*.html` 双击可看 |
| **合计** | **8h** | 单 HTML 评审稿 |

---

## 6. 待用户拍板（开工前必须确认）

1. **MVP 范围**：砍 B1–B4 dialogs + CLI 抽象 + TypeScript 是否同意？
2. **泳道色块策略**：NTC = cream / ETC = lilac / 共享 = canvas，是否符合预期？或换其他色？
3. **执行节奏**：拍板后我按 Phase A → D 顺序开工，每完成一个 Phase commit + 简报你一次（不需要每步征求确认）？

---

## 7. 用户日常使用流程（MVP 成形后）

```bash
# 前置：CrediOS dev server 已跑在 :3000（git status 应为 clean）

# 跑 Flowshot 流程
cd ~/Work-space/Flowshot
node examples/crediOS/capture.mjs   # 采集 14 张截图 (~2min)
node examples/crediOS/build.mjs     # 构建单 HTML (~10s)

# 双击交付物
open dist/CrediOS-UIFlow-NTC+ETC-<sha>.html
```

---

## 8. MVP 之后

V1.1 候选（按优先级）：
- 补 B1–B4 dialog 截图（截图前 click 触发）
- Safari / Firefox 多浏览器验证
- 抽出 `flowshot.config` schema，从 `examples/crediOS/capture.mjs` 反推契约
- TypeScript 重写 `src/renderer/`

V2 候选：
- 抽 `flowshot` CLI（`capture` / `build` 命令）
- 发布 npm 包（名字策略见产品方案 §5.2）
- `flowshot init` 脚手架
- `examples/demo-site/`（最小可跑示例）
