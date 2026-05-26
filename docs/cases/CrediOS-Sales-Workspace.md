# Sales Workspace UI Flow 方案（NTC + ETC 主线）

> 版本：v0.6  
> 日期：2026-05-26  
> 负责人：前端  
> 状态：待启动 Spike  
> 变更历史：  
> - v0.1 — 初稿  
> - v0.2 — 范围收敛、剔除 W3 redirect、zip 自包含、Spike 扩至 7 stage、新增 seed 工具、新增 §8 版本与可追溯  
> - v0.3 — ETC 路径并入 Phase 1，节点数 16 → 18，Spike S1 stage 数 7 → 9  
> - v0.4 — **seed 策略改为 Playwright 写 localStorage**（草稿存储在浏览器端，非服务端 repository）、补 DE2 解锁键 / FINAL_SUBMITTED 独立 seed、修正 §2 节点计数、所有版本号示例升至 v0.3.0、SHA 标注为 placeholder  
> - v0.5 — fixture 计数统一为 10（IDENTITY 1 + NTC 6 + ETC 2 + FINAL 1）、备选方案 B 改用真实 `saveDraft()` API、Phase 1 产出更名为 `fixtures/*.json` + `screenshot.mjs`、tagUrl 加 `%2F` 编码、采集前置条件加入 §9  
> - v0.6 — **画布引擎换为 React Flow（`@xyflow/react`）+ Vite + `vite-plugin-singlefile`**，废弃 panzoom + 手写 SVG；Spike S3（panzoom）作废，**S5（Vite + React Flow + 单文件 + `file://`）已验证通过**，详见 `01.Spike S5 报告.md`

---

## 1. 背景与目标

### 1.1 背景
项目进入客户评审阶段，需要把 Sales Workspace 的关键页面与跳转关系，以传统设计师的 **UI Flow（流程视图）** 形式呈现给客户。客户在该视图上确认主流程后签字定版，开发严格按定版执行。

### 1.2 目标
- 一张可平移、可缩放的 **单页 HTML**，覆盖 Sales Officer 的 **NTC + ETC 两条主线** 全流程
- 节点 = 页面缩略截图 + 标签 + 简短说明；点击 → lightbox 显示 1280px 高清原图
- 连线 = 触发动作 + 条件分支文案
- **zip 自包含**：客户解压后双击 `index.html` 即可，无需任何网络/构建
- 内嵌**可追溯的版本元数据**（UI Flow 自身版本 + 锁定的 CrediOS commit + 截图时间 + GitHub 链接），详见 §8

### 1.3 非目标（明确不做）
- ❌ 不含 CED / Backup Officer / Error Exception 等其他角色视图
- ❌ 不含 Parameter Management（独立模块，后续单独出 flow）
- ❌ 不含字段级细节、校验规则、状态机内部转换
- ❌ 不做移动端适配（项目本身桌面 only）
- ❌ 不实现在线评论 / 协作功能（截图 + 静态签署足够定版）
- ❌ **不实现签署功能**（不放签字区、不做电子签）。客户的"确认定版"通过邮件回复 / 内部工单完成；UI Flow 自身只负责**显示版本号**让定版可追溯

---

## 2. 范围：Sales Officer NTC + ETC 主线节点清单

按业务流程线性铺开，分支用支路标注。**节点数预估 14 主节点 + 4 支路 = 18 张截图。**

> NTC（New to Credit Card）与 ETC（Existing to Credit Card）共享 W1/W2 入口、A1 Identity Scope、A8 Final Submitted、A9 Review、A10 Edit；ETC 在 A1 后分叉走 E1/E2 两个独立 stage，跑完直接进 A8。

> ⚠️ `/applications/new` 是纯 redirect 路由（见 `src/app/sales-workspace/applications/new/page.tsx`），**没有 UI**。"新建申请" 在本 flow 中表现为 Workbench 工具栏的 **CTA 按钮**（W1 截图中已包含），点击后直接跳到 A1。**不单独立节点**。

### 2.1 Workbench 入口（2 个节点）
| # | 节点 | 路由 / 触发 | 说明 |
|---|------|------------|------|
| W1 | Data Entry Workbench | `/sales-workspace`（默认 Tab） | 待办列表 + "New Application" CTA |
| W2 | Application Inquiry | Tab 切换 | 申请检索面板 |

### 2.2 Application 共享节点（4 个）
| # | 节点 | Stage / 路由 | 说明 |
|---|------|------|------|
| A1 | Identity Scope | `IDENTITY_SCOPE` | 身份识别，NTC/ETC 在此分叉 |
| A8 | Final Submitted (终态) | `FINAL_SUBMITTED` | 最终提交完成（NTC + ETC 共用） |
| A9 | Review 页 | `/applications/[id]/review` | 申请评审视图 |
| A10 | Edit 页 | `/applications/[id]/edit` | 申请编辑视图 |

### 2.3 NTC 主线（6 个节点）
| # | 节点 | Stage | 说明 |
|---|------|-------|------|
| N1 | NTC DE1 Entry | `NTC_DE1_ENTRY` | DE1 表单录入主屏 |
| N2 | NTC DE1 Dual Entry | `NTC_DE1_DUAL_ENTRY` | DE1 盲录验证 |
| N3 | NTC AIP Pending Review | `NTC_AIP_PENDING_REVIEW` | 等待审核状态屏 |
| N4 | NTC AIP Rejected (终态) | `NTC_AIP_REJECTED_FINAL` | AIP 驳回终态 |
| N5 | NTC DE2 Entry | `NTC_DE2_ENTRY` | DE2 补录 |
| N6 | NTC DE2 Dual Entry | `NTC_DE2_DUAL_ENTRY` | DE2 盲录验证 |

> AIP "通过" 无独立屏：N3 审批通过后**直接跳 N5 DE2 Entry**；只保留 N3 Pending 与 N4 Rejected 两个真实状态。

### 2.4 ETC 主线（2 个节点）
| # | 节点 | Stage | 说明 |
|---|------|-------|------|
| E1 | ETC DE1 Entry | `ETC_DE1_ENTRY` | ETC DE1 表单录入主屏 |
| E2 | ETC DE1 Dual Entry | `ETC_DE1_DUAL_ENTRY` | ETC DE1 盲录验证 |

> ETC 跑完 E2 直接进 A8 Final Submitted，无 AIP / DE2 流程。

### 2.5 关键支路（4 个节点）
| # | 节点 | 触发 | 说明 |
|---|------|------|------|
| B1 | Cancel Reason Dialog | N1/N5/E1 工具栏取消 | 取消申请确认弹窗 |
| B2 | Appeal Reason Dialog | N4 申诉按钮 | 申诉理由弹窗 |
| B3 | Document Upload Side Panel | N1/N5/E1 文档区 | 文档上传侧栏 |
| B4 | Memo Panel | 任意阶段右上 Memo | Memo 录入弹窗 |

### 2.6 主要跳转关系（草图）

```
W1 Workbench ──[New Application CTA]──→ A1 Identity Scope
                                              │
                              ┌───────────────┴───────────────┐
                          NTC │                               │ ETC
                              ▼                               ▼
                         N1 DE1 Entry                    E1 DE1 Entry
                              │                               │
                              ▼                               ▼
                       N2 DE1 Dual Entry                E2 DE1 Dual Entry
                              │ 提交                          │ 提交
                              ▼                               │
                       N3 AIP Pending                         │
                       ┌──────┴──────┐                        │
                    驳回│           通过│（无独立屏）            │
                       ▼              ▼                       │
                  N4 Rejected    N5 DE2 Entry                 │
                                      │                       │
                                      ▼                       │
                              N6 DE2 Dual Entry               │
                                      │ 提交                  │
                                      └──────────┬────────────┘
                                                 ▼
                                          A8 Final Submitted

W1 ──→ A9 Review（点列表已审核）
W1 ──→ A10 Edit（点列表可编辑）
W2 Inquiry ──→ A9 Review
```

---

## 3. 技术方案

### 3.1 整体架构（Vite 单文件构建）

**源码工程结构**（仓内 `ui-flow/` 目录，由 Vite 构建）：
```
ui-flow/
  ├── src/
  │   ├── main.tsx              # 入口
  │   ├── FlowCanvas.tsx        # React Flow 容器 + 节点/边数据
  │   ├── nodes/ScreenNode.tsx  # 主流程节点（含 Handle + 截图）
  │   ├── nodes/SupportNode.tsx # 支路弹窗节点
  │   ├── VersionBadge.tsx      # 右上角版本徽章
  │   ├── Lightbox.tsx          # `<dialog>` 实现的高清图弹层
  │   └── flow-data.ts          # 18 节点 + 边数据
  ├── public/
  │   └── assets/full/*.webp    # 高清图（构建时 base64 内联到 HTML）
  ├── manifest.json             # 由 build-manifest.ts 生成，构建时注入
  ├── index.html                # Vite 入口模板
  ├── vite.config.ts            # plugin-react + viteSingleFile + 资源内联策略
  └── README.md                 # 开发说明
```

**构建产物**（交付给客户的 zip）：
```
ui-flow-<VERSION>.zip
  └── index.html                # 单文件：JS + CSS + 数据 + 图片 全部 base64/inline
```

**自包含原则**（已由 Spike S5 验证）：
- ❌ 不引用任何 CDN
- ❌ 不依赖 `fetch()`（`file://` 协议下会触发 CORS）
- ✅ `vite-plugin-singlefile` 把 JS/CSS 全部内联到 `index.html`
- ✅ React Flow 节点用 `<img src="data:image/webp;base64,...">` 内联截图，避免外部文件
- ✅ manifest.json 内容以 `<script type="application/json" id="uiflow-manifest">` 内联

> 实测（Spike S5）：4 节点 + 3 边 + Background + Controls + MiniMap，单 HTML 337KB / gzip 107KB；18 节点 + 18 张 WebP（每张约 200KB）内联后预估单文件 4–5MB，可通过邮件附件传递。

### 3.2 技术选型
| 模块 | 选型 | 理由 |
|------|------|------|
| 画布 + 节点 + 边 + 平移缩放 + MiniMap | [`@xyflow/react`](https://reactflow.dev) (React Flow, MIT) | 边自动路由 + label 自动定位 + MiniMap + Controls 全套开箱即用；行业事实标准 |
| 框架 | React 18 + Vite 5 | 与 React Flow 配套；Vite 构建极快 |
| 单文件打包 | [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile) | JS/CSS 全部 inline 进单个 HTML，Spike S5 已验证 |
| Lightbox | 原生 `<dialog>` 元素 | 标准 API，零依赖 |
| 截图自动化 | Playwright | 项目已有 webapp-testing 经验；同 Spike S5 验证脚本 |
| 图片压缩 | `sharp` CLI 一次性脚本 | Node 原生，WebP 比 PNG 节省 60–70% |

**节点拖拽策略**：
- 开发时设 `nodesDraggable={true}`，手动调整 18 节点位置；导出坐标到 `flow-data.ts`
- 客户交付版设 `nodesDraggable={false}`，节点位置冻结，客户不会误操作

### 3.3 节点数据格式（`flow.json`）
```json
{
  "version": "uiflow-v0.3.0",
  "generatedAt": "<ISO_TIMESTAMP_PLACEHOLDER>",
  "nodes": [
    {
      "id": "W1",
      "title": "Data Entry Workbench",
      "stage": "workbench",
      "thumb": "assets/thumbs/W1.webp",
      "full": "assets/full/W1.webp",
      "x": 100, "y": 200,
      "desc": "待办列表 + New Application CTA"
    }
  ],
  "edges": [
    { "from": "W1", "to": "A1", "label": "New Application" },
    { "from": "A1", "to": "N1", "label": "NTC" },
    { "from": "A1", "to": "E1", "label": "ETC" },
    { "from": "N3", "to": "N4", "label": "驳回" },
    { "from": "N3", "to": "N5", "label": "通过" }
  ]
}
```

### 3.4 交互细节
- **画布**：React Flow `<ReactFlow fitView>`，初始自动 fit；含右下 MiniMap、左下 Controls（缩放/Fit/锁定）
- **节点卡片**：自定义 `ScreenNode`，约 240×180 px（缩略图 240×135 + 标题条 + Handle）
- **悬停**：节点高亮 + 显示完整描述 tooltip
- **点击**：弹出 lightbox 显示 1280px 全尺寸截图 + 标题 + ESC 关闭
- **顶部工具栏**：版本号徽章（点击展开元数据，详见 §8）；缩放/Fit 由 React Flow Controls 提供
- **键盘**：React Flow 内置 `+/-` 缩放、滚轮缩放、空格拖拽；`ESC` 关闭 lightbox（自写）

### 3.5 截图采集流程

> ⚠️ **关键事实**：草稿存储在 **浏览器 localStorage**（`src/lib/draft-local-store.ts` 首行 `"use client"`），**没有服务端 repository**。Node 脚本无法直接 import 该模块写盘，必须在浏览器上下文里落 key。
>
> ⚠️ **DE2 解锁键**：`NTC_DE2_ENTRY` 视图除草稿本身外，还要求 `localStorage["ntc-de2-entry:{draftId}"] === "1"`，否则被 "Enter DE2 from Workbench To-Do" 拦截页拦下（代码：`src/app/sales-workspace/applications/[id]/_components/application-client.tsx:839`）。
>
> ⚠️ **现状告警**：`draft-workbench-todo.ts` 当前仅 seed `NTC_DE2_ENTRY` 一种 stage，其余 8 个 stage 都没有现成入口。

**Seed 注入策略（候选方案，由 Spike S1 二选一）**：

| 方案 | 实现 | 优点 | 缺点 |
|------|------|------|------|
| **A. Playwright `addInitScript`**（推荐） | 截图脚本在每个 page 创建时注入 JS，直接 `localStorage.setItem("application_draft:<id>", JSON.stringify(draft))` + 同步更新 `application_drafts_index` + 写解锁键 | 不动生产代码、不需新增 dev API、所有 stage 一致处理 | 草稿对象 schema 需精确匹配 `ApplicationDraft` 类型；schema 漂移时需同步修订 fixture |
| **B. Dev-only seed 页面**（备选） | 新增 `src/app/_dev/ui-flow-seed/page.tsx`（"use client"），从 query string 读 stage，在客户端调用 `saveDraft(draft)` 后 redirect | 复用真实写入路径，避免手拼 schema | 引入 dev-only 页面，需保证生产构建剔除；多一次跳转 |

**采集流程（按方案 A）**：
1. 准备 fixtures：`scripts/ui-flow/fixtures/<stage>.json` — **10 份草稿**（IDENTITY_SCOPE 1 + NTC 6 + ETC 2 + FINAL_SUBMITTED 1），固定 ID 形如 `flow-IDENTITY`、`flow-NTC-DE1`、`flow-ETC-DE1-DUAL`、`flow-FINAL`
2. `pnpm dev` 启动本地服务（端口 3000）
3. Playwright 脚本（`scripts/ui-flow/screenshot.mjs`）：
   - 对每个截图任务：
     - `context.addInitScript()` 注入对应 fixture 到 `localStorage`
     - 额外写入 `application_drafts_index` 数组（保证 workbench 列表能枚举到）
     - 若是 `NTC_DE2_ENTRY`，额外写 `ntc-de2-entry:{id}` = `"1"`
     - 若是 `FINAL_SUBMITTED`，**独立 seed 一份草稿**（避免靠 UI 走完 N6 → A8 链路）
   - 跳路由 → 等待 hydration → `page.screenshot({ clip: { width: 1280, height: 800 } })`
   - 支路节点（B1–B4）追加 `page.locator(...).click()` 触发弹窗后再截
4. `sharp` 批处理：高清 WebP q=85（< 300KB）+ 缩略 WebP 400px 宽（< 30KB）
5. 输出到 `ui-flow/assets/`，连同 `index.html`、`README.txt`、`ui-flow-manifest.json` 一起打 zip

**Seed 渲染状态清单（10 份 fixture，全部独立 seed，不靠 UI 推进）**：

| Stage | 备注 |
|-------|------|
| `IDENTITY_SCOPE` | A1 |
| `NTC_DE1_ENTRY` | N1 |
| `NTC_DE1_DUAL_ENTRY` | N2 |
| `NTC_AIP_PENDING_REVIEW` | N3 |
| `NTC_AIP_REJECTED_FINAL` | N4，终态 |
| `NTC_DE2_ENTRY` | N5，**需同时写 DE2 解锁键** |
| `NTC_DE2_DUAL_ENTRY` | N6 |
| `ETC_DE1_ENTRY` | E1 |
| `ETC_DE1_DUAL_ENTRY` | E2 |
| `FINAL_SUBMITTED` | A8，**独立 seed**，不依赖 N6/E2 推进 |

> 注：FINAL_SUBMITTED 同时是 NTC 与 ETC 的终态，但作为独立 fixture 处理，避免自动化为一个终态屏跑完整链路。

---

## 4. Spike（技术验证）计划

### 4.1 需要 Spike 的关键不确定点
| Spike | 风险 | 验证目标 | 时间预算 |
|-------|------|---------|---------|
| **S1: localStorage seed 注入** | 🔴 高 | Playwright `addInitScript` 写入 fixture + `application_drafts_index` + DE2 解锁键后，**10 份 fixture（含 FINAL_SUBMITTED 独立 seed）** 能否通过固定 URL 完整渲染、不被任何拦截页拦下 | 2h |
| **S2: 截图自动化** | 🟡 中 | Playwright 稳定登录 + 等待 hydration + 截 1280×800 + 触发 dialog 类支路节点（覆盖 NTC + ETC + 共享 + 支路 = 18 张） | 2h |
| ~~S3: panzoom + SVG 连线~~ | — | **已废弃**（v0.6 改用 React Flow，问题不复存在） | — |
| **S4: 多浏览器 `file://` 兼容** | 🟢 低 | Spike S5 已在 Chromium 上跑通；S4 仅需补 Safari + Firefox 抽查 | 15min |
| **S5: Vite + React Flow + 单文件 + `file://`** | ✅ **已完成** | 4 节点 + 3 边 + MiniMap + Controls 全部渲染，单 HTML 337KB / gzip 107KB，零控制台错误 | — |

**不需要 spike 的项**：
- ✅ `<dialog>` lightbox 单元素行为（标准 API）
- ✅ WebP 压缩比（sharp 成熟）

### 4.2 Spike 产出
- `ui-flow/spike/` 子目录，包含：
  - `seed-stages.spike.mjs`：S1 — Playwright `addInitScript` 注入 fixture 验证（含 N5 解锁键 + A8 独立 seed）
  - `screenshot.spike.mjs`：S2 — 跑通代表节点：W1 + A1 + N3 + N4 + N6 + E2 + B1 dialog 共 7 张
  - `~~canvas.spike.html~~`：已被 S5 取代，详见 `01.Spike S5 报告.md`
- 每个 spike 产出 < 250 行代码
- **Spike 全部通过** → 进入 Phase 1；任一不通过 → 退回方案讨论备选（替代方案见 §6 风险表）

### 4.3 Spike 验收标准
| Spike | 通过标准 |
|-------|---------|
| S1 | **10 份 fixture（含 FINAL_SUBMITTED 独立 seed）** 均可通过 `addInitScript` 注入后，固定 URL 渲染完整页面、无空白、无报错；N5 不被 "Enter DE2 from Workbench To-Do" 拦截页拦下 |
| S2 | 自动化脚本一次跑通 7 张代表截图（覆盖 NTC + ETC + 共享 + 支路），分辨率 1280×800，单张高清 WebP < 300KB |
| ~~S3~~ | 已废弃 |
| S5 ✅ | 已通过：4 节点 + 3 边 + MiniMap + Controls，`file://` 协议加载，0 控制台错误（Chromium） |
| S4 | 把 spike 产出打成 zip，解压双击 `index.html` 在 Chrome/Edge/Safari 均可正常显示节点 + 点击放大 |

---

## 5. 实施阶段

| 阶段 | 产出 | 时间 |
|------|------|------|
| Phase 0 — Spike | ~~S3~~ 废弃；S5 ✅ 已通过；剩 S1/S2/S4 待跑 | 0.5 天 |
| Phase 1 — fixtures + 截图采集 | `scripts/ui-flow/fixtures/*.json`（10 份）+ `scripts/ui-flow/screenshot.mjs`（Playwright `addInitScript`）+ 18 张高清/缩略图 | 0.5–1 天 |
| Phase 2 — flow.json 编排 | 节点坐标（分叉布局）+ 连线 + 标签定稿 | 0.5 天 |
| Phase 3 — HTML 渲染器 | `index.html` zip 自包含完成 + 版本徽章 | 0.5 天 |
| Phase 4 — 内部走查 + 客户评审 | 走查 → 修订 → 邮件定版 | 1 天 |

**总计：3–3.5 天**（不含客户反馈往返时间）。ETC 并入后只增加 2 个 stage 截图 + 分叉布局，不显著拉长工期。

---

## 6. 风险与缓解

| 风险 | 等级 | 缓解 / 备选方案 |
|------|------|----------------|
| 草稿存 localStorage、Node 无法直写；某些 stage 还有解锁键 | 🔴 | 改用 Playwright `addInitScript` 在浏览器上下文写 fixture + 解锁键 + index（方案 A）；备选方案 B：dev-only seed 页面。Spike S1 二选一定稿 |
| 页面随后续开发变化，截图过时 | 🟡 | flow.json 内 `screenshotAt` 字段；定版后冻结；后续变更走变更单 |
| 客户要求添加/删除节点 | 🟢 | 数据驱动，改内联 JSON 即可，不动渲染器 |
| `file://` 协议下 CORS / 图片加载失败 | 🟡 | 全部内联 JSON + vendored 库；图片用相对路径 `<img>`（`<img src="">` 在 `file://` 是允许的，不受 CORS 限制）；Spike S4 验证 |
| 1280×800 PNG 普遍 > 300KB | 🟡 | 改用 WebP q=85，实测一般 80–200KB；硬阈值放宽到 PNG < 1MB / WebP < 300KB |
| 客户不知道当前看的是哪个版本 / 与代码对不上 | 🟡 | 双层版本号 + git tag 锁定 + 元数据徽章，详见 §8 |

---

## 7. 待客户确认事项

1. ✅ 范围：Sales Officer 主线（已确认）→ **NTC + ETC 并入 Phase 1 同步交付**
2. ✅ 保真度：真截屏（已确认）
3. ✅ 载体：单页 HTML + 平移缩放（已确认）→ 明确为 **zip 自包含**
4. ✅ 节点清单足够（已确认，后续按需补充）
5. ✅ 签署不做（已确认）→ 只显示版本号，方案见 §8
6. ✅ ETC 路径并入 Phase 1（已确认）

---

## 8. 版本与可追溯性

### 8.1 现状盘点
| 来源 | 当前值 | 用途 |
|------|--------|------|
| `package.json#version` | `1.0.0` | CrediOS 产品版本（手工维护） |
| Git tag | `v1.0.0` | 产品发布锚点 |
| `CHANGELOG.md` | `1.0.0 - 2026-03-08` | 产品功能变更记录 |
| HEAD commit | 采集时实测（如撰写本节时为 `2965929`，仅示例） | 截图时刻锚定 |
| GitHub 仓库 | `github.com/xazaj/CrediOS` | 唯一权威源 |

> ⚠️ 下文所有 commit SHA、时间戳均为示例 placeholder，正式 manifest 由 `build-manifest.ts` 在采集时自动写入。

### 8.2 设计原则
1. **UI Flow 文档版本** 与 **CrediOS 产品版本** 解耦 —— 同一个产品 commit 可能产出多次 UI Flow 评审稿
2. **客户拿到的每一份 zip** 都能在 30 秒内回答："这是哪个 commit 的截图？我能去 GitHub 看到当时的源码吗？"
3. 版本信息**强制内嵌**，不依赖外部文档；客户即使 6 个月后翻出旧 zip 仍可定位

### 8.3 双层版本号

```
┌──────────────────────────────────────────────────────────┐
│  UI Flow 文档版本：  uiflow-v0.3.0                        │
│  ─────────────────────────────────────                    │
│  CrediOS 产品快照（值均为示例 placeholder）：              │
│    • package.json   : 1.0.0                              │
│    • git commit     : <SHORT_SHA>                        │
│    • git ref        : ui-flow/v0.3.0  (annotated tag)    │
│    • commit time    : <ISO_COMMIT_TIME>                  │
│  截图采集时间    : <ISO_CAPTURED_AT>                      │
│  GitHub 链接     : https://github.com/xazaj/CrediOS/     │
│                    tree/<SHORT_SHA>                      │
└──────────────────────────────────────────────────────────┘
```

**第 1 层：UI Flow 文档版本（`uiflow-vX.Y.Z`）**
- 独立于产品版本，遵循 semver
- `X` 大改（节点结构性调整、范围扩展，如纳入 ETC）
- `Y` 小改（评审反馈后的节点增删、连线调整）
- `Z` 修订（仅改文案、坐标、版本元数据，截图不动）
- 当前：`uiflow-v0.3.0`（含 ETC 主线，已确认范围）；本方案文档自身用 `v0.4` 是文档修订号，与 UI Flow 产物版本号不耦合

**第 2 层：CrediOS 产品快照**
- 截图采集时**强制锁定** commit SHA
- 不允许在 dirty working tree 上采集（脚本检查 `git status --porcelain` 必须为空）
- 用 annotated git tag `ui-flow/v0.3.0` 在 GitHub 上永久锚定该 commit，5 年后客户翻出 zip 仍能 `git checkout ui-flow/v0.3.0` 还原截图时的代码

### 8.4 自动化采集机制

**新增脚本：`scripts/ui-flow/build-manifest.ts`**
- 在截图采集前自动执行：
  1. 检查 working tree 干净，否则报错
  2. 读 `package.json#version`
  3. `git rev-parse HEAD` → commit SHA
  4. `git rev-parse --short HEAD` → 短 SHA
  5. `git log -1 --format=%cI` → commit ISO 时间
  6. 读用户输入的 `uiflow-vX.Y.Z`（命令行参数）
  7. 拼装 `ui-flow-manifest.json` 写入 zip 根目录
- 同时打 git tag：`git tag -a ui-flow/v0.3.0 -m "UI Flow v0.3.0 截图基线"`（推送由人工执行，避免误发）

**manifest 格式（字段值均为 placeholder，正式版由脚本生成）**：
```json
{
  "uiFlowVersion": "v0.3.0",
  "productVersion": "1.0.0",
  "commit": "<SHORT_SHA>",
  "commitFull": "<FULL_SHA>",
  "commitTime": "<ISO_COMMIT_TIME>",
  "capturedAt": "<ISO_CAPTURED_AT>",
  "tag": "ui-flow/v0.3.0",
  "repo": "https://github.com/xazaj/CrediOS",
  "commitUrl": "https://github.com/xazaj/CrediOS/tree/<SHORT_SHA>",
  "tagUrl": "https://github.com/xazaj/CrediOS/releases/tag/ui-flow%2Fv0.3.0",
  "scope": "Sales Officer · NTC + ETC 主线",
  "nodeCount": 18
}
```

> `tag` 名含 `/`，作为 URL path 段必须 `encodeURIComponent` 成 `%2F`；否则 GitHub 会 404。UI 徽章里 **首选 commit URL**（一定可用），tag URL 作辅助链接。

manifest 同时以 `<script type="application/json" id="uiflow-manifest">` 内联进 `index.html`。

### 8.5 UI 呈现

**顶部工具栏右上角版本徽章**：
```
┌─────────────────────────────────────────────┐
│ Sales Workspace UI Flow                     │
│ [uiflow-v0.3.0 · CrediOS@<SHORT_SHA> ▾]    │  ← 点击展开
└─────────────────────────────────────────────┘
```

**点击展开 popover（值均为 placeholder）**：
```
UI Flow 版本     uiflow-v0.3.0
产品版本         CrediOS 1.0.0
源码 commit      <SHORT_SHA> (<ISO_COMMIT_TIME>)
截图采集         <ISO_CAPTURED_AT>
范围             Sales Officer · NTC + ETC 主线
节点数           18

[ 在 GitHub 查看 commit ↗ ]
[ 复制 manifest JSON ]
```

### 8.6 zip 文件命名约定

```
CrediOS-UIFlow-v0.3.0-NTC+ETC-<SHORT_SHA>.zip
       │       │       │       │
       │       │       │       └── 锁定的产品 commit 短 SHA（脚本自动填充）
       │       │       └────────── 范围标签
       │       └────────────────── UI Flow 文档版本
       └────────────────────────── 项目名
```

客户邮件主题模板：
> 【UI Flow 评审】CrediOS NTC + ETC 主线 - uiflow-v0.3.0（基于 CrediOS@&lt;SHORT_SHA&gt;）

### 8.7 版本变更场景

| 场景 | UI Flow 版本 | 是否重截图 | 是否打新 tag |
|------|-------------|----------|------------|
| 客户要求新增节点 | v0.3.0 → v0.4.0 | 是 | 是 |
| 客户要求调整连线文案 | v0.3.0 → v0.3.1 | 否 | 否（沿用旧 tag） |
| 产品代码改了字段，节点未变 | 不变 | 视情况补截 | 不变 |
| ETC 已并入 Phase 1（v0.3 起） | — | — | — |
| 客户最终签字定版 | v1.0.0 → v1.0.0-final | 否 | `ui-flow/v1.0.0-final` |

---

## 9. 后续步骤

0. **采集前置条件**：当前 worktree 不 clean（含未提交修改 + untracked），Spike 期间无所谓，但**正式 Phase 1 截图采集前**必须 stash / commit / 切净分支，让 `git status --porcelain` 为空，否则 manifest 里锁定的 commit 无法准确还原截图时的代码状态
1. **本方案评审通过** → 启动剩余 Spike S1/S2/S4（S5 已通过，S3 废弃）
2. Spike 结果回报后，决定是否进入 Phase 1
3. 每阶段产出在本目录同级追加进度文档：
   - `01.Spike 报告.md`
   - `02.节点截图清单.md`
   - `03.客户评审记录.md`
   - `04.版本变更记录.md`（记录每次 uiflow-vX.Y.Z 的截图基线）
