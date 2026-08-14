# 数据爬取与导入指南

JobRadar 采用"用户自行接入"的数据策略。岗位雷达提供 8 渠道域名与关键词预设，真实搜索仍需用户配置 Bing、SerpAPI 或自定义搜索源。项目不绕过登录、验证码、风控或平台服务条款。

## 目录

1. [数据导入方式](#数据导入方式)
2. [JSON 格式导入](#json-格式导入)
3. [CSV 格式导入](#csv-格式导入)
4. [自定义 API 配置](#自定义-api-配置)
5. [数据字段映射](#数据字段映射)
6. [法律合规说明](#法律合规说明)

## 数据导入方式

JobRadar 支持三种数据导入方式：

| 方式            | 适用场景                     | 难度 |
| --------------- | ---------------------------- | ---- |
| JSON/CSV 导入   | 从其他平台导出数据后批量导入 | 简单 |
| 自定义 API 配置 | 已有开放 API 的平台          | 中等 |
| 自定义脚本      | 需要自己编写爬虫脚本         | 复杂 |

### 方式一：JSON/CSV 导入

最简单的方式。你可以从其他平台导出数据，然后通过 JobRadar 的"数据源管理"页面导入。

**操作步骤：**

1. 打开 JobRadar → 设置 → 数据源管理
2. 点击"导入数据"
3. 选择 JSON 或 CSV 文件
4. 系统自动解析并导入公司数据

### 方式二：自定义 API 配置

如果目标平台提供开放 API，你可以配置 API 连接器。

**操作步骤：**

1. 打开 JobRadar → 设置 → 数据源管理
2. 点击"添加数据源"
3. 填写 API 配置信息：
   - 数据源名称
   - API Base URL
   - 请求头（包括认证信息）
   - 接口路径映射
4. 点击"测试连接"验证配置
5. 保存后即可通过 API 获取数据

### 方式三：自定义脚本

对于技术用户，可以编写自己的 Python/Node.js 脚本获取数据，然后通过 JSON 文件导入。

## JSON 格式导入

JSON 文件应包含公司对象数组，每个公司对象包含以下字段：

```json
[
  {
    "name": "公司名称",
    "industry": "所属行业",
    "scale": "startup | medium | large",
    "fundingStage": "融资阶段",
    "location": {
      "city": "城市",
      "district": "区/县"
    },
    "stabilityScore": 75,
    "promotionClarity": 80,
    "tags": ["新兴", "高成长"],
    "description": "公司描述"
  }
]
```

### 字段说明

| 字段              | 类型     | 必填 | 说明                                                     |
| ----------------- | -------- | ---- | -------------------------------------------------------- |
| name              | string   | 是   | 公司名称                                                 |
| industry          | string   | 是   | 所属行业，如"互联网"、"金融"                             |
| scale             | string   | 否   | 公司规模：startup（创业）、medium（中型）、large（大型） |
| fundingStage      | string   | 否   | 融资阶段，如"天使轮"、"A轮"、"已上市"                    |
| location.city     | string   | 是   | 所在城市                                                 |
| location.district | string   | 否   | 所在区/县                                                |
| stabilityScore    | number   | 否   | 稳定性评分（0-100），默认 50                             |
| promotionClarity  | number   | 否   | 晋升清晰度评分（0-100），默认 50                         |
| tags              | string[] | 否   | 标签数组                                                 |
| description       | string   | 否   | 公司描述                                                 |

## CSV 格式导入

CSV 文件第一行为表头，后续为数据行。系统会自动识别常见字段名。

```csv
name,industry,scale,funding_stage,location_city,stability_score,promotion_clarity
字节跳动,互联网,large,已上市,北京,85,90
美团,互联网,large,已上市,北京,80,85
```

### 字段映射

系统支持以下字段名映射（不区分大小写）：

- `name` / `company_name` / `公司名称` → name
- `industry` / `行业` → industry
- `scale` / `公司规模` → scale
- `funding_stage` / `fundingStage` / `融资阶段` → fundingStage
- `location_city` / `city` / `城市` → location.city
- `stability_score` / `stabilityScore` / `稳定性` → stabilityScore
- `promotion_clarity` / `promotionClarity` / `晋升` → promotionClarity

## 自定义 API 配置

### 配置结构

```json
{
  "name": "数据源名称",
  "type": "api",
  "config": {
    "baseUrl": "https://api.example.com",
    "headers": {
      "Authorization": "Bearer ${API_KEY}",
      "Content-Type": "application/json"
    },
    "endpoints": {
      "positions": "/jobs",
      "companies": "/companies"
    },
    "fieldMapping": {
      "name": "job_name",
      "company": "company_name",
      "industry": "category",
      "location_city": "city",
      "stability_score": "rating"
    },
    "pagination": {
      "type": "page",
      "pageParam": "page",
      "pageSizeParam": "page_size",
      "pageSize": 20
    }
  }
}
```

### 配置说明

| 字段         | 说明                                                  |
| ------------ | ----------------------------------------------------- |
| baseUrl      | API 基础地址                                          |
| headers      | 请求头，支持 `${API_KEY}` 变量替换                    |
| endpoints    | 接口路径映射                                          |
| fieldMapping | 字段映射规则，将 API 返回字段映射到 JobRadar 标准字段 |
| pagination   | 分页配置（可选）                                      |

### 变量替换

配置中支持以下变量：

- `${API_KEY}` - 自动替换为你在设置中配置的 API Key
- `${DATE}` - 当前日期（YYYY-MM-DD）
- `${TIMESTAMP}` - 当前时间戳

## 数据字段映射

### 标准字段对照表

| JobRadar 字段     | 说明          | 常见 API 字段名                |
| ----------------- | ------------- | ------------------------------ |
| name              | 公司/职位名称 | name, title, job_name          |
| industry          | 行业          | industry, category, sector     |
| scale             | 公司规模      | scale, size, company_size      |
| fundingStage      | 融资阶段      | funding_stage, stage, round    |
| location.city     | 城市          | city, location, address        |
| location.district | 区/县         | district, area, region         |
| stabilityScore    | 稳定性评分    | stability, rating, score       |
| promotionClarity  | 晋升清晰度    | promotion, growth, career_path |
| tags              | 标签          | tags, labels, keywords         |
| description       | 描述          | description, intro, summary    |

## 法律合规说明

### 重要提示

1. **遵守 robots.txt**：在爬取任何网站前，请检查该网站的 `robots.txt` 文件，确认允许爬取的范围。
2. **尊重服务条款**：阅读目标网站的《服务条款》和《隐私政策》，确保你的爬取行为不违反协议。
3. **控制爬取频率**：建议添加延时（如每次请求间隔 1-3 秒），避免对目标服务器造成压力。
4. **仅用于个人学习**：爬取的数据应仅用于个人学习和非商业用途。
5. **数据脱敏**：不要爬取和存储个人敏感信息。

### 推荐的数据源

- **官方 API**：优先使用平台提供的官方开放 API
- **公开数据集**：使用公开可用的行业数据集
- **手动录入**：少量数据建议直接手动录入

### 免责声明

JobRadar 是一个开源工具，提供数据导入和搜索源接入能力，但不提供招聘平台数据。使用者应自行承担数据获取与使用的法律责任。

## 示例配置

### Boss 直聘

详见 `public/crawler-examples/boss直聘.json`

### 实习僧

详见 `public/crawler-examples/实习僧.json`

## 常见问题

### Q: 为什么没有内置爬虫？

A: 为避免法律风险和反爬机制对抗，JobRadar 提供渠道预设、搜索源和示例配置，由用户根据自身需求完成真实数据源接入。

### Q: 数据存储在哪里？

A: 所有数据存储在本地 sql.js SQLite 数据库中。兼容数据库文件名为 `career-assistant.db`，不会上传到 JobRadar 服务器。

### Q: 支持批量导入多少条数据？

A: 理论上没有硬性限制，但建议单次导入不超过 1000 条以保证性能。

### Q: 如何更新已导入的数据？

A: 重新导入相同 ID 的数据会自动更新。如果数据中没有 ID 字段，系统会根据名称去重。
