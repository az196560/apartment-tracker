# Peninsula One

Peninsula One 是一个面向旧金山半岛租房者的 1B1B 房源监控站，覆盖
Burlingame、San Mateo、Foster City、Belmont、San Carlos、Redwood City 和 Menlo Park。

## 数据口径

- 收录管理规范、维护良好、配套完整并有稳定官方租赁渠道的品质公寓
- 保留空调或室内洗烘状态尚未确认的社区，并在站内明确标注确认状态
- The Heltsley 因确认仅提供共享洗衣设施而不收录
- 新建、完成翻新和维护良好的成熟社区都可纳入，不再设置严格房龄门槛
- 不收录有收入、雇主、学校或身份资格限制的社区
- 只展示 1 bedroom / 1 bathroom
- 优先使用物业官方租赁网站
- 链接分为“精确房号”和“官方户型页”，不会把户型页标记为精确房源
- 价格和可租状态仅作追踪参考，签约前应以物业官网为准

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

GitHub Actions 每天按 `America/Los_Angeles` 时区在早上 5:00 运行同步任务，
会在提交新库存前依次验证数据、运行 lint 并构建静态站点。当前已接入 Highwater 与 885 Woodside 的
SightMap 动态库存接口，并尝试读取 Cirrus 的 RentCafe 房源。Highwater 会精确到
房号、入住日、base rent、推荐租期、固定月费和停车费范围。官网阻止自动访问时，
同步程序会保留上一次已验证快照，不会把库存误写为空。

The Lark 的 RentCafe 接口需要通过环境变量 `RENTCAFE_API_TOKEN` 提供令牌；
GitHub Actions 从同名 repository secret 读取，不在源码或日志中保存令牌。

`inventoryStatus` 表示采集状态：`live` 为已接入每日接口，`onboarding` 为正在开发
适配器，`manual` 为官网仅提供人工询价。库存链接只有真正直达房号时才会标记为
“精确房号”。

## 部署

Pull request 会先运行数据验证、lint 和 GitHub Pages 构建；`main` 分支更新后，
只有全部检查通过才会部署静态站点到：

https://az196560.github.io/apartment-tracker/
