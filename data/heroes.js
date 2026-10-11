/* ============================================================================
 * 皇冠·卡牌战斗 — 英雄数据 / HEROES
 * ----------------------------------------------------------------------------
 * 术语表（全项目统一）
 *   cost     费用            maxProd / prod  产出上限 / 本回合可用产出
 *   maxLoad  承受力上限     load            当前承受力（= 战场满编数）
 *   atk / hp 攻击 / 生命值  handMax         手牌上限
 *   fatigue  疲劳            kw            关键词（见 KW）
 *   archetype  派系机制簇，由 engine 实现（见 ARCHETYPES）
 *
 * 数据来源：history.txt（世界观 + 卡组特色）+ HANDOVER.md（41 名英雄列表）
 * 机制原则：42 名英雄归入 42 个可实现的机制簇，每名英雄挂 1–2 簇 + 3 张专属卡。
 * ========================================================================== */
(function (root) {
  'use strict';

  /* ---------------- 关键词 ---------------- */
  var KW = {
    taunt:       { zh: '嘲讽',  desc: '敌方单位必须优先攻击此单位。' },
    charge:      { zh: '冲锋',  desc: '部署当回合即可攻击。' },
    artillery:   { zh: '火炮',  desc: '回合结束时对随机敌方单位造成 1 点伤害。' },
    deathrattle: { zh: '亡语',  desc: '此单位被消灭时结算一次效果。' },
    ward:        { zh: '圣盾',  desc: '受到致命伤害时先消耗圣盾，单位存活。' },
    lifesteal:   { zh: '吸血',  desc: '此单位造成伤害时，等同量回复我方卡牌师生命。' },
    dispel:      { zh: '驱散',  desc: '移除目标单位身上的增益效果。' },
    aura:        { zh: '光环',  desc: '只要此单位在场即持续生效。' },
    draw:        { zh: '过牌',  desc: '立即抽牌。' },
    finisher:    { zh: '终端',  desc: '终局斩杀型卡，费用极高，效果无上限。' }
  };

  /* ---------------- 派系机制簇 ---------------- */
  var ARCHETYPES = {
    ritual:     { tag: '仪式',       note: '英灵槽累计，满槽触发抹除。启动慢，无容错。' },
    mastery:    { tag: '技艺',       note: '手牌越满收益越高，考验抽牌与费用规划。' },
    swarm:      { tag: '铺场',       note: '廉价单位铺满战场，以数量换过牌。' },
    weather:    { tag: '天候',       note: '每回合掷天候骰，结果可被操控为确定值。' },
    random:     { tag: '随机',       note: '每回合获得随机资源，接受随机而非控制随机。' },
    reflect:    { tag: '反弹',       note: '叠甲与伤害反弹，等待对手先动手。' },
    ascend:     { tag: '递进',       note: '每回合全场增益不可逆地累积。' },
    taboo:      { tag: '禁忌',       note: '禁忌之卡，一回合无敌窗口，条件苛刻。' },
    wipe:       { tag: '群解',       note: '多张群体法术，压制铺场。' },
    psych:      { tag: '精神控制',   note: '干扰对手判断与牌序，不追求场面优势。' },
    dmg:        { tag: '直伤',       note: '法术直接攻击卡牌师生命，无视嘲讽。' },
    rage:       { tag: '连击',       note: '攻击次数可无限叠加，怕被解场断链。' },
    stance:     { tag: '武器·立场',  note: '武器卡叠加攻击力，立场改变命中规则。' },
    economy:    { tag: '经济',       note: '偷取产出并修改胜利条件。' },
    pack:       { tag: '开包',       note: '每回合从卡包中指定抽取最优解。' },
    artillery:  { tag: '火炮',       note: '火炮单位常驻，终端卡按数量放大伤害。' },
    craft:      { tag: '制卡',       note: '以蓝图消耗产出，合成指定单位入场。' },
    denial:     { tag: '压制',       note: '削减对手产出上限并封锁出牌。' },
    curve:      { tag: '爆费',       note: '快速累积产出，为终端单卡买单。' },
    flexible:   { tag: '随性',       note: '卡池宽泛，无固定曲线，容错靠数值。' },
    panda:      { tag: '熊猫',       note: '释放单位，改换目标立场并触发联动。' },
    burst:      { tag: '爆发',       note: '集中单回合铺出超模单位，一波定胜负。' },
    stack:      { tag: '堆积',       note: '同名牌组堆积，层数决定伤害。' },
    undead:     { tag: '吸血鬼',     note: '吸血与亡语复活，适合持久消耗。' },
    suicide:    { tag: '自爆',       note: '单位死亡时对相邻敌人造成范围伤害。' },
    combo:      { tag: '组合技',     note: '链条可无限延伸，也可能自毁。' },
    fatigue:    { tag: '抽干',       note: '强制对手抽牌，靠疲劳伤害磨死。' },
    convert:    { tag: '转化',       note: '把低质量资源转换为等值优质资源。' },
    armor:      { tag: '重装',       note: '高承受力单位，不叠效果只拼数值。' },
    recruit:    { tag: '招募',       note: '从库顶检视并指定单位入场。' },
    war:        { tag: '战争机器',   note: '工业化、机械化推进，稳定碾压。' },
    food:       { tag: '补给',       note: '以食物回复生命并叠加增益。' },
    tide:       { tag: '潮汐',       note: '涨潮与退潮交替，规则周期性翻转。' },
    chaos:      { tag: '混沌',       note: '完全随机，可能神抽也可能自爆。' },
    morph:      { tag: '形态',       note: '本体可变形，形态不同机制不同。' },
    unknown:    { tag: '不可知',     note: '卡组内容对双方均不可见。' },
    bless:      { tag: '年礼',       note: '周期性为全场单位叠加祝福增益。' },
    roam:       { tag: '游走',       note: '单位可在战场间换位，绕开嘲讽。' },
    outlaw:     { tag: '法外',       note: '消除规则限制，强制命中卡牌师。' },
    gamble:     { tag: '赌局',       note: '以点数比试决定伤害或胜利。' }
  };

  /* ---------------- 阵营 / 梯队 ---------------- */
  var FAC = {
    kaz: '卡兹帝国', guacao: '凹槽帝国', comet: '彗星国', sock: '袜子国',
    duck: '鸭子联合政府', shell: '贝壳国', monster: '小怪兽国', benz: '奔驰国',
    ding: '定于国', prussia: '普鲁士国', nixiug: '逆流国', frame: '架子班', unknown: '不明'
  };

  var HEROES = {};
  function H(o) { HEROES[o.key] = o; return o; }
  /* ---- 1. 克里斯蒂安松 · 帝国元首 ---- */
  H({ key:'kristiansen', name:'克里斯蒂安松', title:'帝国元首', arch:'ritual',
    fac:['kaz'], tier:'顶尖', hp:24, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'黑箱仪式',
    skillDesc:'支付 3 点产出，英灵槽 +1（上限 3）。槽满时立刻触发【抹除】：对敌方全场造成 6 点伤害，并抽 1 张牌。',
    ability:'ritualSlot',
    trait:'慢速终结。全程零主动输出，靠仪式组件与英灵沟通媒介凑满槽位，一旦触发即从存在层面结束对局。启动周期长、条件苛刻，且卡牌师本人的维护意愿是唯一的胜负手。',
    cards:['英灵媒介','防火墙组件','仪式祭品'] });

  /* ---- 2. Jking7 · 战术大师 ---- */
  H({ key:'jking7', name:'Jking7', title:'战术大师', arch:'mastery',
    fac:['kaz','frame'], tier:'顶尖', hp:22, maxLoad:5, handMax:8, prod1:3, prodGrowth:1,
    skillName:'三十年冠军',
    skillDesc:'支付 2 点产出。若手牌数 ≥ 4，抽 2 张牌并给手中所有单位 +1/+1；手牌不足时仅抽 1 张。',
    ability:'handSynergy',
    trait:'纯牌技。卡组单卡质量已随年代衰减，胜负完全由出牌顺序、费用分配与对对手节奏的预判决定。高配牌时上限极高，但没有任何一张卡能单独救命。',
    cards:['对局拆解','费用精算','基础卡组'] });

  /* ---- 3. 八幡 · 战术执行 ---- */
  H({ key:'yato', name:'八幡', title:'战术执行', arch:'swarm',
    fac:['kaz'], tier:'顶尖', hp:20, maxLoad:6, handMax:8, prod1:3, prodGrowth:1,
    skillName:'海盗船',
    skillDesc:'支付 2 点产出，召唤 2 个 1/2 海盗。场上每有 2 个海盗，额外抽 1 张牌。',
    ability:'swarmDraw',
    trait:'快攻铺场。前 3 回合把承受力打满，用单位数量换过牌量，滚雪球能力极强。被群体法术清场后需要 2 回合重建节奏；海盗本体质量不稳定，铺出来的场面有好有坏。',
    cards:['劫掠','海盗王','复仇主义'] });

  /* ---- 4. SIE · 控制者 ---- */
  H({ key:'sie', name:'SIE', title:'控制者', arch:'weather',
    fac:['kaz'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'大太阳神',
    skillDesc:'支付 2 点产出，重掷本回合天候骰（1–6），可连续掷直到满意为止（每掷一次额外支付 1 点）。',
    ability:'weatherDie',
    trait:'唯一能把随机变成确定值的体系。普通对手只能赌天候，她用技能锁死结果：4 点以上触发伤害加成、3 点触发回复、1–2 点触发范围打击。赛前即可推算当日天候并据此调整卡组。',
    cards:['预报','极端天气','大太阳神'] });

  /* ---- 5. Tangentle/Spoker · 牌桌之主 ---- */
  H({ key:'tangentspoker', name:'Tangentle/Spoker', title:'牌桌之主', arch:'random',
    fac:['kaz','frame'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'接受随机',
    skillDesc:'支付 1 点产出，随机获得一项资源：产出 +2 / 抽 1 张牌 / 全场我方单位 +1/+1 / 敌方全体 -1/-1。',
    ability:'randomRes',
    trait:'每回合稳定滚入随机资源，总量长期高于常规卡组。她不控制随机，她接受随机并利用随机——与 SIE 的「操控」是两种完全不同的答案。前期脆弱，只要能撑过前 4 回合，资源差会一边倒。',
    cards:['资源牌','随机获得','牌桌协议'] });

  /* ---- 6. 66better/黄立新 · 双六之主 ---- */
  H({ key:'better66', name:'66better/黄立新', title:'双六之主', arch:'reflect',
    fac:['kaz'], tier:'顶尖', hp:24, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'镜面反射',
    skillDesc:'支付 2 点产出，获得 4 点承受值（上限可叠）。本回合你受到的所有伤害改为由对手承受。',
    ability:'reflect',
    trait:'零主动进攻，靠叠甲与反弹被动赢下交换。打快攻时靠承受值拖进后期，打控制时靠反弹反伤。唯一的软肋是对面完全不出手的卡组——他没有起手手段。',
    cards:['完全防御','换命的奇迹','精准投掷'] });

  /* ---- 7. 青 · 青云直上 ---- */
  H({ key:'qing', name:'青', title:'青云直上', arch:'ascend',
    fac:['kaz'], tier:'第二', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'青云',
    skillDesc:'被动。每回合开始时，我方全体单位 +1/+1，永久叠加。',
    ability:'stackBuff',
    trait:'递进型控制。单回合强度极低，但增益不可逆且不可驱散，回合数本身就是他的武器。前 3 回合处于劣势，第 7 回合后几乎无法被翻盘。怕快攻在他铺起来之前把生命打完。',
    cards:['青云直上','学养','积学'] });

  /* ---- 8. 张猪 · 猪猪侠 ---- */
  H({ key:'zhangzhu', name:'张猪', title:'猪猪侠', arch:'taboo',
    fac:['guacao'], tier:'顶尖', hp:20, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'禁忌召唤',
    skillDesc:'支付 4 点产出，召唤【超人SUPERMAN】6/6，持续 1 个完整回合：其攻击无视承受值，且你本回合可多攻击 1 次。',
    ability:'superman',
    trait:'卡组极薄，几乎只有一张卡。禁忌之卡生效的那一回合里她接近无敌；窗口只有 1 回合，必须精确卡在对手承受值见底时打出。召唤条件苛刻，因此她几乎每回合都在解场、逃跑、拖延。',
    cards:['禁忌之卡','逃跑','例行复仇'] });

  /* ---- 9. 停尸 · 停尸间 ---- */
  H({ key:'ting', name:'停尸', title:'停尸间', arch:'wipe',
    fac:['guacao'], tier:'顶尖', hp:23, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'停尸间',
    skillDesc:'支付 2 点产出，消灭敌方场上所有攻击值 ≤ 3 的单位。',
    ability:'wipeLow',
    trait:'卡组里装了 4 张群体解场。不追求爆发，只追求让对面铺不起来——解场、过牌、再解场，直到对手牌库耗尽。他自己也几乎没有终结手段，容易把对局拖到双方同归于尽。',
    cards:['群解·四张','加班','老成员'] });

  /* ---- 10. 王九日 · 九日之主 ---- */
  H({ key:'wujiuri', name:'王九日', title:'九日之主', arch:'psych',
    fac:['guacao'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'精神控制',
    skillDesc:'支付 2 点产出，翻开对手手牌，随机洗回 2 张，并令对手本回合抽牌数 -1。',
    ability:'mindDisrupt',
    trait:'攻击的不是场面，是对手的决策本身。迫使暴露手牌、干扰抽牌节奏、塞入虚假信息。对意志坚定的对手效果衰减，但大多数卡牌师坐在她对面就已经开始出错。威胁度大于纯战力。',
    cards:['心理战','暴露手牌','干扰计时'] });

  /* ---- 11. 发廊 · 理发师 ---- */
  H({ key:'falu', name:'发廊', title:'理发师', arch:'dmg',
    fac:['guacao'], tier:'顶尖', hp:19, maxLoad:5, handMax:8, prod1:3, prodGrowth:1,
    skillName:'剪刀手',
    skillDesc:'支付 3 点产出，对敌方卡牌师造成 5 点伤害（无视嘲讽与承受值）。',
    ability:'faceDmg',
    trait:'不讲场面交换，全程打脸。卡组全是直伤法术与冲锋单位，嘲讽对他无效。打法简单到没有配合可言：你不挡就死，你挡了我就继续打脸。激进到惹遍所有势力，曾被联合绞杀，近期刚被救活。',
    cards:['直伤','冲锋','理发'] });

  /* ---- 12. 486 · 神秘代号 ---- */
  H({ key:'486', name:'486', title:'神秘代号', arch:'rage',
    fac:['guacao'], tier:'顶尖', hp:20, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'狂暴',
    skillDesc:'指定我方一个单位，令其本回合获得【追加攻击】：每次攻击后额外攻击 1 次，可连续叠加。',
    ability:'extraAtk',
    trait:'狂战连击。每次命中都延长连击链，后期单回合能打出十几次攻击。前期刻意压低调子攒单位，中期开始接链。极度怕控制：只要连击单位被解掉或失去目标，整条输出链断掉，本回合归零。',
    cards:['连击链','追加攻击','独走'] });

  /* ---- 13. 花咲里 · 花之使者 ---- */
  H({ key:'huahuli', name:'花咲里', title:'花之使者', arch:'stance',
    fac:['guacao'], tier:'第二', hp:21, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'剑舞',
    skillDesc:'切换立场【守】/【攻】。【守】：我方全体 +2 承受值；【攻】：我方全体 +2 攻击，但承受值 -1。每次切换消耗 2 点产出。',
    ability:'stance',
    trait:'武器卡叠加攻击力，立场决定命中规则与承伤分配。剑舞形态下武器攻击翻倍、立场效果增强。擅长在复杂局面里挑最优立场再收割——赢在判断，不在数值。',
    cards:['武器','立场','剑舞公主'] });

  /* ---- 14. 猪瘟鱼 · 病鱼 ---- */
  H({ key:'zhuweiyu', name:'猪瘟鱼', title:'病鱼', arch:'economy',
    fac:['guacao'], tier:'第二', hp:21, maxLoad:5, handMax:7, prod1:4, prodGrowth:1,
    skillName:'人民收米术',
    skillDesc:'支付 1 点产出，从对手处偷取 3 点产出。产出累计达到 12 点时触发【逃跑胜利】，直接结束对局并视为获胜。',
    ability:'stealWin',
    trait:'偷取与逃逸。卡组里全是干扰、偷取、撤退组件，胜利条件被改写：只要偷够产出并成功离场即判定胜利。对手极难受——打了输要掉产出，赢了也抓不到人。因这场政斗直接把张猪逼到心力交瘁。',
    cards:['人民收米术','逃跑','账本'] });
  /* ---- 15. 偏信 · 偏信者 ---- */
  H({ key:'bianxin', name:'偏信', title:'偏信者', arch:'pack',
    fac:['guacao'], tier:'第二', hp:21, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'即时开包',
    skillDesc:'支付 2 点产出，检视本回合开包池全部候选，指定抽取其中 1 张入场（跳过随机）。',
    ability:'pickBest',
    trait:'跳过随机性。每回合打开一个卡包并从候选里挑当前局势下的最优解，永远不卡手、永远有最优牌。代价是挑选本身消耗时间：对手若在他的开包期给足压力，他可能来不及选完就先输。',
    cards:['开包','最优解','军令'] });

  /* ---- 16. 下水 · 下水之灵 ---- */
  H({ key:'xiashui', name:'下水', title:'下水之灵', arch:'artillery',
    fac:['frame'], tier:'顶尖', hp:22, maxLoad:6, handMax:7, prod1:3, prodGrowth:1,
    skillName:'饱和式打击',
    skillDesc:'支付 4 点产出，对敌方全场造成（我方火炮数 × 2）点伤害。卡组共 4 张，可跨回合连续覆盖。',
    ability:'artilleryEnd',
    trait:'火力覆盖型，不玩花的。卡组核心是常驻火炮单位，每回合结算一次小额伤害，数量多、范围广、无差别。终端卡按场上火炮数量放大，4 张意味着他能在 4 回合内连续覆盖——几乎没有卡组撑得过四轮饱和打击。',
    cards:['饱和式打击','火炮','火力覆盖'] });

  /* ---- 17. 阿伟 · 阿伟哥 ---- */
  H({ key:'awe', name:'阿伟', title:'阿伟哥', arch:'craft',
    fac:['frame'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:4, prodGrowth:1,
    skillName:'蓝图',
    skillDesc:'支付 3 点产出，按蓝图合成一张指定单位入场（不占手牌，直接进入战场）。',
    ability:'craft',
    trait:'卡组不是用来打牌的，是用来造牌的。技术即战力：蓝图决定能造出什么结构，产出决定造得起多少。批量制造创始人，造出来的东西可以武装整个架子班。制卡前必须先行确认对手可承受——这条规矩是他亲手立的。',
    cards:['蓝图','更改工具','批量制造'] });

  /* ---- 18. 七星 · 七星连珠 ---- */
  H({ key:'qixing', name:'七星', title:'七星连珠', arch:'denial',
    fac:['comet','frame'], tier:'顶尖', hp:23, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'七星连珠',
    skillDesc:'支付 3 点产出，将对手产出上限永久 -1（可叠加），并令对手本回合最多出 1 张牌。',
    ability:'prodDeny',
    trait:'毁灭对手的产出并封锁出牌，把对局拖进自己的节奏里耗死。对手的费用越来越少、能出的牌越来越少，最后被慢节奏斩杀。极其折磨——她不急着赢，她只是让你慢慢输。批量卡偏机制。',
    cards:['法力压制','出牌封锁','慢节奏斩杀'] });

  /* ---- 19. 白猫 · 白猫君 ---- */
  H({ key:'baimao', name:'白猫', title:'白猫君', arch:'curve',
    fac:['comet','frame'], tier:'第二', hp:21, maxLoad:5, handMax:7, prod1:3, prodGrowth:2,
    skillName:'快速跳费',
    skillDesc:'支付 1 点产出，产出上限 +1，且本回合产出 +2（不累积到下一回合）。',
    ability:'ramp',
    trait:'跳费流。前期用低费加速卡把产出堆到 10 以上，中期直接打出超模终端单卡收工。打法简单直接，全靠费用计算与出手时机；一旦跳费成功，对手几乎没有翻盘窗口。',
    cards:['跳费','强力单卡','猫步'] });

  /* ---- 20. 小岛 · 小岛主 ---- */
  H({ key:'xiaodao', name:'小岛', title:'小岛主', arch:'flexible',
    fac:['sock'], tier:'第二', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'主流卡组',
    skillDesc:'支付 2 点产出，从牌库中随机检索 1 张费用 ≤ 3 的单位入场。',
    ability:'genericDraw',
    trait:'标准主流数值体系，单卡质量高、配合稳定，但完全没有个人特色。打法随性，经常因为粗心输掉本该拿下的对局。曾经较强，技术发展之后已经不太够看。批量卡偏数值。',
    cards:['主流卡组','随性','粗心'] });

  /* ---- 21. 南京市民李先生 · 市民 ---- */
  H({ key:'lijinseng', name:'南京市民李先生', title:'市民', arch:'panda',
    fac:['duck'], tier:'第三', hp:22, maxLoad:6, handMax:7, prod1:3, prodGrowth:1,
    skillName:'释放鸭子',
    skillDesc:'支付 2 点产出，释放 1 只鸭子（共 4 只）。鸭子入场后，敌方场上随机 1 个单位改为【资本主义】立场并获得 +1/+1。',
    ability:'duckRelease',
    trait:'搞笑但有效的组合技。四只鸭子各带独立效果，释放后可改换敌方单位立场并触发联动。经常在对手完全没预料到的回合翻盘。他是叶戈尔的分身，具备独立意识，必要时可复活叶戈尔——需要时间。',
    cards:['资本主义','释放鸭子','联合政府'] });

  /* ---- 22. 叶戈尔 · 叶戈尔 ---- */
  H({ key:'yegaoer', name:'叶戈尔', title:'叶戈尔', arch:'panda',
    fac:['duck'], tier:'第三', hp:23, maxLoad:6, handMax:7, prod1:3, prodGrowth:1,
    skillName:'正统之姿',
    skillDesc:'支付 2 点产出，释放 1 只鸭子；若本回合未被造成伤害，额外释放 1 只。',
    ability:'duckRelease',
    trait:'与李先生的卡组同源，但他是本体。多次死亡复活，被伪造罪行后遭天道降下天谴，目前处于半死不活状态。各派系都在等他复活；复活后卡组内容会更新，具体更新内容未知。',
    cards:['正统','释放鸭子','复活'] });

  /* ---- 23. 苏苏 · 苏苏 ---- */
  H({ key:'susu', name:'苏苏', title:'苏苏', arch:'burst',
    fac:['frame','comet','duck'], tier:'顶尖', hp:20, maxLoad:6, handMax:7, prod1:3, prodGrowth:1,
    skillName:'十月革命',
    skillDesc:'支付 5 点产出，单回合召唤 3 个 14/14【俄罗斯布尔什维克红军】，合计 42 点攻击——单次终结线。',
    ability:'susanoo',
    trait:'爆发铺场，一回合内把三个超模单位摆上战场，42 点斩杀线直接结束对局。已退出军事一线只保留政治与象征地位，但卡组本身仍然能打，因此仍接受挑战。',
    cards:['十月革命','战时共产主义','为了革命的胜利前进'] });

  /* ---- 24. 榻榻米 · 榻榻米 ---- */
  H({ key:'huangoumi', name:'榻榻米', title:'榻榻米', arch:'stack',
    fac:['duck'], tier:'第三', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'榻榻米打人',
    skillDesc:'支付 3 点产出，召唤 1 个【榻榻米】3/4。每次你场上存在 1 个以上榻榻米，本卡费用 -1 且攻击 +1。',
    ability:'sameStack',
    trait:'一张卡，效果是打人。没有组合技、没有机制、没有配合——就是打人。病重导致打人力度下降，但卡组本身没变。经历凹槽深造、开荒建国、被代管、覆亡、被迫出山重建之后，他手里还是只有这一张卡。',
    cards:['榻榻米','物理','重建'] });

  /* ---- 25. 木头的滚动 · 木头 ---- */
  H({ key:'mutoudeguandong', name:'木头的滚动', title:'木头', arch:'stack',
    fac:['duck'], tier:'第三', hp:21, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'野人推木头',
    skillDesc:'支付 2 点产出，召唤 1 个【木头】2/3。场上每有 2 个木头，额外获得 1 点产出。',
    ability:'sameStack',
    trait:'堆叠推进。可以变成一堆木头，让野人推着滚出去攻击——本体即卡组。木头的层数决定产出与伤害，越滚越厚。鸭子初始内阁成员。',
    cards:['野人','推木头','变成木头'] });

  /* ---- 26. 蕾米 · 蕾米 ---- */
  H({ key:'rumi', name:'蕾米', title:'蕾米', arch:'undead',
    fac:['duck'], tier:'第三', hp:23, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'血族祝福',
    skillDesc:'支付 2 点产出，本场战斗你造成的所有伤害的 50% 转为回复自身生命。',
    ability:'lifestealPass',
    trait:'吸血与复活。造成伤害即回复生命，关键单位死亡后可再复活一次。偏消耗型，适合持久战；对快攻的爆发伤害没有太多应对手段。鸭子初始内阁成员。',
    cards:['吸血','复活','贵族'] });

  /* ---- 27. 敦贺联队 · 联队 ---- */
  H({ key:'dunhuolian', name:'敦贺联队', title:'联队', arch:'suicide',
    fac:['duck'], tier:'第三', hp:20, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'联队突贯',
    skillDesc:'支付 3 点产出，场上我方全部单位同时自爆：对相邻敌方单位造成 3 点伤害。',
    ability:'suicideAll',
    trait:'全员自爆。每一个单位都是消耗品，死亡时结算范围伤害——包括他自己。打法极其激进，用自爆单位精准换掉对方的关键单位。悲壮之处在于代价永远是自己。鸭子初始内阁成员。',
    cards:['自爆','联队突贯','消耗'] });

  /* ---- 28. 淘金 · 淘金者 ---- */
  H({ key:'taojin', name:'淘金', title:'淘金者', arch:'combo',
    fac:['duck','frame'], tier:'第三', hp:20, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'淘金组合',
    skillDesc:'支付 2 点产出，启动组合技链：本回合你的每个单位均可重复攻击，且连续攻击伤害递增。链条每断一次，本回合受到伤害 +3。',
    ability:'comboChain',
    trait:'理论上可打出无限伤害，但链条会抽风——有时断、有时连、有时把自己打死。无限伤害是上限，抽风是下限，连他本人也不确定今天会不会抽风。鸭子创始者之一。',
    cards:['淘金链','组合技','抽风'] });
  /* ---- 29. 假战 · 假战 ---- */
  H({ key:'jiazhan', name:'假战', title:'假战', arch:'fatigue',
    fac:['duck'], tier:'第三', hp:23, maxLoad:5, handMax:6, prod1:3, prodGrowth:1,
    skillName:'强制抽牌',
    skillDesc:'支付 2 点产出，强制对手抽 3 张牌。牌库抽空后，对手每回合开始受到疲劳伤害（递增 1 点）。',
    ability:'forceDraw',
    trait:'强制抽干。不追求场面优势，只让对手快速抽空牌库，之后靠递增的疲劳伤害磨死。打法偏折磨，适合消耗战；遇到牌库深厚的对手需要打得更久。假战维新派建立者。',
    cards:['强制抽牌','疲劳','战壕'] });

  /* ---- 30. 绘梨衣 · 绘梨衣 ---- */
  H({ key:'huangliyi', name:'绘梨衣', title:'绘梨衣', arch:'convert',
    fac:['monster','frame'], tier:'第三', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'变废为宝',
    skillDesc:'支付 2 点产出，将任意一张已打出的低费用单位（费用 ≤ 2）转化为等值优质单位（费用 +2，攻击 +2，承受值 +2）。',
    ability:'upgrade',
    trait:'资源转化流。把低质量资源升级为等值优质资源，能用最差的牌打出最好的效果。前期铺廉价单位攒素材，中期集中转化一波成场面。有自己复制的皇冠，平时不怎么管事。',
    cards:['变废为宝','优质资源','皇冠复制'] });

  /* ---- 31. Zwest · Z西 ---- */
  H({ key:'zwest', name:'Zwest', title:'Z西', arch:'armor',
    fac:['shell'], tier:'第三', hp:23, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'苏联质量',
    skillDesc:'支付 3 点产出，召唤 1 个 4/6 坦克单位，具备【嘲讽】。',
    ability:'heavyUnit',
    trait:'重装碾压。大量单卡质量极高的坦克单位，不叠效果，只拼数值。有自己复制的皇冠，实力与字母相当。打法不玩花的——推过去就是。',
    cards:['苏联质量','坦克','碾压'] });

  /* ---- 32. 045 · 零四五 ---- */
  H({ key:'045', name:'045', title:'零四五', arch:'recruit',
    fac:['prussia','frame'], tier:'第四', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'高层名片',
    skillDesc:'支付 2 点产出，检视牌库顶 3 张卡，指定其中 1 张入场，其余 2 张放回牌库底。',
    ability:'scryTop',
    trait:'高层关系卡。每张名片代表一位高层关系，可调用对应资源；同时能研究并改造别人的卡组，适应性极强。中坚水平，依附袜子和彗星，与定于国、鸭子国关系很差。',
    cards:['高层名片','开发他人卡组','鲨鱼抱枕'] });

  /* ---- 33. 爻 · 夂 ---- */
  H({ key:'fengzhu', name:'爻', title:'夂', arch:'war',
    fac:['ding'], tier:'第四', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'战争机器',
    skillDesc:'支付 3 点产出，我方所有单位获得【冲锋】并在本回合攻击后 +1/+1。',
    ability:'chargeBuff',
    trait:'工业化、机械化、碾压式。单卡质量高，配合稳定，打法偏正统。中坚水平，依附袜子和彗星。战争机器的特点是稳定而非爆发——每一回合都在推进。',
    cards:['战争机器','推进','机械化'] });

  /* ---- 34. 逆流 · 逆流者 ---- */
  H({ key:'nixiu', name:'逆流', title:'逆流者', arch:'economy',
    fac:['nixiug'], tier:'第四', hp:22, maxLoad:5, handMax:7, prod1:4, prodGrowth:1,
    skillName:'金融操盘',
    skillDesc:'支付 1 点产出，产出 +2，且产出 ≥ 6 时每回合结束额外产出 +1（可叠加）。',
    ability:'interest',
    trait:'金融化、科技化、多样化。单卡质量高，配合灵活，打法偏现代。指数级产出增长是核心引擎：前期产出低，越过临界点之后每回合都在滚利。手里那枚金币翻来覆去。',
    cards:['金融化','利息','多样化'] });

  /* ---- 35. 木桶饭 · 木桶饭 ---- */
  H({ key:'mudongfan', name:'木桶饭', title:'木桶饭', arch:'food',
    fac:['benz'], tier:'第三', hp:24, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'木桶饭',
    skillDesc:'支付 2 点产出，回复 5 点生命，并使我方所有单位本回合承受值 +1。',
    ability:'healBuff',
    trait:'一张卡，效果是卖饭。没有组合技、没有机制，就是卖饭——但饭能回复生命并叠增益，持久战里他的生命曲线比任何人都平。实力较弱，对皇冠的理解不强，持有鸭子复制的复制皇冠。',
    cards:['木桶饭','卖饭','补给'] });

  /* ---- 36. 汐 · 汐 ---- */
  H({ key:'zhao', name:'汐', title:'汐', arch:'tide',
    fac:['unknown'], tier:'第四', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'涨潮 / 退潮',
    skillDesc:'被动。回合 1、3、5… 为涨潮：我方所有单位 +2 攻击。回合 2、4、6… 为退潮：我方所有单位 +2 承受值。',
    ability:'tideCycle',
    trait:'周期性翻转。规则本身随回合奇偶摆动，涨潮主打攻击，退潮主打承伤。节奏感极强——你需要在涨潮期压出去、退潮期收回来。对回合数敏感，中期最强。',
    cards:['涨潮','退潮','潮汐'] });

  /* ---- 37. 愚蠢 · 愚蠢 ---- */
  H({ key:'hunshen', name:'愚蠢', title:'愚蠢', arch:'chaos',
    fac:['frame'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'变鸭术',
    skillDesc:'支付 2 点产出，将对手牌库顶 2 张卡变为【鸭子】1/1。',
    ability:'handPollute',
    trait:'卡组破坏。你精心构筑的卡组在他面前就是一堆鸭子——每回合洗掉对方两张关键牌，让对手无牌可打。打法偏干扰，本身没有终结手段，靠把对面逼到卡死赢。架子班成员，私人持有复制皇冠。',
    cards:['变鸭术','卡组破坏','随便穿'] });

  /* ---- 38. 梦的原野 · 原野 ---- */
  H({ key:'mengyuan', name:'梦的原野', title:'原野', arch:'morph',
    fac:['frame'], tier:'顶尖', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'灵识改卡',
    skillDesc:'支付 3 点产出，直接修改你场上任意 1 个单位的属性（攻击 +2 或承受值 +2 或追加【圣盾】），无需任何组件。',
    ability:'rewriteUnit',
    trait:'更改工具出现之前仅凭灵识就能修改与制造卡牌，并发现了【超人SUPERMAN】——整个新大陆制卡技术的源头。卡组内容对他而言是可编辑文本而非既成事实。必要时可以变成一颗卷心菜。下落不明。',
    cards:['灵识改卡','禁忌','卷心菜'] });

  /* ---- 39. 皇冠最初拥有者 · 最初拥有者 ---- */
  H({ key:'huanguanzhuyou', name:'皇冠最初拥有者', title:'最初拥有者', arch:'unknown',
    fac:['unknown'], tier:'未知', hp:20, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'不可知',
    skillDesc:'卡组内容对双方均不可见。抽牌时卡牌名称与描述被遮蔽，仅显示费用。',
    ability:'blindDeck',
    trait:'没有卡组——他就是卡组的源头。卡牌的真正起源，皇冠本身不断产出卡牌。身份不明，据梦的原野假说认为他在制作禁忌卡时爆体而亡，未留意识。他没有卡组，他就是卡组。',
    cards:['空白','源头','不可知'] });

  /* ---- 40. 年猪了 · 年猪 ---- */
  H({ key:'nianzhu', name:'年猪了', title:'年猪', arch:'bless',
    fac:['unknown'], tier:'未知', hp:23, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'年礼',
    skillDesc:'每 3 回合自动触发：我方所有单位获得【圣盾】，你回复 3 点生命。',
    ability:'blessCycle',
    trait:'周期性祝福。不需要主动操作，每 3 回合全场自动挂上圣盾并回复生命，把对手的每次爆发都吃掉一层。稳定、被动、难以针对——但你自己也没有终结手段，需要靠圣盾攒够优势再打一波。',
    cards:['年礼','祝福','团圆'] });

  /* ---- 41. 书宇行者 · 行者 ---- */
  H({ key:'shuyuxingzhe', name:'书宇行者', title:'行者', arch:'roam',
    fac:['unknown'], tier:'未知', hp:22, maxLoad:6, handMax:7, prod1:3, prodGrowth:1,
    skillName:'游走',
    skillDesc:'支付 2 点产出，将我方任一单位移动到敌方战场任意空位，替换该位置单位（原单位退场）。',
    ability:'swapUnit',
    trait:'位移流。单位可在战场间换位，绕开嘲讽、抢占关键位置、把对方的核心单位替下去。不靠数值取胜，靠空间权。承受力上限 6，是所有英雄里最高的——他需要空间。',
    cards:['游走','换位','行者'] });

  /* ---- 42. 字母 · 新式战法 ---- */
  H({ key:'zimu', name:'字母', title:'新式战法', arch:['outlaw','swarm'],
    fac:['duck'], tier:'顶尖', hp:20, maxLoad:6, handMax:8, prod1:3, prodGrowth:1,
    skillName:'新式战法',
    skillDesc:'支付 2 点产出，消除全场所有【无法攻击卡牌师】效果，并对我方全体授予【冲锋】与【穿透】（本回合攻击无视嘲讽，可直接命中卡牌师）。',
    ability:'pierce',
    trait:'超模单位铺场 + 规则消除。新式战法领袖，鸭子联合政府当前唯一顶尖战力。他不改数值，他改规则：嘲讽、圣盾、免疫——这些「不能打」的条款在他的技能面前全部失效，直伤突破。打法直接、高效、不讲道理。伪造叶戈尔罪行导致天道降下天谴，发动叛乱致榻榻米国覆亡、鸭子国再次灭亡。',
    cards:['新式战法','超模单位','规则消除'],
    look:'面容精致，五官偏中性，雌雄莫辨。皮肤偏白，几乎没有瑕疵，像是长期待在室内、不晒太阳的人。眉毛修长，眼睛偏细长，眼尾微微上挑，瞳孔颜色偏深，看人的时候目光很稳，不闪躲，也不压迫，但你会觉得他什么都看见了。鼻梁挺直，嘴唇偏薄，唇色偏淡，嘴角平直，很少笑，笑起来也只是一边嘴角微动。\n\n头发是黑色，长度到脖子，偏直，发尾略微外翘，打理得很整齐，但不会用发胶固定，自然垂落。偶尔会把头发别到耳后，露出完整的侧脸。发质很好，有光泽。\n\n穿的是深黑色西装，剪裁合身，面料偏哑光，不反光。白衬衫，领口扣到最上面一颗，系深灰色领带，打得很紧，一丝不苟。西装左胸口袋插一支黑色钢笔，不带装饰。裤子是直筒款，长度刚好盖住鞋面。脚上穿黑色皮鞋，擦得很干净。\n\n手上戴白色薄手套，不摘。手腕处偶尔露出一截衬衫袖口，扣子扣好。没有多余配饰，没有项链、戒指、胸针。整体干净到近乎刻板，像一份没有涂改过的文件。\n\n他坐在那里，背挺得很直，但不僵硬。说话声音不大，语速不快，每个字都咬得很清楚。他做那些事的时候，衣服上不会沾到任何东西。' });

  /* ---- DLC 43. 肉铺子（已故）· 制卡师 ---- */
  H({ key:'roupuzi', name:'肉铺子（已故）', title:'制卡师', arch:'craft',
    fac:['sock','frame'], tier:'顶尖', hp:20, maxLoad:5, handMax:7, prod1:4, prodGrowth:1,
    skillName:'过载制卡',
    skillDesc:'支付 4 点产出，合成任意 1 张单位入场；若本卡费用超过你当前承受力，你受到 4 点伤害。',
    ability:'craft',
    trait:'批量卡设计师，架子班级别。制造未知强力卡牌时爆体而亡，直接导致肉铺子国灭亡——此后制卡前都必须先确认对方可承受。他的技能带血祭，强度上限与他能扛多少伤害划等号。',
    cards:['制卡','过载','批量卡'] });

  /* ---- DLC 44. 上书房行走 · 赏金猎人 ---- */
  H({ key:'shangshufang', name:'上书房行走', title:'赏金猎人', arch:'gamble',
    fac:['unknown'], tier:'未知', hp:22, maxLoad:5, handMax:7, prod1:3, prodGrowth:1,
    skillName:'正午决斗',
    skillDesc:'双方各掷 1 枚 6 面骰。胜方对败方卡牌师造成 8 点伤害；同点则各方受到 3 点伤害。',
    ability:'duelDie',
    trait:'纯正西部体系：左轮、套索、赏金、酒馆。【快速拔枪】抢先后手，【套索】控制单位，【悬赏令】击杀赚资源，终端卡【正午决斗】一对一拼点，赢了直接斩杀。高风险高回报，潇洒且疯狂。',
    cards:['快速拔枪','套索','正午决斗'] });

  /* ---------------- 导出 ---------------- */
  var ORDER = ['kristiansen','jking7','yato','sie','tangentspoker','better66','qing','zhangzhu',
    'ting','wujiuri','falu','486','huahuli','zhuweiyu','bianxin','xiashui','awe','qixing',
    'baimao','xiaodao','lijinseng','yegaoer','susu','huangoumi','mutoudeguandong','rumi',
    'dunhuolian','taojin','jiazhan','huangliyi','zwest','045','fengzhu','nixiu','mudongfan',
    'zhao','hunshen','mengyuan','huanguanzhuyou','nianzhu','shuyuxingzhe','zimu',
    'roupuzi','shangshufang'];

  root.HeroData = {
    KW: KW,
    ARCHETYPES: ARCHETYPES,
    FAC: FAC,
    HEROES: HEROES,
    ORDER: ORDER,
    byKey: function (k) { return HEROES[k] || null; },
    list: function () { return ORDER.map(function (k) { return HEROES[k]; }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
