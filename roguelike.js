/* ============================================================================
 * 皇冠·卡牌战斗 — 肉鸽层 / ROGUELIKE
 * ----------------------------------------------------------------------------
 * 一场 run = 12 个节点
 *   战斗 8 · 商人 2 · 营地 1 · BOSS 1
 * 资源
 *   碎片 frag  战斗奖励 400–900
 *   皇冠 gold  meta 货币，仅从 run 结算获得
 * 改造预算（design/03）
 *   · 免费入口：战斗胜利 1 次改造（三选一），不花钱
 *   · 付费入口：商人按碎片买，同一商人连买涨价 50%
 *   · 每卡上限 3 次
 * 经济闭环
 *   · 8 场战斗 ≈ 4400 碎片 · 商人均价 81，连买 3 次 386
 *   · 14 次改造机会 · 碎片结余 ≈ 4.5 皇冠
 *   · 永久技能最贵 2 皇冠 → 2–3 场 run 买一条
 * ========================================================================== */
(function (root) {
  'use strict';
  var HD = root.HeroData, CD = root.CardData;

  /* ---------------- 改造池 ---------------- */
  var MUTATIONS = [
    { id:'plus',    n:'强化',     d:'攻击 +1，承受值 +1。',           price:81,
      apply:function (c) { c.atk += 1; c.hp += 1; c.maxHp += 1; } },
    { id:'atk2',    n:'军纪强化', d:'攻击 +2。',                       price:96,
      apply:function (c) { c.atk += 2; } },
    { id:'hp3',     n:'重装',     d:'承受值 +3。',                     price:96,
      apply:function (c) { c.hp += 3; c.maxHp += 3; } },
    { id:'charge',  n:'冲锋训练', d:'追加【冲锋】。',                  price:120,
      apply:function (c) { if ((c.kw || []).indexOf('charge') < 0) (c.kw = c.kw || []).push('charge'); } },
    { id:'taunt',   n:'壁垒',     d:'追加【嘲讽】。',                  price:120,
      apply:function (c) { if ((c.kw || []).indexOf('taunt') < 0) (c.kw = c.kw || []).push('taunt'); } },
    { id:'ward',    n:'圣盾',     d:'追加【圣盾】。',                  price:150,
      apply:function (c) { if ((c.kw || []).indexOf('ward') < 0) (c.kw = c.kw || []).push('ward'); } },
    { id:'life',    n:'血契',     d:'追加【吸血】。',                  price:150,
      apply:function (c) { if ((c.kw || []).indexOf('lifesteal') < 0) (c.kw = c.kw || []).push('lifesteal'); } },
    { id:'art',     n:'火炮化',   d:'追加【火炮】。',                  price:135,
      apply:function (c) { if ((c.kw || []).indexOf('artillery') < 0) (c.kw = c.kw || []).push('artillery'); } },
    { id:'cheap1',  n:'量产',     d:'费用 -1（不低于 1）。',           price:110,
      apply:function (c) { if (c.cost > 1) c.cost -= 1; } },
    { id:'draw',    n:'附魔·过牌', d:'追加效果：入场时抽 1 张牌。',     price:130,
      apply:function (c) { c.eff = c.eff || {}; c.eff.draw = (c.eff.draw || 0) + 1; } },
    { id:'die2',    n:'附魔·亡语', d:'追加效果：被消灭时造成 2 点伤害。', price:125,
      apply:function (c) { c.eff = c.eff || {}; c.eff.die = (c.eff.die || 0) + 2; } },
    { id:'buff',    n:'附魔·全军', d:'追加效果：入场时我方全场 +1/+1。', price:160,
      apply:function (c) { c.eff = c.eff || {}; c.eff.buffAll = { atk:1, hp:1 }; } },
    { id:'heal4',   n:'附魔·补给', d:'追加效果：入场时恢复 4 点生命。', price:115,
      apply:function (c) { c.eff = c.eff || {}; c.eff.healHero = (c.eff.healHero || 0) + 4; } }
  ];
  var MUT_BY_ID = {};
  MUTATIONS.forEach(function (m) { MUT_BY_ID[m.id] = m; });

  /* ---------------- 永久技能（meta） ---------------- */
  var PERM_SKILLS = [
    { id:'p_prod',    n:'皇冠共鸣',   d:'所有英雄开局产出 +1。',              cost:1 },
    { id:'p_load',    n:'承受力强化', d:'所有英雄承受力上限 +1。',            cost:1 },
    { id:'p_hand',    n:'卡牌师直觉', d:'所有英雄手牌上限 +1。',              cost:1 },
    { id:'p_hp',      n:'英灵庇护',   d:'所有英雄生命 +4。',                  cost:1 },
    { id:'p_start',   n:'起手优势',   d:'先手抽 3 张而非 2 张。',             cost:1 },
    { id:'p_frag',    n:'碎片提炼',   d:'战斗奖励碎片 +30%。',               cost:2 },
    { id:'p_mana',    n:'产出上限',   d:'产出上限封顶 +2。',                 cost:2 },
    { id:'p_skill',   n:'技能改良',   d:'技能费用 -1（最低 1）。',           cost:2 },
    { id:'p_reroll',  n:'重铸',       d:'每场 run 可重铸 1 次改造选项。',     cost:1 },
    { id:'p_shop',    n:'商路',       d:'商人价格 -20%。',                   cost:1 },
    { id:'p_ward',    n:'圣盾祝福',   d:'开局获得 4 点承受值。',              cost:2 },
    { id:'p_fatigue', n:'疲劳减免',   d:'疲劳基础伤害 -1。',                 cost:1 }
  ];

  /* ---------------- 节点模板 ---------------- */
  var NODE_TEMPLATES = [
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'shop',   ic:'碎', lb:'商人' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'camp',   ic:'营', lb:'营地' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'shop',   ic:'碎', lb:'商人' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'battle', ic:'战', lb:'战斗' },
    { type:'boss',   ic:'冠', lb:'BOSS' }
  ];

  /* 对手权重：BOSS 固定顶尖，普通战斗按梯队加权 */
  var POOL_TIER = { '顶尖': 3, '第二': 5, '第三': 7, '第四': 8, '未知': 4 };

  function pickOpponent(rng, isBoss) {
    rng = rng || Math.random;
    var list = HD.list().filter(function (h) { return !h.dlc; });
    if (isBoss) list = list.filter(function (h) { return h.tier === '顶尖'; });
    var w = list.map(function (h) { return POOL_TIER[h.tier] || 5; });
    var tot = w.reduce(function (a, b) { return a + b; }, 0);
    var r = rng() * tot;
    for (var i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* ---------------- Run 状态 ---------------- */
  function newRun(heroKey, meta) {
    return {
      hero: heroKey,
      nodeIdx: 0,
      nodes: NODE_TEMPLATES.map(function (t) {
        var o = pickOpponent(Math.random, t.type === 'boss');
        return {
          type: t.type, ic: t.ic, lb: t.lb,
          opp: o ? o.key : null,
          done: false, result: null
        };
      }),
      mods: {},          /* cardName -> [mutationId, ...] */
      frag: 0,
      wins: 0,
      losses: 0,
      meta: meta || null,
      shopBuyCount: {},  /* shopKey -> 已购次数（涨价用） */
      rerollLeft: (meta && meta.p_reroll) ? 1 : 0
    };
  }

  /* 应用改造到卡片定义（run 内临时副本） */
  function cardOf(run, name) {
    var src = CD.CARDS[name];
    if (!src) return null;
    var m = JSON.parse(JSON.stringify(src));
    var ids = run.mods[name];
    if (ids) {
      ids.forEach(function (id) {
        var mt = MUT_BY_ID[id];
        if (mt) mt.apply(m);
      });
    }
    m.mods = ids ? ids.length : 0;
    return m;
  }

  function modCount(run, name) { return run.mods[name] ? run.mods[name].length : 0; }

  /* 生成三选一改造选项（针对牌组内的卡） */
  function modChoices(run, heroKey, n, rng) {
    n = n || 3;
    rng = rng || Math.random;
    var deck = CD.buildDeck(heroKey);
    var pool = MUTATIONS.filter(function (m) {
      return !m.onlySpell || true;
    });
    var out = [];
    var usedMut = {};
    var tries = 0;
    while (out.length < n && tries++ < 60) {
      var cardName = deck[Math.floor(rng() * deck.length)];
      var mut = pool[Math.floor(rng() * pool.length)];
      /* 不选已改造满 3 次的卡 */
      if (modCount(run, cardName) >= 3) continue;
      /* 不给法术加单位关键词类改造 */
      var c = CD.CARDS[cardName];
      if (!c) continue;
      var isUnit = c.t === 'u';
      if (!isUnit && ['charge','taunt','ward','life','art','cheap1'].indexOf(mut.id) >= 0) continue;
      if (!isUnit && mut.id === 'plus') continue;
      /* 去重：同一 卡+改造 不重复出 */
      var key = cardName + '#' + mut.id;
      if (usedMut[key]) continue;
      usedMut[key] = 1;
      out.push({ card: cardName, mut: mut.id, isUnit: isUnit });
    }
    return out;
  }

  /* 商人货架：每轮 4 件（3 改造 + 1 稀有） */
  function shopStock(run, heroKey, shopIdx, rng) {
    rng = rng || Math.random;
    var shopKey = 'shop' + shopIdx;
    var bought = run.shopBuyCount[shopKey] || 0;
    var mult = Math.pow(1.5, bought);          /* 连买涨价 50% */
    var shopPenalty = (run.meta && run.meta.p_shop) ? 0.8 : 1;

    var items = [];
    var choices = modChoices(run, heroKey, 4, rng);
    choices.forEach(function (ch) {
      var mut = MUT_BY_ID[ch.mut];
      items.push({
        kind: 'mod', card: ch.card, mut: ch.mut, isUnit: ch.isUnit,
        name: mut.n, desc: mut.d,
        base: mut.price,
        price: Math.round(mut.price * mult * shopPenalty)
      });
    });
    /* 稀有货：随机一张专属卡 +1/+1 且 -1 费 */
    var sigs = CD.signatureOf(heroKey);
    if (sigs.length) {
      var s = sigs[Math.floor(rng() * sigs.length)];
      items.push({
        kind: 'sigplus', card: s.n, isUnit: s.t === 'u',
        name: '精制·' + s.n,
        desc: s.t === 'u' ? '专属卡 +1/+1，费用 -1。' : '专属卡效果强化。',
        base: 300, price: Math.round(300 * mult * shopPenalty)
      });
    }
    return items;
  }

  /* 战斗奖励 */
  function battleReward(run, isBoss, meta) {
    var base = 400 + Math.floor(Math.random() * 501);   /* 400–900 */
    if (isBoss) base += 600;
    if (meta && meta.p_frag) base = Math.round(base * 1.3);
    return base;
  }

  /* 结算碎片 → 皇冠（每 800 碎片 = 1 皇冠） */
  function fragToGold(frag) {
    return Math.floor(frag / 800);
  }

  /* 永久技能效果施加到英雄 */
  function applyPerm(heroKey, meta) {
    var H = JSON.parse(JSON.stringify(HD.HEROES[heroKey]));
    if (!H) return H;
    if (meta) {
      if (meta.p_prod)    H.prod1 += 1;
      if (meta.p_load)    H.maxLoad += 1;
      if (meta.p_hand)    H.handMax += 1;
      if (meta.p_hp)      H.hp += 4;
      if (meta.p_reroll)  {}
    }
    return H;
  }

  root.Roguelike = {
    MUTATIONS: MUTATIONS,
    MUT_BY_ID: MUT_BY_ID,
    PERM_SKILLS: PERM_SKILLS,
    NODE_TEMPLATES: NODE_TEMPLATES,
    newRun: newRun,
    pickOpponent: pickOpponent,
    cardOf: cardOf,
    modCount: modCount,
    modChoices: modChoices,
    shopStock: shopStock,
    battleReward: battleReward,
    fragToGold: fragToGold,
    applyPerm: applyPerm
  };
})(typeof window !== 'undefined' ? window : globalThis);
