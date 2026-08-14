# 项目分析与改动定位指南

本文档用于后续需求变更前快速定位文件。改代码前先看这里，确认前端页面、状态、IPC、数据库、AI 调用分别落在哪里；改完后同步更新根目录 `CHANGELOG.md`。

## 项目概览

- 项目名称：`JobRadar`
- 产品形态：大学生 AI 求职辅助桌面应用
- 技术栈：Electron 33、React 19、TypeScript、Mantine 7、Zustand、sql.js、electron-store、OpenAI 兼容 API
- 路由方式：前端使用 `HashRouter`
- 本地数据：sql.js SQLite 文件，运行时保存到 Electron `app.getPath('userData')/career-assistant.db`
- 敏感配置：AI Provider 和 API Key 通过 `electron-store` 加密存储，入口在 `electron/main/ipc/settings.ts`

## 先看哪里

| 需求类型                           | 优先阅读文件                                                               |
| ---------------------------------- | -------------------------------------------------------------------------- |
| 页面、导航、路由变化               | `src/App.tsx`                                                              |
| React 入口、全局错误展示           | `src/main.tsx`                                                             |
| 桌面窗口、菜单、主进程启动         | `electron/main/index.ts`                                                   |
| 前端可调用的后端 API               | `electron/preload/index.ts`                                                |
| IPC 后端实现                       | `electron/main/ipc/*.ts`                                                   |
| Zustand 状态与前后端同步           | `src/stores/*.ts`                                                          |
| 业务类型定义                       | `src/types/*.ts`                                                           |
| 数据库表、持久化、SQL 工具         | `electron/main/db/index.ts`                                                |
| AI Provider、模型调用、Prompt 组装 | `electron/main/ipc/ai.ts`、`src/services/ai/*.ts`、`public/prompts/*.json` |
| 构建、打包、依赖                   | `package.json`、`electron.vite.config.ts`、`.github/workflows/build.yml`   |
| 用户文档                           | `README.md`、`GETTING_STARTED.md`、`docs/*.md`                             |

## 架构主链路

```text
React 页面组件
  -> Zustand store
  -> window.electronAPI
  -> electron/preload/index.ts
  -> electron/main/ipc/*.ts
  -> electron/main/db/index.ts 或 electron-store 或 AI API
```

新增功能时通常要按这条链路检查：

1. `src/App.tsx` 是否需要新增导航或路由。
2. `src/components/<feature>/` 是否已有对应页面组件。
3. `src/stores/` 是否已有状态管理和 `loadFromBackend`。
4. `electron/preload/index.ts` 是否暴露了新的 `electronAPI` 方法。
5. `electron/main/ipc/<feature>.ts` 是否注册了对应 `ipcMain.handle`。
6. `electron/main/index.ts` 是否注册了新的 IPC handler。
7. 数据结构变化是否需要更新 `src/types` 和数据库表。

## 目录职责

| 路径                                       | 职责                                       |
| ------------------------------------------ | ------------------------------------------ |
| `src/components/`                          | 前端页面与 UI 组件，按业务模块拆分         |
| `src/components/common/`                   | 通用组件，如免责声明、AI 活动日志、基础 UI |
| `src/stores/`                              | Zustand store，负责页面状态与后端同步      |
| `src/services/ai/`                         | 前端侧 AI 评估/适配逻辑                    |
| `src/types/`                               | 共享 TypeScript 类型                       |
| `src/constants/`                           | 静态常量                                   |
| `electron/main/`                           | Electron 主进程、窗口、菜单、数据库、IPC   |
| `electron/main/ipc/`                       | 业务后端接口，每个模块一个文件             |
| `electron/main/db/`                        | sql.js 初始化、schema、SQL 查询工具        |
| `electron/preload/`                        | 安全桥接层，只暴露白名单 API 给前端        |
| `public/prompts/`                          | AI Prompt 模板                             |
| `public/crawler-examples/`                 | 数据源/爬虫导入示例                        |
| `docs/`                                    | 开发和使用文档                             |
| `dist-electron/`、`dist_electron/`、`out/` | 构建产物，通常不要手改                     |

## 功能定位表

| 功能              | 前端组件                                                                     | Store                              | IPC / 后端                                                                             | 数据表或配置                                                  |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| AI 全自动流程     | `src/components/autopilot/AutoPilot.tsx`、`src/App.tsx` 的 `AutoPilotBanner` | `src/stores/useAutoPilotStore.ts`  | 复用 `ai.ts`、`crawler.ts`、`evaluation.ts`、`tracker.ts`、`resume.ts`、`interview.ts` | 多张业务表                                                    |
| 个人资料          | `src/components/assessment/SelfIntro.tsx`                                    | `src/stores/useUserStore.ts`       | `electron/main/ipc/user.ts`                                                            | `user_profiles`                                               |
| 简历上传与解析    | `src/components/assessment/ResumeUpload.tsx`                                 | `src/stores/useUserStore.ts`       | `electron/main/ipc/user.ts`、`electron/main/ipc/ai.ts`                                 | `resumes`                                                     |
| 个人评估          | `src/components/assessment/*.tsx`                                            | `src/stores/useAssessmentStore.ts` | `electron/main/ipc/assessment.ts`                                                      | `assessment_results`                                          |
| 职位获取          | `src/components/recommendation/JobDiscovery.tsx`                             | 组件内状态为主                     | `electron/main/ipc/crawler.ts`、`electron/main/ipc/ai.ts`                              | `job_listings`、`search_sources`                              |
| 职位扫描          | `src/components/scan/JobScanManager.tsx`                                     | `src/stores/useJobScanStore.ts`    | `electron/main/ipc/scan.ts`                                                            | `scan_configs`、`job_listings`                                |
| 企业管理/评估     | `src/components/company/*.tsx`                                               | `src/stores/useCompanyStore.ts`    | `electron/main/ipc/company.ts`、`electron/main/ipc/ai.ts`                              | `companies`                                                   |
| 智能推荐/职业路径 | `src/components/recommendation/*.tsx`                                        | `src/stores/useEvaluationStore.ts` | `electron/main/ipc/evaluation.ts`、`electron/main/ipc/ai.ts`                           | `recommendations`、`evaluation_results`、`evaluation_weights` |
| 投递跟踪          | `src/components/tracker/*.tsx`                                               | `src/stores/useTrackerStore.ts`    | `electron/main/ipc/tracker.ts`                                                         | `application_tracker`                                         |
| 简历生成          | `src/components/resume/ResumeGenerator.tsx`                                  | `src/stores/useResumeStore.ts`     | `electron/main/ipc/resume.ts`、`electron/main/ipc/ai.ts`                               | `resume_templates`、`generated_resumes`                       |
| 面试准备          | `src/components/interview/InterviewPrep.tsx`                                 | `src/stores/useInterviewStore.ts`  | `electron/main/ipc/interview.ts`、`electron/main/ipc/ai.ts`                            | `interview_stories`、`interview_questions`                    |
| AI 配置           | `src/components/settings/ApiKeySettings.tsx`                                 | 组件内状态为主                     | `electron/main/ipc/settings.ts`、`electron/main/ipc/ai.ts`                             | `electron-store` 的 `settings`                                |
| 数据源管理        | `src/components/settings/DataSourceManager.tsx`                              | 组件内状态为主                     | `electron/main/ipc/crawler.ts`                                                         | `search_sources`、`data_sources`                              |
| 数据备份          | `src/components/settings/DataBackup.tsx`                                     | 组件内状态为主                     | `electron/main/ipc/backup.ts`                                                          | 多张业务表                                                    |

## 数据库注意事项

- 当前运行时 schema 的真实来源是 `electron/main/db/index.ts` 内的 `SCHEMA_SQL`。
- `electron/main/db/schema.sql` 只包含早期表，不覆盖 `scan_configs`、`application_tracker`、`evaluation_results`、`resume_templates` 等后续表；改 schema 前先确认是否需要同步它。
- 数据库公共工具在 `electron/main/db/index.ts`：
  - `queryAll`
  - `queryOne`
  - `executeRun`
  - `runInTransaction`
  - `safeJsonParse`
- 修改公共表结构、迁移策略、字段含义前必须先确认需求影响范围。

## IPC 与安全边界

- 前端不直接访问 Node/Electron 能力，只能通过 `window.electronAPI`。
- 新增后端能力时要同时更新：
  - `electron/preload/index.ts` 的 `ElectronAPI` 类型和 `electronAPI` 实现。
  - `electron/main/ipc/<feature>.ts` 的 `ipcMain.handle`。
  - `electron/main/index.ts` 的 handler 注册。
- API Key 不要写入日志。AI 错误处理已在 `electron/main/ipc/ai.ts` 做脱敏，后续新增日志也要保持这个原则。
- `settings:export` 会导出 settings 内容，涉及敏感字段时要特别检查导出场景。

## 现有质量风险

- 多个源文件已超过当前代码标准建议行数，例如 `InterviewPrep.tsx`、`JobScanManager.tsx`、`electron/main/db/index.ts`、`JobDiscovery.tsx`、`AIServiceAdapter.ts` 等。后续碰到这些文件时优先局部整理，不为无关需求做大重构。
- `electron/main/db/schema.sql` 与 `electron/main/db/index.ts` 的内联 schema 不一致，容易误导数据库改动。
- 部分组件承担了页面、业务编排、数据处理多重职责。新增功能时优先复用现有 store/IPC，避免再把共享逻辑堆进大组件。

## 变更流程

每次有新需求或优化时，按这个最短流程走：

1. 先读本文档，按“功能定位表”找到相关文件。
2. 再读实际代码，确认当前数据流和调用链。
3. 若涉及 UI，检查 `src/App.tsx` 的路由/导航和对应组件。
4. 若涉及持久化，检查 `src/stores`、`electron/preload`、`electron/main/ipc`、`electron/main/db/index.ts`。
5. 若涉及 AI，检查 `electron/main/ipc/ai.ts`、`src/services/ai`、`public/prompts`。
6. 改完运行 `pnpm typecheck`、`pnpm test` 和 `pnpm build`。
7. 在根目录 `CHANGELOG.md` 的 `Unreleased` 下记录本次优化、修复或文档变更。
