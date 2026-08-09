# Bay Area Apartment Radar

Bay Area Apartment Radar 是一个聚合专业物业官网库存的湾区公寓追踪站，覆盖：

- San Francisco
- Peninsula
- South Bay
- East Bay

站点支持按区域、城市、Studio / 1BR / 2BR / 3BR+ 和户型名称搜索，并把当前可租单元直接链接回物业官网。

## 数据口径

- 只收录有可验证物业官网或官方租赁渠道的专业管理公寓
- 系统审计 Equity Residential、Prometheus、AvalonBay、UDR、Greystar、Related Rentals、Essex、Windsor 等官方组合，并在每日同步时自动发现符合条件的 Prometheus 新社区
- 不把私人房东、转租或第三方聚合站房源混入官方物业库存
- Studio 至 4BR 的公开户型均可进入数据集，3BR 和 4BR 在界面合并为 `3BR+`
- 只有官网明确确认空调与室内洗烘的社区才会进入最终数据；`select homes`、`available` 等“部分户型配有”的社区默认排除
- 只保留普通市场价房源；收入限制、BMR、保障房、老年、学生、教职工或雇员专属户型会在采集和校验两层排除
- 链接分为“精确房号”和“官方户型页”，不会把户型页标记为精确房源
- 每个房号保留首次发现时间，可筛选最近 72 小时新上架房源
- 官网阻止自动访问时保留上一次已验证快照，不会把库存误写为空
- 每个社区保留设施核验日期和官方证据链接；价格和可租状态最终以物业官网为准

“湾区目录”指上述四区内由官方来源验证的专业管理中高端公寓，不包含私人出租住宅。普通租赁的信用、收入和身份核验仍以物业申请规则为准；这里的“无特殊限制”指不要求保障房、年龄、学校、雇主或特定身份资格。

## 本地开发

```bash
npm install
npm run dev
```

## 数据更新

```bash
npm run sync:data
npm run validate:data
```

`scripts/bay-area-catalog.mjs` 维护四区城市归属、经过设施审计的官方物业目录和已知户型。
`scripts/sync-inventory.mjs` 每天重新执行硬性准入规则、读取官方动态库存，保留失败来源的最近快照，并更新
`public/data/inventory.json`。The Lark 的 RentCafe 接口需要通过环境变量
`RENTCAFE_API_TOKEN` 提供令牌；GitHub Actions 从同名 repository secret 读取。

`inventoryStatus` 表示采集状态：`live` 为已接入每日接口，`onboarding` 为正在接入，
`manual` 为官网仅提供人工询价，`blocked` 为官网当前阻止自动读取。

## 自动化与部署

GitHub Actions 每天按 `America/Los_Angeles` 时区在 05:00 运行同步任务，提交前依次执行：

```bash
npm run validate:data
npm run lint
npm run build:pages
```

`main` 通过检查后部署到：

https://az196560.github.io/apartment-tracker/
