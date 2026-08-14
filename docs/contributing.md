# 贡献指南

感谢你对 JobRadar 的关注！我们欢迎各种形式的贡献，包括但不限于：

- 报告 Bug
- 提出新功能建议
- 改进文档
- 提交代码修复或新功能

## 开发环境搭建

### 环境要求

- Node.js >= 20.x
- pnpm >= 11.x
- Git

### 克隆仓库

```bash
git clone https://github.com/vdvsvs/JobRadar.git
cd JobRadar
```

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 运行测试

```bash
pnpm test
```

### 代码检查

```bash
pnpm typecheck
```

## 代码规范

### TypeScript

- 使用严格类型检查（`strict: true`）
- 优先使用接口（interface）而非类型别名（type）
- 避免使用 `any` 类型

### React

- 函数组件 + Hooks
- Props 使用 TypeScript 接口定义
- 组件文件名使用 PascalCase

### 文件命名

- 组件文件：`PascalCase.tsx`
- 工具/服务文件：`camelCase.ts`
- 类型定义文件：`camelCase.ts`

### Git 提交规范

提交信息格式：`类型: 描述`

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：

```
feat: 添加 MBTI 评估结果导出功能
fix: 修复公司列表筛选条件不生效的问题
docs: 更新爬虫配置方法论文档
```

## Pull Request 流程

1. Fork 本项目
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feat/your-feature`
5. 开启 Pull Request

### PR 检查清单

- [ ] 代码通过 TypeScript 编译检查
- [ ] 代码通过 `pnpm typecheck`
- [ ] 回归脚本和生产构建通过
- [ ] 功能已测试，无明显 Bug
- [ ] 相关文档已更新
- [ ] Commit 信息符合规范

## 项目架构

```
Renderer Process (React)
    ↓ IPC (contextBridge)
Main Process (Electron)
    ↓
Infrastructure Layer
    ├── AI Client (DeepSeek/OpenAI)
    ├── Crawler Engine
    ├── SQLite Repository
    └── Storage Adapters
```

### 核心模块

| 模块     | 路径                                    | 说明                     |
| -------- | --------------------------------------- | ------------------------ |
| 个人评估 | `src/components/assessment/`            | MBTI、人格、兴趣测试     |
| 企业评估 | `src/components/company/`               | 公司管理、评估分析       |
| 智能推荐 | `src/components/recommendation/`        | 匹配算法、推荐列表       |
| AI 服务  | `electron/main/ai/`、`src/services/ai/` | Provider 调用与评分流程  |
| 岗位获取 | `electron/main/crawler/`                | 搜索源、浏览器与数据校验 |
| 数据库   | `electron/main/db/`                     | sql.js SQLite 持久化     |

## 行为准则

- 尊重所有贡献者，不论经验水平
- 接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心和尊重

## 许可证

本项目采用 MIT 许可证。提交 PR 即表示你同意你的代码将在 MIT 许可证下发布。

## 联系方式

- 提交 Issue：[GitHub Issues](https://github.com/vdvsvs/JobRadar/issues)
- 讨论区：[GitHub Discussions](https://github.com/vdvsvs/JobRadar/discussions)
