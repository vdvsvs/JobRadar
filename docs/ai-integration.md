# AI 集成指南

JobRadar 支持多种 AI 提供商，帮助你获得个性化的职业评估和建议。

## 支持的 AI 提供商

| 提供商   | 推荐模型             | 特点                 |
| -------- | -------------------- | -------------------- |
| DeepSeek | deepseek-chat        | 性价比高，中文理解好 |
| OpenAI   | gpt-4o / gpt-4o-mini | 功能强大，生态完善   |
| 自定义   | 任意 OpenAI 兼容 API | 灵活扩展             |

## 快速配置

1. 打开 JobRadar → 设置 → API Key 设置
2. 选择 AI 提供商
3. 输入 API Key（仅保存在本地，加密存储）
4. 选择模型
5. 点击"测试连接"

## API Key 安全

- API Key 存储在本地加密文件中，不会上传到任何服务器
- 生产环境首次运行会在应用数据目录生成独立加密密钥
- 你可以随时在设置中查看或修改 API Key

## 自定义 Prompt 模板

所有 AI Prompt 模板存储在 `public/prompts/` 目录下，你可以根据需要自定义：

### 可用模板

- `personal_assessment.json` - 个人评估分析
- `company_evaluation.json` - 企业评估维度解析
- `career_recommendation.json` - 智能推荐理由生成
- `risk_analysis.json` - 年龄风险与机会成本分析

### 模板格式

```json
{
  "name": "模板名称",
  "description": "模板描述",
  "systemPrompt": "系统提示词",
  "userPrompt": "用户提示词，支持变量：{userName}, {major}, {mbti}",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

### 变量说明

| 变量          | 说明      | 示例       |
| ------------- | --------- | ---------- |
| {userName}    | 用户姓名  | 张三       |
| {major}       | 专业      | 计算机科学 |
| {mbti}        | MBTI 类型 | INTJ       |
| {companyName} | 公司名称  | 字节跳动   |
| {industry}    | 行业      | 互联网     |
| {age}         | 年龄      | 22         |

## AI 调用流程

```
用户完成评估/请求推荐
    ↓
前端调用 electronAPI.chatWithAI()
    ↓
Electron 主进程 IPC 处理
    ↓
AiClient 选择对应 Provider
    ↓
调用 AI API（支持流式响应）
    ↓
结果缓存到本地
    ↓
返回给前端展示
```

## 故障排查

### API 调用失败

1. 检查 API Key 是否正确
2. 检查网络连接
3. 确认 API 配额是否已用完
4. 查看日志文件获取详细错误信息

### 响应质量不佳

1. 尝试切换不同的 AI 提供商
2. 调整 temperature 参数（0-1，值越高创意越强）
3. 优化 Prompt 模板，提供更详细的上下文

## 成本控制建议

- 使用 `deepseek-chat` 或 `gpt-4o-mini` 降低 API 调用成本
- 开启本地缓存，避免重复请求相同内容
- 对于简单任务，可以使用更小的模型
