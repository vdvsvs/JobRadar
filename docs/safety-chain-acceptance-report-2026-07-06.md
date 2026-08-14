# CareerAssistant 自动投递安全链路验收报告

> 历史来源：本报告从合并前的 `career-assistant` 工作树迁入，保留当时的项目名称、命令和验收结论，不代表当前 JobRadar 的最新验收结果。

- 测试日期：2026-07-06
- 测试对象：CareerAssistant 本地项目
- 测试用户：王荣添
- 测试重点：dryRun 安全演练、旧配置兼容、前端开关、三平台爬虫示例配置
结论：安全链路核心新增能力通过脚本验收；真实招聘平台联网抓取与真实投递点击未执行，采用受控样本模拟，避免误投递。

## 1. 执行命令与结果

| 命令                   | 结果 | 关键输出                                            |
| ---------------------- | ---- | --------------------------------------------------- |
| `npm run test:crawler` | 通过 | `Crawler examples check passed.`                    |
| `npm run test:resume`  | 通过 | `Resume regression passed.`                         |
| `npm run test:policy`  | 通过 | `Auto apply policy check passed.`                   |
| `npm run test:safety`  | 通过 | 输出三平台配置、旧配置合并、dryRun/真实模式模拟日志 |
| `npm run build`        | 通过 | Electron/Vite 构建成功                              |

## 2. 爬虫配置自检

| 平台      | 配置文件                                | endpoint                                                 | 字段映射数 | 结果 |
| --------- | --------------------------------------- | -------------------------------------------------------- | ---------: | ---- |
| Boss 直聘 | `public/crawler-examples/boss直聘.json` | `https://www.zhipin.com/wapi/zpgeek/search/joblist.json` |         10 | 通过 |
| 拉勾      | `public/crawler-examples/拉勾.json`     | `https://www.lagou.com/jobs/v2/positionAjax.json`        |          8 | 通过 |
| 实习僧    | `public/crawler-examples/实习僧.json`   | `https://www.shixiseng.com/api/search`                   |         13 | 通过 |

说明：本次校验验证 JSON 语法、必需 endpoint、字段映射、标题字段映射存在。未使用真实 Cookie 访问招聘平台接口。

## 3. 简历解析与候选队列

| 项目       | 结果                                           |
| ---------- | ---------------------------------------------- |
| 用户名     | 王荣添                                         |
| 学历/专业  | 软件工程本科                                   |
| 解析技能数 | 32                                             |
| 职业兴趣数 | 5                                              |
| 项目识别   | 物资综合管理系统、微服务企业办公系统           |
| 候选样本   | Boss 10 条、拉勾 10 条、实习僧 10 条，共 30 条 |
| 最低匹配分 | 70                                             |
| 达标候选   | 16 条                                          |
| 拦截样本   | 14 条                                          |

## 4. 抓取岗位汇总

| 平台      | 总数 | 达标候选 | 拦截数 | 风险分布                  |
| --------- | ---: | -------: | -----: | ------------------------- |
| Boss 直聘 |   10 |        6 |      4 | low 8 / medium 1 / high 1 |
| 拉勾      |   10 |        6 |      4 | low 8 / medium 1 / high 1 |
| 实习僧    |   10 |        4 |      6 | low 8 / medium 1 / high 1 |

字段完整性：30 条样本均包含平台、岗位、公司、地点、薪资、技术要求、JD 摘要、匹配分、风险等级。

## 5. 旧配置兼容

合并前旧配置缺少 `dryRun`：

```json
{
  "enabled": false,
  "intervalMinutes": 5,
  "dailyMorningLimit": 50,
  "dailyAfternoonLimit": 50,
  "minScore": 70,
  "titleWhitelist": ["Java", "后端", "开发", "实习"],
  "cityWhitelist": ["郑州"],
  "companyBlocklist": ["黑名单科技"],
  "onlineInterviewPreferred": true
}
```

合并后结果：

```json
{
  "enabled": false,
  "intervalMinutes": 5,
  "morningStartHour": 10,
  "afternoonStartHour": 15,
  "dailyMorningLimit": 50,
  "dailyAfternoonLimit": 50,
  "minScore": 70,
  "titleWhitelist": ["Java", "后端", "开发", "实习"],
  "cityWhitelist": ["郑州"],
  "companyBlocklist": ["黑名单科技"],
  "onlineInterviewPreferred": true,
  "dryRun": true
}
```

结论：通过。旧配置自动合并默认配置，`dryRun=true`。

## 6. 前端开关校验

| 校验项                                       | 结果 |
| -------------------------------------------- | ---- |
| `AutoApplyPanel` 存在「安全演练模式」文案    | 通过 |
| 开关绑定 `status.config.dryRun`              | 通过 |
| 切换时调用 `saveConfig({ dryRun: checked })` | 通过 |
| 生产构建                                     | 通过 |

说明：本次为源码与构建校验，未启动 Electron 可视化窗口做人工点击。

## 7. dryRun 安全演练日志

- dryRun 配置：`dryRun=true`
- 真实平台投递请求数：0
看板状态变化：全部保持 `draft`，无岗位更新为 `applied`

| 平台     | 岗位ID      | 分数 | 风险   | 动作         | 拦截原因         |
| -------- | ----------- | ---: | ------ | ------------ | ---------------- |
| Boss直聘 | Boss直聘-1  |   86 | low    | dry-run-pass |                  |
| Boss直聘 | Boss直聘-2  |   90 | low    | dry-run-pass |                  |
| Boss直聘 | Boss直聘-3  |   82 | low    | dry-run-pass |                  |
| Boss直聘 | Boss直聘-4  |   86 | low    | dry-run-pass |                  |
| Boss直聘 | Boss直聘-5  |   64 | low    | blocked      | 匹配分低于70     |
| Boss直聘 | Boss直聘-6  |   82 | low    | blocked      | 城市未命中白名单 |
| Boss直聘 | Boss直聘-7  |   86 | low    | blocked      | 公司命中黑名单   |
| Boss直聘 | Boss直聘-8  |   90 | high   | blocked      | 企业/岗位高风险  |
| Boss直聘 | Boss直聘-9  |   82 | medium | dry-run-pass |                  |
| Boss直聘 | Boss直聘-10 |   86 | low    | dry-run-pass |                  |
| 拉勾     | 拉勾-1      |   86 | low    | dry-run-pass |                  |
| 拉勾     | 拉勾-2      |   90 | low    | dry-run-pass |                  |
| 拉勾     | 拉勾-3      |   82 | low    | dry-run-pass |                  |
| 拉勾     | 拉勾-4      |   86 | low    | dry-run-pass |                  |
| 拉勾     | 拉勾-5      |   64 | low    | blocked      | 匹配分低于70     |
| 拉勾     | 拉勾-6      |   82 | low    | blocked      | 城市未命中白名单 |
| 拉勾     | 拉勾-7      |   86 | low    | blocked      | 公司命中黑名单   |
| 拉勾     | 拉勾-8      |   90 | high   | blocked      | 企业/岗位高风险  |
| 拉勾     | 拉勾-9      |   82 | medium | dry-run-pass |                  |
| 拉勾     | 拉勾-10     |   86 | low    | dry-run-pass |                  |
| 实习僧   | 实习僧-1    |   86 | low    | dry-run-pass |                  |
| 实习僧   | 实习僧-2    |   90 | low    | blocked      | 验证码/安全验证  |
| 实习僧   | 实习僧-3    |   82 | low    | blocked      | 登录失效         |
| 实习僧   | 实习僧-4    |   86 | low    | dry-run-pass |                  |
| 实习僧   | 实习僧-5    |   64 | low    | blocked      | 匹配分低于70     |
| 实习僧   | 实习僧-6    |   82 | low    | blocked      | 城市未命中白名单 |
| 实习僧   | 实习僧-7    |   86 | low    | blocked      | 公司命中黑名单   |
| 实习僧   | 实习僧-8    |   90 | high   | blocked      | 企业/岗位高风险  |
| 实习僧   | 实习僧-9    |   82 | medium | dry-run-pass |                  |
| 实习僧   | 实习僧-10   |   86 | low    | dry-run-pass |                  |

## 8. 真实投递模式对比

- 真实模式配置：`dryRun=false`
说明：本次为模拟真实投递动作，不向招聘平台发送真实点击或投递请求。

| 指标                         |  结果 |
| ---------------------------- | ----: |
| 过滤逻辑与 dryRun 是否一致   |    是 |
| 模拟触发投递动作             | 16 条 |
| 看板状态模拟更新为 `applied` | 16 条 |
| 被拦截岗位                   | 14 条 |

真实模式拦截原因与 dryRun 完全一致：匹配分不足、城市不匹配、黑名单企业、高风险岗位、验证码、登录失效。

## 9. 异常安全拦截

| 场景       | dryRun=true                    | dryRun=false 模拟              | 结果 |
| ---------- | ------------------------------ | ------------------------------ | ---- |
| 验证码弹窗 | blocked，记录“验证码/安全验证” | blocked，记录“验证码/安全验证” | 通过 |
| 登录失效   | blocked，记录“登录失效”        | blocked，记录“登录失效”        | 通过 |
| 低于匹配分 | blocked，记录“匹配分低于70”    | blocked，记录“匹配分低于70”    | 通过 |
| 黑名单企业 | blocked，记录“公司命中黑名单”  | blocked，记录“公司命中黑名单”  | 通过 |

## 10. 缺陷与建议

1. 真实平台抓取未执行：当前只验证配置模板和受控样本，尚未用真实登录态 Cookie 抓取 Boss/拉勾/实习僧岗位。
2. `crawler-examples-check.cjs` 仍是结构校验，不验证接口响应字段是否与最新平台返回一致。
3. 前端开关只做源码/构建校验，建议下一轮用 Electron/Playwright 做一次可视化点击验证。
4. 真实投递模式必须继续保持默认关闭，并增加投递前页面截图/按钮文本确认后再允许真实点击。
5. 建议新增“导出 dryRun 日志”按钮，方便验收人员直接下载投递演练日志。

## 11. 最终结论

安全链路新增能力通过本轮本地脚本验收：三平台配置自检通过、旧配置自动补 `dryRun=true`、前端开关存在、dryRun 模式不发送真实投递请求且看板状态不变、真实模式模拟能按同一过滤逻辑更新状态。真实平台抓取和真实投递点击仍需在具备登录态和人工确认机制后单独验收。
