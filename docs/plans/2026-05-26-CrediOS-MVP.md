# CrediOS UI Flow MVP 开发计划

> 日期：2026-05-26
> 状态：待用户拍板 3 项决策后开工
> 目标：最快路径产出 CrediOS Sales Workspace UI Flow 单 HTML 评审稿
> 关联文档：
> - 产品方案 `docs/00.Flowshot 产品方案.md`
> - 案例 spec `docs/cases/CrediOS-Sales-Workspace.md`
> - 设计系统 `docs/figma-design.md`
> - Spike 报告 `docs/01.Spike S5 报告.md`

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

| 类别 | 节点 ID | 是否需要 seed | 说明 |
|------|---------|--------------|------|
| Workbench | W1, W2 | ❌ | 默认状态，无草稿 |
| 共享 | A1, A8, A9, A10 | ✅ 4 份 | Identity / Final / Review / Edit |
| NTC 主线 | N1, N2, N3, N4, N5, N6 | ✅ 6 份 | DE1 → AIP → DE2 全链路 |
| ETC 主线 | E1, E2 | ✅ 2 份 | DE1 + Dual Entry |

共 **12 份 seed fixture**（A9/A10 可复用 NTC/ETC 的现有草稿数据）。

节点拓扑见 `docs/cases/CrediOS-Sales-Workspace.md` §2.6。

---

## 2. 阶段拆解（总工期 ~8h）

### Phase A — 仓库准备（0.5h）

- 添加依赖：`playwright`（含浏览器二进制）、`sharp`、`@fontsource-variable/inter`、`@fontsource/geist-mono`
- 重构现有 `src/main.jsx`（Spike S5 4 节点 demo） → `src/renderer/` 目录
- 在 `examples/crediOS/` 下建脚本目录
- `.gitignore` 增加 `examples/crediOS/cache/`、`dist/`

### Phase B — 截图采集脚本（3h）

**文件**：`examples/crediOS/capture.mjs`

**功能流程**：
1. 从 CrediOS repo 读 git HEAD commit（要求 worktree clean）
2. 启动 Playwright（Chromium）
3. 对每个节点：
   - 新建独立 `BrowserContext`（隔离 storage）
   - `addInitScript` 注入对应 fixture 到 `localStorage`
   - 注入 CSS 禁用所有动画/过渡（产品方案 §3.6 item 6）
   - `goto(route)`，等待 `document.fonts.ready` + `networkidle`
   - 等待 500ms 兜底（CrediOS 没有 `data-flowshot-ready` 信号，MVP 不改）
   - `screenshot({ clip: { width: 1280, height: 800 } })` → PNG buffer
4. sharp 批转 webp：
   - 高清 q=85 → `cache/shots/full/<id>.webp`
   - 缩略 400px 宽 → `cache/shots/thumbs/<id>.webp`
5. 写 `cache/manifest.json`（节点元数据 + git commit + capture timestamp）

**硬编码内容**（MVP 不抽象）：
- `BASE_URL = 'http://localhost:3000'`
- `CREDIOS_REPO = '/Users/zhuaijun/Work-space/CrediOS'`
- 12 份 fixture（参考 CrediOS 案例 §3.5 + 读 `CrediOS/src/lib/draft-local-store.ts` 真实 schema）
- 14 个节点的 route 表 + seed 名映射

**前置假设（用户责任）**：
- 自己在另一个 terminal 跑 `cd ~/Work-space/CrediOS && pnpm dev`
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
# Terminal 1: 启动 CrediOS dev server
cd ~/Work-space/CrediOS
git status                       # 确认 clean
pnpm dev                         # 跑在 :3000

# Terminal 2: 跑 Flowshot 流程
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
