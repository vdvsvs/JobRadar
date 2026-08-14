# JobRadar

JobRadar 是一个本地优先的岗位雷达与 AI 求职助手桌面应用。项目将原 `career-assistant` 的求职全流程能力与 JobRadar 的渠道监控、清洗去重和匹配设计合并到同一个 Electron 应用中。

## 已合并功能

- 岗位获取：搜索 API、JSON/CSV 导入、内嵌招聘页面与视觉模型提取
- 岗位雷达：8 渠道预设、真实搜索源扫描、质量校验、跨批次去重和本地岗位库
- 自动监控：应用运行期间按每个渠道配置的间隔自动扫描，单渠道失败不中断其他渠道
- AI 匹配：简历解析、多维岗位评分、公司分析和推荐理由
- 求职工作流：个人评估、简历生成、面试准备、投递跟踪和安全自动投递
- 本地数据：sql.js SQLite 持久化、设置加密存储、数据导入导出

岗位雷达不会生成模拟岗位。使用扫描功能前，需要在“数据源管理”中配置 Bing、SerpAPI 或自定义搜索源。自动扫描只在 JobRadar 运行时执行；招聘网站登录和验证码由用户在内嵌浏览器中手动完成。

## 开发运行

要求 Node.js 20+ 和 pnpm 11+。

```powershell
pnpm install
pnpm dev
```

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Windows 打包：

```powershell
pnpm dist:win
```

## 项目结构

- `electron/`：主进程、IPC、sql.js 数据库、AI 与采集实现
- `src/`：React 界面、Zustand 状态和业务组件
- `public/`：提示词与合规采集示例
- `scripts/`：回归、安全链路和岗位雷达检查
- `docs/`：使用、采集、AI 集成和验收文档
- `prompts/`、`全网岗位监控系统-任务书.md`：JobRadar 原始规划资料

所有简历、API Key、数据库和浏览器状态都保存在本机，不进入 Git 仓库。
