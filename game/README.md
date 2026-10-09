# 皇冠 · 卡牌战斗解析器

肉鸽 × CCG 的融合点垂直切片。30 张卡（身份 10 + 表达 15 + 盟友 5），无 meta，纯牌局逻辑。

打开 `index.html` 即可玩。下水（火炮铺场）先手，七星（法力压制）AI 自动。

## 验证结果

**Node 无头模拟**（`_test.js`，100 局贪心对局）
- 0 异常 / 0 超时
- 下水 58 胜 · 七星 42 胜
- 最长 41 回合

**浏览器驱动**（贪心脚本代操作）
- 多局完整对局 39-45 回合全部正常终局
- 已触发机制：法力压制削产、出牌封锁、疲劳掉血、侦察揭示、火炮轰击、亡语部署、嘲讽限制、冲锋当回合攻击、苏维埃回合结束强化、多共和国永久加产

## 已修的 bug

1. `draw` / `dmgHero` 漏传 battle 对象 → `ReferenceError: b is not defined`，全 100 局崩
2. `#banner` 无子元素 → `querySelector('.w')` 返回 null 抛异常，`add('show')` 永远跑不到
3. flash 1.3 秒定时器与终局 banner 抢同一个 `show` 类 → 加 `locked` 锁分离
4. 终局 banner 用 `opacity` transition，本 WebView 里 transition 不 tick（`currentTime` 卡在 0），banner 被钉死在起始态 → 改成 `display: none / block` 切换，不依赖过渡

## 文件

```
cards.js    30+30 张卡数据
engine.js   战斗解析器核心（纯函数）
ai.js       贪心 AI（能打就打、嘲讽优先、英雄血厚先清场）
ui.js       渲染 + 交互
style.css   冷战配色
index.html  入口
_test.js    Node 无头回归
```
