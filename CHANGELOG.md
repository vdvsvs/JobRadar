# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- 修复安全自动投递白名单输入框边输入边保存导致文本重复的问题。

### Added

- 合并 JobRadar 的 8 渠道岗位雷达预设与真实搜索源扫描链路。
- 新增 `pnpm desktop` 和 `pnpm shortcut`，用于刷新本地桌面版程序并更新桌面 `JobRadar.lnk`。
- 新增 `docs/project-analysis.md`，作为后续需求变更前的项目结构、功能定位、数据流与变更流程索引。
- 新增 Boss 直聘安全投递 adapter，自动投递遇到 Boss 岗位时可执行保守的已登录投递流程。
- 扩展自动投递 adapter 支持猎聘、前程无忧、拉勾，统一使用保守登录/验证/按钮文案检查。
- 扩展自动投递 adapter 支持智联招聘、实习僧，并加入默认投递域名白名单。
- 修复打包版 PDF 解析缺失 `pdf.worker.mjs` 的问题，并将“安全自动投递”面板上移到一键启动卡片下方。
- 在“安全自动投递”面板新增各招聘平台登录入口，便于自动投递复用同一浏览器会话。

## [0.1.0] - 2026-06-29

### Added

- 项目初始化，基于 Electron + React + TypeScript
- 个人评估模块：MBTI 28题问卷、五大人格测试、霍兰德职业兴趣测试
- 企业评估模块：公司信息管理、稳定性评分、晋升清晰度评估
- 智能推荐模块：多维加权匹配算法、职业路径可视化
- AI 集成：支持 DeepSeek/OpenAI API，内置 Prompt 模板
- 数据导入：支持 JSON/CSV 批量导入、自定义 API 配置
- 本地存储：SQLite 数据库 + electron-store 加密配置
- 基础 UI：使用 Mantine 7 组件库
