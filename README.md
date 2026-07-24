# Peninsula One

Peninsula One 是一个面向旧金山半岛租房者的 1B1B 房源监控站，覆盖
Burlingame、San Mateo、Belmont、San Carlos、Redwood City 和 Menlo Park。

## 数据口径

- 只收录 2016 年以后建成或整体翻新的公寓
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

GitHub Actions 每天运行同步任务。当前解析器会尝试读取 Cirrus 的 RentCafe
房源；如果官网阻止自动访问，会保留上一次已验证快照而不是写入空数据。
其他物业同样保留已验证快照，并在添加稳定的官方数据接口后切换为实时状态。

## 部署

`main` 分支更新后，GitHub Actions 会构建静态站点并部署到：

https://az196560.github.io/apartment-tracker/
