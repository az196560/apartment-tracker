# Peninsula One

Peninsula One 是一个面向旧金山半岛租房者的 1B1B 房源监控站，覆盖
Burlingame、San Mateo、Foster City、Belmont、San Carlos、Redwood City 和 Menlo Park。

## 数据口径

- 收录管理规范、维护良好、配套完整并有稳定官方租赁渠道的品质公寓
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
```

GitHub Actions 每天运行同步任务。当前已接入 Highwater 与 885 Woodside 的
SightMap 动态库存接口，并尝试读取 Cirrus 的 RentCafe 房源。Highwater 会精确到
房号、入住日、base rent、推荐租期、固定月费和停车费范围。官网阻止自动访问时，
同步程序会保留上一次已验证快照，不会把库存误写为空。

`inventoryStatus` 表示采集状态：`live` 为已接入每日接口，`onboarding` 为正在开发
适配器，`manual` 为官网仅提供人工询价。库存链接只有真正直达房号时才会标记为
“精确房号”。

## 部署

`main` 分支更新后，GitHub Actions 会构建静态站点并部署到：

https://az196560.github.io/apartment-tracker/
