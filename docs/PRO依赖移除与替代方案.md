# PRO 依赖移除与替代方案（安全落地）

> 目标：在不引入安全回退（例如放开 Electron 权限、弱化 CSP、暴露过宽 IPC）的前提下，彻底移除对 `@tagspacespro/*` 的依赖，同时用非 PRO（本地/开源）方式补齐必要能力，并确保每一步可编译、可回滚。

---

## 总体策略

分两段走：
1) **先移除依赖面**：构建/脚本/打包链路不再引用 `@tagspacespro/*`，UI 不再出现 ProTeaser/Pro upsell。
2) **再补齐替代能力**：Bookmarks / WorkSpaces / Templates / AI 模板（如果保留 AI）全部使用本地存储实现最小可用。

---

## 已确认的 PRO 依赖点（仓库内可定位）

- `@tagspacespro/tagspacespro`：原先通过 `src/renderer/pro/index.ts` 运行时 require 注入 `Pro`，并在 `Root.tsx` 挂载 Pro-only provider 栈。
- `@tagspacespro/extensions`：原先被 `scripts/generateExtensionsConfig.ts` 与主进程扩展扫描纳入候选包列表。
- ProTeaser：多处 UI/对话框用于 Pro 引导（Teaser Banner / Teaser Dialog / Slides / ContextProvider）。

---

## 安全移除（按 PR 拆分的建议步骤）

### PR-1：移除构建与扩展的 PRO 依赖（无 UI 行为变更）

- `package.json`：移除 `optionalDependencies.@tagspacespro/tagspacespro`；将 `*-pro` 相关脚本替换为明确的“已移除”提示。
- `release/app/package.json`：移除 `optionalDependencies.@tagspacespro/extensions`。
- `scripts/generateExtensionsConfig.ts`：不再扫描 `@tagspacespro/extensions`。
- 主进程扩展扫描：仅保留 `@tagspaces/extensions`。

### PR-2：移除 ProTeaser / Pro upsell（UI 行为变更：不再提示 Pro）

- 删除 ProTeaser 相关组件、hook、dialog、slides。
- 清理调用点：原先 `openProTeaserDialog(...)` 的路径改为静默降级或提示“不可用”。

### PR-3：用本地存储实现替代 provider（功能补齐）

- `BookmarksContextProvider`：localStorage 版本（可后续迁移到用户配置目录 JSON）
- `WorkSpacesContextProvider`：localStorage 版本（MVP：CRUD + 当前工作区）
- `FileTemplatesContextProvider`：localStorage 版本（管理模板 + 当前激活模板）
- `AiTemplatesContextProvider`：localStorage 版本（prompt 模板存取）

---

## 回滚策略

每个 PR 都保证：
- `npm install`、`npm run type-check`、`npm run build` 可通过
- 若回滚某个 PR，不影响后续 PR 的编译（必要时通过 feature flag / fallback 保持兼容）

