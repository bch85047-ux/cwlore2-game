/* ============================================================================
 * 皇冠·卡牌战斗 — 卡牌池 / CARDS
 * ----------------------------------------------------------------------------
 * 卡种 t：u 单位 · sp 法术 · or 指令（一次性被动）
 * eff.type 为 engine 识别的效果码，见下方 EFFECT_DESC。
 * ========================================================================== */
(function (root) {
  'use strict';

  var CARDS = {};
  function C(o) {
    o.id = o.id || o.n;
    o.t = o.t || 'u';
    o.kw = o.kw || [];
    o.text = o.text || (root.HeroData ? effText(o.eff) : '');
    CARDS[o.id] = o;
    return o;
  }

  /* ---------------- 效果码 → 描述（标准卡牌表述） ---------------- */
  var EFFECT_DESC = {
    draw:          function (o) { return '抽 ' + o.n + ' 张牌。'; },
    damageHero:    function (o) { return '对敌方卡牌师造成 ' + o.n + ' 点伤害。'; },
    damageAll:     function (o) { return '对敌方场上所有单位造成 ' + o.n + ' 点伤害。'; },
    killWeak:      function (o) { return '消灭敌方场上所有攻击值 ≤ ' + o.n + ' 的单位。'; },
    destroyAll:    function ()  { return '消灭敌方场上所有单位。'; },
    buffAll:       function (o) { return '我方场上所有单位 +' + o.atk + '/' + o.hp + '。'; },
    buffHand:      function (o) { return '你手中所有单位 +' + o.atk + '/' + o.hp + '。'; },
    summon:        function (o) { return '召唤 ' + o.n + ' 个「' + o.id + '」。'; },
    summonWeak:    function (o) { return '召唤 ' + o.n + ' 个 ' + o.a + '/' + o.h + ' 单位。'; },
    healHero:      function (o) { return '恢复 ' + o.n + ' 点生命。'; },
    gainProd:      function (o) { return '产出 +' + o.n + '。'; },
    gainMaxProd:   function (o) { return '产出上限 +' + o.n + '。'; },
    addArmor:      function (o) { return '获得 ' + o.n + ' 点承受值。'; },
    stealProd:     function (o) { return '从对手处偷取 ' + o.n + ' 点产出。'; },
    scry:          function (o) { return '检视牌库顶 ' + o.n + ' 张，指定 1 张入场。'; },
    forceDraw:     function (o) { return '对手被迫抽 ' + o.n + ' 张牌。'; },
    handPollute:   function (o) { return '将对手牌库顶 ' + o.n + ' 张卡变为「鸭子」。'; },
    chargeAll:     function ()  { return '我方场上所有单位获得【冲锋】。'; },
    wardAll:       function ()  { return '我方场上所有单位获得【圣盾】。'; },
    dispelAll:     function ()  { return '移除敌方场上所有增益效果。'; },
    prodDeny:      function (o) { return '对手产出上限永久 -' + o.n + '。'; },
    fatigueUp:     function ()  { return '本局疲劳基础伤害 +1。'; },
    extraAtk:      function ()  { return '指定我方 1 个单位，本回合攻击次数 +1（可叠加）。' },
    ritual:        function ()  { return '英灵槽 +1（上限 3），满槽触发【抹除】。'; },
    die:           function (o) { return '消灭时对相邻敌人造成 ' + o.n + ' 点伤害。'; },
    lifestealHit:  function ()  { return '造成伤害时等量回复我方生命。'; },
    revive:        function ()  { return '被消灭后 1 回合内可复活一次（半血）。'; },
    stackBuff:     function (o) { return '同类单位每 2 个，本卡 +' + o.atk + '/' + o.hp + '。'; },
    randomRes:     function ()  { return '随机获得 1 项资源。' },
    weatherDie:    function ()  { return '掷天候骰（1–6），按点数结算对应效果。' },
    upgrade:       function ()  { return '将 1 个低费单位（费用≤2）转化为优质单位。' },
    stealWin:      function ()  { return '产出累计达 12 触发【逃跑胜利】。' },
    finisher:      function (o) { return '按场上火炮数 ×' + o.mul + ' 造成全场伤害。' }
  };

  function effText(eff) {
    if (!eff) return '';
    var parts = [];
    for (var k in eff) {
      var f = EFFECT_DESC[k];
      if (f) parts.push(f(eff[k]));
    }
    return parts.join('');
  }

  /* =====================================================================
   * 一、通用单位（全英雄共用基础卡池）
   * =================================================================== */
  var GENERIC = [
    // --- 步兵线（低费铺场） ---
    { n:'列兵',   cost:1, atk:1, hp:2, load:1, text:'基础步兵。' },
    { n:'民兵',   cost:1, atk:2, hp:1, load:1, text:'脆弱的先头单位。' },
    { n:'哨兵',   cost:1, atk:1, hp:3, load:1, text:'耐久型步兵。' },
    // --- 中坚线 ---
    { n:'战士',   cost:2, atk:2, hp:3, load:1, text:'标准中坚单位。' },
    { n:'剑士',   cost:2, atk:3, hp:2, load:1, text:'高攻低血中坚。' },
    { n:'弩手',   cost:2, atk:2, hp:2, load:1, text:'远程单位，无【冲锋】。' },
    { n:'牧师',   cost:2, atk:1, hp:2, load:1, eff:{ healHero:1 }, text:'部署时恢复 2 点生命。' },
    // --- 高级线 ---
    { n:'骑士',   cost:3, atk:3, hp:4, load:2, text:'重装中坚。' },
    { n:'突击手', cost:3, atk:4, hp:2, load:2, kw:['charge'], text:'部署当回合即可攻击。' },
    { n:'游侠',   cost:3, atk:3, hp:3, load:2, text:'均衡型单位。' },
    { n:'术士',   cost:3, atk:2, hp:3, load:2, eff:{ draw:1 }, text:'部署时抽 1 张牌。' },
    // --- 炮兵线 ---
    { n:'炮手',   cost:3, atk:2, hp:2, load:2, kw:['artillery'], text:'回合结束时对随机敌方单位造成 1 点伤害。' },
    { n:'炮兵',   cost:4, atk:3, hp:3, load:2, kw:['artillery'], text:'回合结束时对随机敌方单位造成 1 点伤害。' },
    // --- 坦克线 ---
    { n:'坦克',   cost:4, atk:2, hp:6, load:2, kw:['taunt'], text:'敌方必须优先攻击此单位。' },
    { n:'突袭者', cost:4, atk:5, hp:3, load:2, kw:['charge'], text:'部署当回合即可攻击。' },
    { n:'猎人',   cost:4, atk:4, hp:3, load:2, text:'高攻中坚。' },
    { n:'召唤者', cost:4, atk:2, hp:4, load:2, eff:{ summonWeak:{ n:1, a:1, h:1 } }, text:'部署时召唤 1 个 1/1 单位。' },
    // --- 重装线 ---
    { n:'守卫',   cost:5, atk:3, hp:6, load:2, kw:['taunt'], text:'高耐久嘲讽。' },
    { n:'重炮',   cost:5, atk:4, hp:4, load:3, kw:['artillery'], text:'回合结束时对随机敌方单位造成 1 点伤害。' },
    { n:'圣骑士', cost:5, atk:4, hp:6, load:2, kw:['ward'], text:'初始携带【圣盾】。' },
    // --- 高阶线 ---
    { n:'恶魔',   cost:6, atk:5, hp:5, load:3, kw:['charge'], text:'高费冲锋。' },
    { n:'巨人',   cost:6, atk:5, hp:8, load:3, kw:['taunt'], text:'巨型嘲讽，难以处理。' },
    { n:'天使',   cost:6, atk:4, hp:7, load:3, kw:['ward','lifesteal'], text:'圣盾 + 吸血。' },
    { n:'魔王',   cost:7, atk:7, hp:7, load:3, kw:['taunt','charge'], text:'攻击与嘲讽共存。' },
    // --- 亡语线 ---
    { n:'复仇者', cost:3, atk:2, hp:3, load:2, eff:{ die:2 }, text:'消灭时对相邻敌人造成 2 点伤害。' },
    { n:'殉道者', cost:2, atk:1, hp:1, load:1, eff:{ die:3 }, text:'消灭时造成 3 点范围伤害。' },
    // --- 资源线 ---
    { n:'税吏',   cost:2, atk:1, hp:2, load:1, eff:{ gainProd:1 }, text:'部署时产出 +1。' },
    { n:'工匠',   cost:3, atk:2, hp:2, load:2, eff:{ gainMaxProd:1 }, text:'部署时产出上限 +1。' },
    { n:'斥候',   cost:2, atk:2, hp:2, load:1, eff:{ scry:1 }, text:'部署时检视牌库顶并指定 1 张入场。' },
    // --- 特化线 ---
    { n:'自爆兵', cost:2, atk:1, hp:1, load:1, eff:{ die:4 }, text:'消灭时对相邻敌人造成 4 点伤害。' },
    { n:'吸血蝠', cost:3, atk:2, hp:3, load:2, kw:['lifesteal'], text:'造成伤害时等量回复我方生命。' },
    { n:'驱散者', cost:3, atk:2, hp:3, load:2, eff:{ dispelAll:1 }, text:'部署时移除敌方全场增益。' },
    { n:'招募官', cost:4, atk:2, hp:4, load:2, eff:{ scry:3 }, text:'检视牌库顶 3 张，指定 1 张入场。' },
    { n:'民兵队长', cost:4, atk:3, hp:5, load:2, eff:{ buffHand:{ atk:1, hp:1 } }, text:'部署时你手中单位 +1/+1。' },
    { n:'工程师', cost:4, atk:2, hp:5, load:2, eff:{ addArmor:2 }, text:'部署时获得 2 点承受值。' },
    { n:'叛军',   cost:3, atk:3, hp:3, load:2, eff:{ die:1 }, text:'消灭时召唤 1 个 1/1 单位。' }
  ];

  /* =====================================================================
   * 二、通用法术 / 指令
   * =================================================================== */
  var SPELLS = [
    { n:'命令：冲锋',   t:'sp', cost:2, eff:{ chargeAll:1 }, text:'我方全场获得【冲锋】。' },
    { n:'命令：坚守',   t:'sp', cost:2, eff:{ wardAll:1 }, text:'我方全场获得【圣盾】。' },
    { n:'命令：动员',   t:'sp', cost:3, eff:{ buffAll:{ atk:1, hp:1 } }, text:'我方全场 +1/+1。' },
    { n:'命令：驱散',   t:'sp', cost:3, eff:{ dispelAll:1 }, text:'移除敌方全场增益。' },
    { n:'命令：清场',   t:'sp', cost:5, eff:{ damageAll:3 }, text:'对敌方全场造成 3 点伤害。' },
    { n:'命令：处决',   t:'sp', cost:6, eff:{ destroyAll:1 }, text:'消灭敌方全场单位。' },
    { n:'指令：过牌',   t:'or', cost:2, eff:{ draw:2 }, text:'抽 2 张牌。' },
    { n:'指令：整备',   t:'or', cost:3, eff:{ gainProd:2, addArmor:2 }, text:'产出 +2，承受值 +2。' },
    { n:'指令：补给',   t:'or', cost:2, eff:{ healHero:4 }, text:'恢复 4 点生命。' },
    { n:'指令：警戒',   t:'or', cost:2, eff:{ forceDraw:2 }, text:'对手被迫抽 2 张牌。' },
    { n:'指令：压制',   t:'or', cost:3, eff:{ prodDeny:1 }, text:'对手产出上限永久 -1。' },
    { n:'指令：疲劳战', t:'or', cost:2, eff:{ fatigueUp:1 }, text:'本局疲劳基础伤害 +1。' }
  ];
  /* =====================================================================
   * 三、专属卡（每名英雄 3 张，h = 所属英雄 key）
   * 命名与效果严格对齐设定集 history.txt 的卡组特色。
   * =================================================================== */
  var SIGNATURE = [
    /* 克里斯蒂安松 · 仪式 */
    { h:'kristiansen', n:'英灵媒介',  t:'or', cost:2, eff:{ ritual:1 }, text:'英灵槽 +1。' },
    { h:'kristiansen', n:'防火墙组件', t:'u',  cost:3, atk:1, hp:4, load:2, kw:['taunt'], text:'嘲讽。部署时英灵槽 +1。' },
    { h:'kristiansen', n:'仪式祭品',   t:'or', cost:4, eff:{ draw:2, ritual:1 }, text:'抽 2 张牌，英灵槽 +1。' },
    /* Jking7 · 技艺 */
    { h:'jking7', n:'对局拆解', t:'or', cost:2, eff:{ draw:2 }, text:'抽 2 张牌。' },
    { h:'jking7', n:'费用精算', t:'or', cost:3, eff:{ gainProd:3, draw:1 }, text:'产出 +3，抽 1 张牌。' },
    { h:'jking7', n:'基础卡组', t:'u',  cost:4, atk:3, hp:4, load:2, text:'标准中坚，无特殊效果。' },
    /* 八幡 · 铺场 */
    { h:'yato', n:'劫掠',     t:'or', cost:3, eff:{ draw:2 }, text:'抽 2 张牌。' },
    { h:'yato', n:'海盗王',   t:'or', cost:5, eff:{ buffAll:{ atk:2, hp:2 } }, text:'我方全场 +2/+2。' },
    { h:'yato', n:'复仇主义', t:'u',  cost:2, atk:2, hp:2, load:1, eff:{ die:3 }, text:'消灭时造成 3 点范围伤害。' },
    /* SIE · 天候 */
    { h:'sie', n:'预报',       t:'or', cost:2, eff:{ weatherDie:1 }, text:'掷天候骰（1–6），按点数结算。' },
    { h:'sie', n:'极端天气',   t:'sp', cost:4, eff:{ damageAll:4 }, text:'对敌方全场造成 4 点伤害。' },
    { h:'sie', n:'大太阳神',   t:'or', cost:3, eff:{ weatherDie:1 }, text:'重掷天候骰，可连续重掷。' },
    /* Tangentle/Spoker · 随机 */
    { h:'tangentspoker', n:'资源牌',   t:'or', cost:1, eff:{ randomRes:1 }, text:'随机获得 1 项资源。' },
    { h:'tangentspoker', n:'随机获得', t:'or', cost:2, eff:{ randomRes:1 }, text:'随机获得 1 项资源。' },
    { h:'tangentspoker', n:'牌桌协议', t:'u',  cost:3, atk:2, hp:3, load:2, eff:{ randomRes:1 }, text:'部署时随机获得 1 项资源。' },
    /* 66better · 反弹 */
    { h:'better66', n:'完全防御',   t:'or', cost:3, eff:{ addArmor:6 }, text:'获得 6 点承受值。' },
    { h:'better66', n:'换命的奇迹', t:'sp', cost:4, eff:{ healHero:5 }, text:'恢复 5 点生命。' },
    { h:'better66', n:'精准投掷',   t:'u',  cost:3, atk:4, hp:2, load:2, kw:['charge'], text:'部署当回合即可攻击。' },
    /* 青 · 递进 */
    { h:'qing', n:'青云直上', t:'or', cost:3, eff:{ buffAll:{ atk:1, hp:1 } }, text:'我方全场 +1/+1。' },
    { h:'qing', n:'学养',     t:'u',  cost:2, atk:1, hp:3, load:1, text:'耐久型学者单位。' },
    { h:'qing', n:'积学',     t:'or', cost:4, eff:{ draw:2 }, text:'抽 2 张牌。' },
    /* 张猪 · 禁忌 */
    { h:'zhangzhu', n:'禁忌之卡', t:'sp', cost:5, eff:{ summonWeak:{ n:1, a:6, h:6 } }, text:'召唤 1 个 6/6 单位，本回合攻击无视承受值。' },
    { h:'zhangzhu', n:'逃跑',     t:'or', cost:1, eff:{ draw:1 }, text:'抽 1 张牌。' },
    { h:'zhangzhu', n:'例行复仇', t:'sp', cost:3, eff:{ damageHero:6 }, text:'对敌方卡牌师造成 6 点伤害。' },
    /* 停尸 · 群解 */
    { h:'ting', n:'群解·四张', t:'sp', cost:4, eff:{ killWeak:3 }, text:'消灭敌方全场攻击 ≤3 的单位。' },
    { h:'ting', n:'加班',     t:'or', cost:2, eff:{ draw:1 }, text:'抽 1 张牌。' },
    { h:'ting', n:'老成员',   t:'u',  cost:3, atk:2, hp:4, load:2, kw:['taunt'], text:'嘲讽。' },
    /* 王九日 · 精神控制 */
    { h:'wujiuri', n:'心理战',   t:'or', cost:3, eff:{ draw:1, damageHero:2 }, text:'抽 1 张牌，对敌方卡牌师造成 2 点伤害。' },
    { h:'wujiuri', n:'暴露手牌', t:'or', cost:2, eff:{ scry:3 }, text:'检视牌库顶 3 张，指定 1 张入场。' },
    { h:'wujiuri', n:'干扰计时', t:'sp', cost:3, eff:{ forceDraw:1 }, text:'对手被迫抽 1 张牌（本回合抽牌 -1）。' },
    /* 发廊 · 直伤 */
    { h:'falu', n:'直伤',   t:'sp', cost:3, eff:{ damageHero:4 }, text:'对敌方卡牌师造成 4 点伤害。' },
    { h:'falu', n:'冲锋',   t:'or', cost:2, eff:{ chargeAll:1 }, text:'我方全场获得【冲锋】。' },
    { h:'falu', n:'理发',   t:'u',  cost:2, atk:4, hp:1, load:1, kw:['charge'], text:'部署当回合即可攻击。' },
    /* 486 · 连击 */
    { h:'486', n:'连击链',   t:'or', cost:3, eff:{ extraAtk:1 }, text:'指定我方 1 个单位获得追加攻击。' },
    { h:'486', n:'追加攻击', t:'or', cost:2, eff:{ extraAtk:1 }, text:'指定我方 1 个单位获得追加攻击。' },
    { h:'486', n:'独走',     t:'u',  cost:4, atk:5, hp:3, load:2, kw:['charge'], text:'部署当回合即可攻击。' },
    /* 花咲里 · 武器·立场 */
    { h:'huahuli', n:'武器',     t:'u', cost:3, atk:4, hp:2, load:2, text:'武器型高攻单位。' },
    { h:'huahuli', n:'立场',     t:'or', cost:2, eff:{ buffAll:{ atk:2, hp:1 } }, text:'切【攻】：我方全场 +2/+1。' },
    { h:'huahuli', n:'剑舞公主', t:'sp', cost:4, eff:{ buffAll:{ atk:2, hp:2 } }, text:'我方全场 +2/+2。' },
    /* 猪瘟鱼 · 经济 */
    { h:'zhuweiyu', n:'人民收米术', t:'or', cost:2, eff:{ stealProd:3, stealWin:1 }, text:'偷取 3 点产出；累计 12 触发【逃跑胜利】。' },
    { h:'zhuweiyu', n:'逃跑',     t:'or', cost:1, eff:{ healHero:3 }, text:'恢复 3 点生命并保留剩余产出。' },
    { h:'zhuweiyu', n:'账本',     t:'u',  cost:2, atk:1, hp:3, load:1, eff:{ stealProd:1 }, text:'部署时偷取 1 点产出。' },
    /* 偏信 · 开包 */
    { h:'bianxin', n:'开包',   t:'or', cost:3, eff:{ scry:5 }, text:'检视牌库顶 5 张，指定 1 张入场。' },
    { h:'bianxin', n:'最优解', t:'sp', cost:4, eff:{ buffAll:{ atk:1, hp:1 } }, text:'我方全场 +1/+1。' },
    { h:'bianxin', n:'军令',   t:'or', cost:2, eff:{ gainProd:2 }, text:'产出 +2。' },
    /* 下水 · 火炮 */
    { h:'xiashui', n:'饱和式打击', t:'sp', cost:5, eff:{ finisher:{ mul:2 } }, text:'按场上火炮数 ×2 造成全场伤害。' },
    { h:'xiashui', n:'火炮',       t:'u',  cost:3, atk:2, hp:2, load:2, kw:['artillery'], text:'回合结束时对随机敌方单位造成 1 点伤害。' },
    { h:'xiashui', n:'火力覆盖',   t:'sp', cost:4, eff:{ damageAll:3 }, text:'对敌方全场造成 3 点伤害。' },
    /* 阿伟 · 制卡 */
    { h:'awe', n:'蓝图',       t:'u', cost:3, atk:3, hp:3, load:2, text:'按蓝图合成入场，不占手牌。' },
    { h:'awe', n:'更改工具',   t:'or', cost:4, eff:{ buffAll:{ atk:2, hp:0 } }, text:'我方全场 +2 攻击。' },
    { h:'awe', n:'批量制造',   t:'or', cost:3, eff:{ draw:2 }, text:'抽 2 张牌。' },
    /* 七星 · 压制 */
    { h:'qixing', n:'法力压制',   t:'sp', cost:4, eff:{ prodDeny:1 }, text:'对手产出上限永久 -1。' },
    { h:'qixing', n:'出牌封锁',   t:'or', cost:3, eff:{ forceDraw:1 }, text:'对手本回合最多出 1 张牌。' },
    { h:'qixing', n:'慢节奏斩杀', t:'sp', cost:6, eff:{ damageHero:8 }, text:'对敌方卡牌师造成 8 点伤害。' },
    /* 白猫 · 爆费 */
    { h:'baimao', n:'跳费',       t:'or', cost:1, eff:{ gainMaxProd:1, gainProd:2 }, text:'产出上限 +1，本回合产出 +2。' },
    { h:'baimao', n:'强力单卡',   t:'u',  cost:6, atk:7, hp:6, load:3, kw:['ward'], text:'高费终端单位。' },
    { h:'baimao', n:'猫步',       t:'or', cost:2, eff:{ draw:1 }, text:'抽 1 张牌。' },
    /* 小岛 · 随性 */
    { h:'xiaodao', n:'主流卡组', t:'u', cost:3, atk:3, hp:4, load:2, text:'标准数值单位。' },
    { h:'xiaodao', n:'随性',     t:'or', cost:2, eff:{ draw:1 }, text:'抽 1 张牌。' },
    { h:'xiaodao', n:'粗心',     t:'sp', cost:3, eff:{ damageHero:3 }, text:'对敌方卡牌师造成 3 点伤害。' },
    /* 李先生 · 熊猫 */
    { h:'lijinseng', n:'资本主义', t:'u', cost:1, atk:1, hp:2, load:1, text:'鸭子单位。' },
    { h:'lijinseng', n:'释放鸭子', t:'or', cost:2, eff:{ summonWeak:{ n:1, a:1, h:2 } }, text:'释放 1 只鸭子，改换敌方随机单位立场。' },
    { h:'lijinseng', n:'联合政府', t:'sp', cost:4, eff:{ buffAll:{ atk:1, hp:1 } }, text:'我方全场 +1/+1。' },
    /* 叶戈尔 · 正统 */
    { h:'yegaoer', n:'正统',     t:'sp', cost:4, eff:{ healHero:5 }, text:'恢复 5 点生命。' },
    { h:'yegaoer', n:'释放鸭子', t:'or', cost:2, eff:{ summonWeak:{ n:1, a:1, h:2 } }, text:'释放 1 只鸭子。' },
    { h:'yegaoer', n:'复活',     t:'or', cost:3, eff:{ buffAll:{ atk:1, hp:2 } }, text:'我方全场 +1/+2。' },
    /* 苏苏 · 爆发 */
    { h:'susu', n:'十月革命',   t:'sp', cost:5, eff:{ summonWeak:{ n:3, a:14, h:14 } }, text:'召唤 3 个 14/14 红军，合计 42 点攻击。' },
    { h:'susu', n:'战时共产主义', t:'or', cost:2, eff:{ gainProd:2 }, text:'产出 +2。' },
    { h:'susu', n:'为了革命的胜利前进', t:'sp', cost:6, eff:{ buffAll:{ atk:2, hp:2 } }, text:'我方全场 +2/+2。' },
    /* 榻榻米 · 堆积 */
    { h:'huangoumi', n:'榻榻米', t:'u', cost:3, atk:3, hp:4, load:2, eff:{ stackBuff:{ atk:1, hp:1 } }, text:'同类每 2 个，本卡 +1/+1。' },
    { h:'huangoumi', n:'物理',   t:'sp', cost:3, eff:{ damageAll:2 }, text:'对敌方全场造成 2 点伤害。' },
    { h:'huangoumi', n:'重建',   t:'or', cost:2, eff:{ addArmor:3 }, text:'获得 3 点承受值。' },
    /* 木头的滚动 · 堆积 */
    { h:'mutoudeguandong', n:'野人',     t:'u', cost:2, atk:2, hp:2, load:1, text:'推木头单位。' },
    { h:'mutoudeguandong', n:'推木头',   t:'or', cost:2, eff:{ summonWeak:{ n:1, a:2, h:3 } }, text:'召唤 1 个 2/3 木头。' },
    { h:'mutoudeguandong', n:'变成木头', t:'u', cost:3, atk:3, hp:5, load:2, eff:{ stackBuff:{ atk:1, hp:1 } }, text:'同类每 2 个，本卡 +1/+1。' },
    /* 蕾米 · 吸血鬼 */
    { h:'rumi', n:'吸血',   t:'u', cost:3, atk:3, hp:3, load:2, kw:['lifesteal'], text:'造成伤害时等量回复我方生命。' },
    { h:'rumi', n:'复活',   t:'or', cost:4, eff:{ buffAll:{ atk:1, hp:3 } }, text:'我方全场 +1/+3。' },
    { h:'rumi', n:'贵族',   t:'sp', cost:3, eff:{ healHero:4 }, text:'恢复 4 点生命。' },
    /* 敦贺联队 · 自爆 */
    { h:'dunhuolian', n:'自爆',     t:'u', cost:2, atk:2, hp:1, load:1, eff:{ die:4 }, text:'消灭时造成 4 点范围伤害。' },
    { h:'dunhuolian', n:'联队突贯', t:'sp', cost:4, eff:{ damageAll:3 }, text:'我方全场同时自爆。' },
    { h:'dunhuolian', n:'消耗',     t:'or', cost:2, eff:{ draw:1 }, text:'抽 1 张牌。' },
    /* 淘金 · 组合技 */
    { h:'taojin', n:'淘金链', t:'or', cost:2, eff:{ extraAtk:1 }, text:'启动组合技链。' },
    { h:'taojin', n:'组合技', t:'u', cost:3, atk:3, hp:3, load:2, kw:['charge'], text:'链条单位，可重复攻击。' },
    { h:'taojin', n:'抽风',   t:'sp', cost:4, eff:{ damageHero:5 }, text:'对敌方卡牌师造成 5 点伤害（可能反噬）。' },
    /* 假战 · 抽干 */
    { h:'jiazhan', n:'强制抽牌', t:'or', cost:3, eff:{ forceDraw:3 }, text:'对手被迫抽 3 张牌。' },
    { h:'jiazhan', n:'疲劳',     t:'or', cost:2, eff:{ fatigueUp:1 }, text:'本局疲劳基础伤害 +1。' },
    { h:'jiazhan', n:'战壕',     t:'u',  cost:3, atk:1, hp:5, load:2, kw:['taunt'], text:'耐久嘲讽。' },
    /* 绘梨衣 · 转化 */
    { h:'huangliyi', n:'变废为宝', t:'sp', cost:3, eff:{ upgrade:1 }, text:'将 1 个低费单位转化为优质单位。' },
    { h:'huangliyi', n:'优质资源', t:'u', cost:4, atk:4, hp:4, load:2, text:'高质单位。' },
    { h:'huangliyi', n:'皇冠复制', t:'or', cost:2, eff:{ draw:2 }, text:'抽 2 张牌。' },
    /* Zwest · 重装 */
    { h:'zwest', n:'苏联质量', t:'u', cost:4, atk:4, hp:6, load:2, kw:['taunt'], text:'重型坦克，嘲讽。' },
    { h:'zwest', n:'坦克',     t:'u', cost:3, atk:3, hp:4, load:2, kw:['taunt'], text:'标准坦克。' },
    { h:'zwest', n:'碾压',     t:'sp', cost:5, eff:{ damageAll:4 }, text:'对敌方全场造成 4 点伤害。' },
    /* 045 · 招募 */
    { h:'045', n:'高层名片',   t:'or', cost:3, eff:{ scry:3 }, text:'检视牌库顶 3 张，指定 1 张入场。' },
    { h:'045', n:'开发他人卡组', t:'u', cost:4, atk:3, hp:5, load:2, eff:{ draw:1 }, text:'部署时抽 1 张牌。' },
    { h:'045', n:'鲨鱼抱枕',   t:'u',  cost:2, atk:2, hp:3, load:1, text:'标准单位。' },
    /* 爻 · 战争机器 */
    { h:'fengzhu', n:'战争机器', t:'u', cost:3, atk:3, hp:3, load:2, kw:['charge'], text:'机械化推进单位。' },
    { h:'fengzhu', n:'推进',     t:'or', cost:2, eff:{ chargeAll:1 }, text:'我方全场获得【冲锋】。' },
    { h:'fengzhu', n:'机械化',   t:'sp', cost:4, eff:{ buffAll:{ atk:2, hp:0 } }, text:'我方全场 +2 攻击。' },
    /* 逆流 · 金融 */
    { h:'nixiu', n:'金融化', t:'or', cost:2, eff:{ gainProd:2 }, text:'产出 +2。' },
    { h:'nixiu', n:'利息',   t:'or', cost:3, eff:{ gainMaxProd:1 }, text:'产出上限 +1。' },
    { h:'nixiu', n:'多样化', t:'u',  cost:3, atk:3, hp:3, load:2, eff:{ gainProd:1 }, text:'部署时产出 +1。' },
    /* 木桶饭 · 补给 */
    { h:'mudongfan', n:'木桶饭', t:'sp', cost:2, eff:{ healHero:5 }, text:'恢复 5 点生命。' },
    { h:'mudongfan', n:'卖饭',   t:'or', cost:1, eff:{ healHero:3 }, text:'恢复 3 点生命。' },
    { h:'mudongfan', n:'补给',   t:'u',  cost:3, atk:2, hp:4, load:2, eff:{ healHero:2 }, text:'部署时恢复 2 点生命。' },
    /* 汐 · 潮汐 */
    { h:'zhao', n:'涨潮', t:'or', cost:2, eff:{ buffAll:{ atk:2, hp:0 } }, text:'涨潮：我方全场 +2 攻击。' },
    { h:'zhao', n:'退潮', t:'or', cost:2, eff:{ buffAll:{ atk:0, hp:2 } }, text:'退潮：我方全场 +2 承受值。' },
    { h:'zhao', n:'潮汐', t:'sp', cost:4, eff:{ buffAll:{ atk:1, hp:1 } }, text:'我方全场 +1/+1。' },
    /* 愚蠢 · 混沌 */
    { h:'hunshen', n:'变鸭术',   t:'sp', cost:3, eff:{ handPollute:2 }, text:'将对手牌库顶 2 张卡变为「鸭子」。' },
    { h:'hunshen', n:'卡组破坏', t:'or', cost:2, eff:{ handPollute:1 }, text:'将对手牌库顶 1 张卡变为「鸭子」。' },
    { h:'hunshen', n:'随便穿',   t:'u',  cost:2, atk:2, hp:2, load:1, text:'标准单位。' },
    /* 梦的原野 · 形态 */
    { h:'mengyuan', n:'灵识改卡', t:'sp', cost:3, eff:{ buffAll:{ atk:2, hp:0 } }, text:'直接修改 1 个单位属性。' },
    { h:'mengyuan', n:'禁忌',     t:'sp', cost:5, eff:{ summonWeak:{ n:1, a:6, h:6 } }, text:'制造 1 个 6/6 单位。' },
    { h:'mengyuan', n:'卷心菜',   t:'u',  cost:1, atk:1, hp:2, load:1, text:'形态转换单位。' },
    /* 皇冠最初拥有者 · 不可知 */
    { h:'huanguanzhuyou', n:'空白',   t:'u', cost:3, atk:3, hp:3, load:2, text:'描述被遮蔽。' },
    { h:'huanguanzhuyou', n:'源头',   t:'or', cost:2, eff:{ draw:1 }, text:'描述被遮蔽。' },
    { h:'huanguanzhuyou', n:'不可知', t:'sp', cost:4, eff:{ damageHero:4 }, text:'描述被遮蔽。' },
    /* 年猪了 · 年礼 */
    { h:'nianzhu', n:'年礼',   t:'sp', cost:3, eff:{ wardAll:1 }, text:'我方全场获得【圣盾】。' },
    { h:'nianzhu', n:'祝福',   t:'or', cost:2, eff:{ healHero:3 }, text:'恢复 3 点生命。' },
    { h:'nianzhu', n:'团圆',   t:'u',  cost:3, atk:2, hp:4, load:2, text:'祝福单位。' },
    /* 书宇行者 · 游走 */
    { h:'shuyuxingzhe', n:'游走',   t:'or', cost:2, eff:{ draw:1 }, text:'交换我方单位位置。' },
    { h:'shuyuxingzhe', n:'换位',   t:'sp', cost:3, eff:{ buffAll:{ atk:1, hp:1 } }, text:'移动 1 个单位，替换敌方位置。' },
    { h:'shuyuxingzhe', n:'行者',   t:'u',  cost:3, atk:3, hp:3, load:2, kw:['charge'], text:'可位移单位。' },
    /* 字母 · 新式战法 */
    { h:'zimu', n:'新式战法',   t:'sp', cost:3, eff:{ chargeAll:1 }, text:'消除全场「无法攻击卡牌师」效果，我方全场获得【冲锋】。' },
    { h:'zimu', n:'超模单位',   t:'u',  cost:4, atk:6, hp:5, load:2, kw:['charge'], text:'超模冲锋单位，攻击可穿透嘲讽。' },
    { h:'zimu', n:'规则消除',   t:'sp', cost:5, eff:{ damageHero:7 }, text:'直伤突破，无视嘲讽与圣盾。' },
    /* 肉铺子 · 过载制卡 */
    { h:'roupuzi', n:'制卡',     t:'u', cost:4, atk:4, hp:4, load:2, text:'按蓝图合成入场。' },
    { h:'roupuzi', n:'过载',     t:'sp', cost:5, eff:{ buffAll:{ atk:3, hp:0 } }, text:'我方全场 +3 攻击（可能反噬自身）。' },
    { h:'roupuzi', n:'批量卡',   t:'or', cost:3, eff:{ draw:2 }, text:'抽 2 张牌。' },
    /* 上书房行走 · 赌局 */
    { h:'shangshufang', n:'快速拔枪', t:'or', cost:2, eff:{ draw:1 }, text:'抢先手，抽 1 张牌。' },
    { h:'shangshufang', n:'套索',     t:'sp', cost:3, eff:{ killWeak:2 }, text:'控制并消灭敌方攻击 ≤2 的单位。' },
    { h:'shangshufang', n:'正午决斗', t:'sp', cost:6, eff:{ damageHero:8 }, text:'1v1 拼点，胜方造成 8 点伤害。' }
  ];

  /* =====================================================================
   * 注册 + 导出
   * =================================================================== */
  (GENERIC.concat(SPELLS, SIGNATURE)).forEach(C);

  /* 通用鸭子：愚蠢体系污染单位 */
  C({ n:'鸭子', cost:0, atk:1, hp:1, load:1, text:'被【变鸭术】洗入卡组时的填充单位。' });

  /* =====================================================================
   * 卡组构筑
   * ----------------------------------------------------------------------------
   * 30 张牌组 = 专属卡（终端 ×1 + 另 2 张各 ×2）+ 通用卡 22 张
   * 通用卡从该英雄的 3 个功能组里抽，单张最多 2 张（终端/特殊卡 1 张）。
   * =================================================================== */

  /* 通用卡分组 */
  var GROUPS = {
    cheap:  ['列兵', '民兵', '哨兵', '牧师', '税吏', '弩手'],
    mid:    ['战士', '剑士', '术士', '斥候', '工匠', '游侠', '驱散者', '吸血蝠', '叛军'],
    heavy:  ['骑士', '猎人', '召唤者', '民兵队长', '工程师'],
    tank:   ['坦克', '守卫', '圣骑士', '巨人', '工程师'],
    gun:    ['炮手', '炮兵', '重炮'],
    rush:   ['突击手', '突袭者', '恶魔', '魔王', '剑士'],
    bomb:   ['自爆兵', '复仇者', '殉道者'],
    util:   ['术士', '斥候', '招募官', '驱散者', '税吏', '工匠', '牧师']
  };

  /* archetype → 3 个功能组 */
  var ARCH_GROUPS = {
    ritual:   ['util', 'tank', 'heavy'],
    mastery:  ['util', 'mid', 'heavy'],
    swarm:    ['cheap', 'mid', 'bomb'],
    weather:  ['util', 'heavy', 'mid'],
    random:   ['util', 'mid', 'cheap'],
    reflect:  ['tank', 'util', 'heavy'],
    ascend:   ['mid', 'heavy', 'tank'],
    taboo:    ['tank', 'util', 'heavy'],
    wipe:     ['util', 'tank', 'mid'],
    psych:    ['util', 'heavy', 'mid'],
    dmg:      ['rush', 'cheap', 'util'],
    rage:     ['rush', 'mid', 'cheap'],
    stance:   ['mid', 'heavy', 'tank'],
    economy:  ['util', 'mid', 'cheap'],
    pack:     ['util', 'heavy', 'mid'],
    artillery:['gun', 'tank', 'mid'],
    craft:    ['util', 'heavy', 'mid'],
    denial:   ['util', 'tank', 'mid'],
    curve:    ['util', 'heavy', 'mid'],
    flexible: ['mid', 'heavy', 'cheap'],
    panda:    ['cheap', 'mid', 'bomb'],
    burst:    ['util', 'heavy', 'tank'],
    stack:    ['mid', 'cheap', 'heavy'],
    undead:   ['cheap', 'util', 'heavy'],
    suicide:  ['bomb', 'cheap', 'mid'],
    combo:    ['rush', 'mid', 'cheap'],
    fatigue:  ['util', 'mid', 'cheap'],
    convert:  ['cheap', 'mid', 'heavy'],
    armor:    ['tank', 'heavy', 'mid'],
    recruit:  ['util', 'heavy', 'mid'],
    war:      ['heavy', 'rush', 'tank'],
    food:     ['cheap', 'util', 'tank'],
    tide:     ['mid', 'heavy', 'tank'],
    chaos:    ['cheap', 'mid', 'util'],
    morph:    ['mid', 'heavy', 'util'],
    unknown:  ['mid', 'heavy', 'util'],
    bless:    ['cheap', 'util', 'tank'],
    roam:     ['mid', 'rush', 'heavy'],
    outlaw:   ['rush', 'mid', 'bomb'],
    gamble:   ['mid', 'rush', 'heavy']
  };

  /* 构建牌组。rng = 随机源，默认 Math.random */
  function buildDeck(heroKey, rng) {
    rng = rng || Math.random;
    var H = root.HeroData.HEROES[heroKey];
    if (!H) return [];
    var sigs = SIGNATURE.filter(function (c) { return c.h === heroKey; });
    var arch = Array.isArray(H.arch) ? H.arch[0] : H.arch;
    var groups = ARCH_GROUPS[arch] || ARCH_GROUPS.flexible;

    var deck = [];
    /* 专属卡：第 1 张终端 ×1，其余 ×2 */
    sigs.forEach(function (c, i) {
      var copies = (i === sigs.length - 1 && c.cost >= 4) ? 1 : 2;
      for (var k = 0; k < copies; k++) deck.push(c.n);
    });

    /* 通用卡：三个组里随机取，单张上限 2 */
    var counts = {};
    var pools = groups.map(function (g) { return GROUPS[g].slice(); });
    var gi = 0;
    while (deck.length < 30) {
      var pool = pools[gi % pools.length];
      var name = pool[Math.floor(rng() * pool.length)];
      var c = CARDS[name];
      if (!c) { gi++; continue; }
      if (counts[name] >= 2) { gi++; continue; }
      if (c.h) { gi++; continue; }   /* 专属卡不进通用部分 */
      deck.push(name);
      counts[name] = (counts[name] || 0) + 1;
      gi++;
    }
    return deck.slice(0, 30);
  }

  /* 洗牌 */
  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var _src = CARDS;

  root.CardData = {
    CARDS: CARDS,
    /* 运行期卡牌源：肉鸽 run 的改造卡通过 setSource 注入 */
    setSource: function (src) { _src = src || CARDS; },
    get: function (n) { return _src[n] || null; },
    GENERIC: GENERIC,
    SPELLS: SPELLS,
    SIGNATURE: SIGNATURE,
    GROUPS: GROUPS,
    ARCH_GROUPS: ARCH_GROUPS,
    byName: function (n) { return CARDS[n] || null; },
    buildDeck: buildDeck,
    shuffle: shuffle,
    signatureOf: function (key) {
      return SIGNATURE.filter(function (c) { return c.h === key; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
