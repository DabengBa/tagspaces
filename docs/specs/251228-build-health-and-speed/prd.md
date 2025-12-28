# 构建可用性与构建速度诊断（Build Health & Speed）- PRD

> **一句话总结**：提供一套“可重复、可解释、可落地”的构建验证与构建耗时诊断流程，并修复当前 Windows 环境下阻塞构建的脚本问题，确保 `npm run build` 可稳定跑通且能定位主要耗时来源。

## 1. 目标与价值 (Goal & Value)

- **要解决的问题 (Problem)**：
  - 当前仓库在 Windows 上执行构建链路时，可能会出现递归 `postinstall` 触发、以及 `EPERM rename`（npm 临时目录写在盘根目录导致权限/杀软/占用冲突）的不稳定失败，导致 `prebuild/build` 无法稳定跑通。
  - 构建速度缺少可量化的基线与定位手段，尤其是 renderer 产物构建耗时较长时难以定位瓶颈点（resolve / ts-loader / css pipeline 等）。

- **期望的结果 (Goal)**：
  - 在 Windows 环境下，`npm run prebuild` / `npm run build` 可稳定成功（无需人工干预）。
  - 明确构建速度基线，并能用统一手段输出可比对的耗时数据，给出可执行的优化方向与下一步实验建议。

## 2. 功能范围 (Scope)

### 本次必须包含

1. **修复构建阻塞点（Windows）**
   - `release/app` 子工程依赖安装时不再递归触发根项目 `postinstall`（避免“自己调用自己”的循环）。
   - `install-ext-node-check` 在 Windows 上执行 `npm run install-ext-node` 时，npm 临时目录与缓存目录落在项目内可控路径（避免写到 `E:\` 盘根目录的随机临时文件夹名引发 `EPERM rename`）。

2. **最小化构建验证流程**
   - 给出一套不“上来就全量构建”的验证顺序：先 `prebuild`（依赖/扩展准备）再分步 `build:main`、`build:renderer`，最后 `build`。

3. **构建耗时基线与瓶颈初判**
   - 记录一次在当前机器上的耗时基线（以秒为单位）。
   - 给出导致 renderer 慢的主要阶段线索（resolve、ts-loader 编译、css pipeline）。

### 本次明确不包含

- 大规模重构 webpack 配置、替换 bundler（如 Vite/RSBuild/Rspack）。
- 对所有依赖进行升级/安全修复（如 `npm audit fix`）。
- 需要管理员权限的系统级配置（例如修改 Defender 排除项）。

## 3. 验收标准 (Acceptance Criteria)

- **AC1：构建链路可用**
  - 在 Windows 上执行 `npm run prebuild` 返回码为 0。
  - 在 Windows 上执行 `npm run build` 返回码为 0。

- **AC2：不再递归 postinstall**
  - `release/app` 依赖安装不会触发根项目的 `postinstall`（不应看到 electron-builder / build:dll 被 `release/app` 的 `npm install` 间接触发）。

- **AC3：规避 EPERM rename（临时目录）**
  - `install-ext-node-check`/`checkWSinstalled.js` 执行期间，npm 临时目录写入路径为项目内，例如 `tagspaces/.tmp/npm`，不应出现写入 `E:\.<random>` 的临时目录行为。

- **AC4：构建耗时可量化**
  - 提供至少一组可重复执行的测速命令与输出格式（例如 `Measure-Command`），可用于后续对比优化效果。

## 4. 关键约束与依赖 (Constraints & Dependencies)

- **技术约束**
  - 项目构建体系为 Electron + React，Webpack 配置位于 `.erb/configs/*`，构建脚本通过 `package.json` scripts 驱动。
  - 当前环境为 Windows；shell 为 PowerShell。

- **外部依赖**
  - npm / node 版本会影响行为（例如 npm 的 bin 解析、脚本执行语义、临时目录策略）。
  - 杀毒软件/文件系统占用可能导致 `EPERM rename`（非代码层可完全控制）。

## 5. 设计原则约束 (Design Principles Constraints)

必须遵循以下优先级顺序：

1. **可维护性**
   - 修复应优先通过“脚本边界清晰化”实现：避免隐式递归（postinstall 自触发）与不可控的临时目录副作用。
2. **可测试性**
   - 验证流程拆分为可独立执行的步骤（prebuild、build:main、build:renderer），每一步可单独复现与定位。
3. **可读性**
   - 采用最少的脚本改动即可解释原因与结果；命令建议直接可复制运行。
4. **复用性**
   - 将诊断与基线测量写入文档，后续 PR/CI 可复用同一套流程对比。

---

## 6. 当前现状与已复现问题（基于 2025-12-28 本机验证）

### 6.1 关键构建命令链

- `npm run build`
  - `npm run prebuild`
  - 并行：`npm run build:main` + `npm run build:renderer`
  - `node -r ts-node/register ./.erb/scripts/link-modules.ts`

- `npm run prebuild`
  - `rimraf release/app/dist`
  - `npm run prepare-node`
  - `npm run generate-extensions`

- `npm run prepare-node`
  - `npm run install-ext-node-check`
  - `npm run postinstall-node-check`
  - `npm run postinstall-electron-check`

### 6.2 失败原因（未修复前）

1. **递归 postinstall**
   - `install-ext-node` 会 `cd release/app && npm install`。
   - `release/app/package.json` 依赖里包含 `tagspaces: file:../..`，导致在 `release/app` 安装过程中触发根项目的生命周期脚本（包含 `postinstall`），从而出现“安装依赖时又触发构建/prepare-node”的递归行为，最终导致失败或极慢。

2. **Windows 下 EPERM rename / 临时目录落盘根**
   - npm 在解包/重命名目录时会创建临时目录（曾出现形如 `E:\.lib.<random>` / `E:\.components.<random>`）。
   - 在 Windows 上该类 rename 容易被文件占用/权限/杀软拦截触发 `EPERM: operation not permitted, rename ...`，从而打断 `install-ext-node-check` 与后续 build 链路。

---

## 7. 解决方案（已落地）

### 7.1 方案 A（已实现）：避免递归 + 控制 npm tmp/cache

1. **避免递归 postinstall**
   - 在 `install-ext-node` 中使用 `npm --prefix ./release/app install --ignore-scripts`，阻断 `release/app` 安装阶段触发根项目 `postinstall` 的风险。

2. **控制 npm 临时目录与缓存目录（Windows）**
   - 在 `scripts/checkWSinstalled.js` 中执行 `install-ext-node` 时，通过 `child_process.execSync(..., { env })` 注入：
     - `npm_config_tmp=<repo>/.tmp/npm`
     - `npm_config_cache=<repo>/.tmp/npm/cache`
   - 使 npm 临时文件与缓存落在仓库内受控位置，降低落到盘根目录导致的 `EPERM rename` 概率。

---

## 8. 构建速度基线与瓶颈初判

### 8.1 基线（单机样本）

- `build:main`：约 **15s**
- `build:renderer`：约 **186~203s**
- `build`（含 prebuild + main/renderer + link-modules）：约 **245s**

> 结论：**renderer 构建是主要耗时来源**，量级上远高于 main。

### 8.2 初步瓶颈线索（来自 `--profile` logging）

- resolve 新模块阶段约 **30s**
- build modules 阶段约 **57s**（其中大量模块由 `ts-loader` 处理；同时存在 css/sass pipeline）

### 8.3 下一步可执行的优化实验（建议）

按“风险低→收益不确定→成本高”的顺序：

1. **开发机/CI 层面**
   - 将仓库目录加入 Defender 排除（若允许），降低 `EPERM` 与 IO 抖动风险。
   - 确保 Node 版本与 `package.json#engines.node` 一致（当前 engines 指向 `24.12.0`），降低工具链差异引发的不可预期行为。

2. **Webpack/TS 层面（较低侵入）**
   - 检查 `ts-loader` 是否启用 `transpileOnly` / 配合 `fork-ts-checker-webpack-plugin`（若现有项目允许），将类型检查从构建热路径移出。
   - 评估 `devtool: 'source-map'` 在 production 下的成本（source-map 生成会明显拖慢），可通过开关或按渠道生成。

3. **进一步剖析**
   - 使用 `webpack-bundle-analyzer`（`ANALYZE=true`）生成可视化报告；在 Windows 上注意端口占用（默认 `8889`）。

---

## 9. 验证/执行指南（给使用者）

### 9.1 构建是否能跑通（推荐顺序）

1. `npm run prebuild`
2. `npm run build:main`
3. `npm run build:renderer`
4. `npm run build`

### 9.2 构建测速（PowerShell）

- `Measure-Command { npm run -s build:main }`
- `Measure-Command { npm run -s build:renderer }`
- `Measure-Command { npm run -s build }`

### 9.3 如果你“能看到页面显示正常”

这表示 bundle/renderer 构建产物已能加载，下一步建议做：

- 记录一次“干净构建”（清理产物后）与“一次增量构建”的耗时对比。
- 如果要做 analyzer：
  - 确认 `127.0.0.1:8889` 未被占用，再执行 `ANALYZE=true npm run -s build:renderer`。

