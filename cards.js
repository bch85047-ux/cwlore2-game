window.CARDS = {};
function mk(name,cost,type,atk,hp,load,src,text,kw){
  return {name,cost,type,atk:atk||0,hp:hp||0,load:load||0,src,text:text||'',kw:kw||[]};
}
function arr(items){var out=[];for(var i=0;i<items.length;i++)out=out.concat(items[i].copies?[items[i].c]:[]);return out;}
// ===== 下水 · 火炮铺场 · 架子班/凹槽帝国/袜子国 =====
var shuishui_ident = [
  mk('火炮',2,'unit',1,3,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('火炮',2,'unit',1,3,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('火炮',2,'unit',1,3,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('火炮',2,'unit',1,3,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('重炮',3,'unit',2,4,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('重炮',3,'unit',2,4,0,'身份','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('炮手',1,'unit',1,1,0,'身份','亡语：死亡时部署1/3火炮',['deathrattle']),
  mk('装填',2,'spell',0,0,0,'身份','本回合所有己方火炮+1/+1',['buffall']),
  mk('火药库',3,'event',0,0,0,'身份','从牌库抽3张加入手牌',['draw3']),
  mk('饱和式打击',7,'terminal',0,0,0,'身份','对敌方全场造成[火炮数]×2点伤害',['gunburst'])
];
var shuishui_expr = [
  mk('民兵',2,'unit',2,2,0,'表达','部署后立即可以攻击',['charge']),
  mk('民兵',2,'unit',2,2,0,'表达','部署后立即可以攻击',['charge']),
  mk('精锐',4,'unit',5,5,0,'表达','',[1]),
  mk('突击手',4,'unit',5,3,0,'表达','部署后立即可以攻击',['charge']),
  mk('军团长',5,'unit',8,7,0,'表达','嘲讽：必须先攻击此单位',['taunt']),
  mk('重装机兵',3,'unit',4,5,0,'表达','回合结束：对随机敌人造成1点伤害',['gun']),
  mk('炮手',2,'unit',3,3,0,'表达','亡语：死亡时部署1/3火炮',['deathrattle']),
  mk('攻击',1,'spell',0,0,0,'表达','对随机敌人造成2点伤害',['dmg2']),
  mk('治疗',2,'spell',0,0,0,'表达','随机一个己方单位+3点生命',['heal3']),
  mk('强化',3,'spell',0,0,0,'表达','目标单位本回合+2/+2',['buff22']),
  mk('群攻',3,'spell',0,0,0,'表达','对敌方全场造成2点伤害',['dmgall2']),
  mk('深抽',4,'event',0,0,0,'表达','从牌库抽4张加入手牌',['draw4']),
  mk('侦察',1,'event',0,0,0,'表达','查看敌方牌库顶2张',['peek2']),
  mk('王牌',6,'terminal',0,0,0,'表达','从牌库抽3张加入手牌，本回合产出无上限',['draw3nolimit']),
  mk('大清洗',8,'terminal',0,0,0,'表达','对所有敌方单位和卡牌师造成15点伤害',['dmgall15'])
];
var shuishui_ally = [
  mk('红军',6,'unit',14,14,0,'盟友','苏维埃：回合结束+1/+1持续至本回合结束',['soviet']),
  mk('红军',6,'unit',14,14,0,'盟友','苏维埃：回合结束+1/+1持续至本回合结束',['soviet']),
  mk('十月革命',3,'event',0,0,0,'盟友','从牌库抽3张加入手牌，本回合所有红军+2/+2',['revolution']),
  mk('白俄罗斯师',3,'unit',5,5,0,'盟友','',[]),
  mk('多共和国',4,'event',0,0,0,'盟友','永久+1最大产出上限',['prodmax1'])
];
// ===== 七星 · 法力压制 · 袜子国/彗星国/架子班/凹槽帝国 =====
var qixing_ident = [
  mk('水晶破坏',2,'spell',0,0,0,'身份','永久摧毁敌方1点最大产出上限',['destroyprod1']),
  mk('水晶破坏',2,'spell',0,0,0,'身份','永久摧毁敌方1点最大产出上限',['destroyprod1']),
  mk('出牌封锁',3,'spell',0,0,0,'身份','本回合敌方最多打出1张单位卡',['limitunit']),
  mk('出牌封锁',3,'spell',0,0,0,'身份','本回合敌方最多打出1张单位卡',['limitunit']),
  mk('彗星兵',1,'unit',1,2,0,'身份',''),
  mk('彗星兵',2,'unit',3,3,0,'身份','嘲讽：必须先攻击此单位',['taunt']),
  mk('慢节奏',3,'event',0,0,0,'身份','跳过本回合，从牌库抽3张加入手牌',['skipdraw3']),
  mk('耗死',4,'spell',0,0,0,'身份','对敌方卡牌师造成3点伤害',['dmgface3']),
  mk('批量卡风格',2,'spell',0,0,0,'身份','随机一个己方单位本回合+2/+2',['buffrand']),
  mk('慢节奏斩杀',6,'terminal',0,0,0,'身份','对敌方卡牌师造成8点；若其产出上限≤2则改为16点',['finito'])
];
var qixing_expr = [
  mk('军官',2,'unit',3,3,0,'表达',''),
  mk('老兵',3,'unit',4,4,0,'表达',''),
  mk('冲锋兵',2,'unit',2,1,0,'表达','部署后立即可以攻击',['charge']),
  mk('侦察',1,'unit',1,1,0,'表达','亡语：死亡时抽1张',['draw1']),
  mk('卫队',2,'unit',2,2,0,'表达','嘲讽：必须先攻击此单位',['taunt']),
  mk('指挥官',4,'unit',4,5,0,'表达','嘲讽：必须先攻击此单位',['taunt']),
  mk('王者',4,'unit',6,6,0,'表达','嘲讽：必须先攻击此单位',['taunt']),
  mk('战术抽牌',3,'event',0,0,0,'表达','从牌库抽3张加入手牌',['draw3']),
  mk('全体强化',5,'spell',0,0,0,'表达','己方全场本回合+3/+3',['buffall33']),
  mk('强化',3,'spell',0,0,0,'表达','目标单位本回合+2/+2',['buff22']),
  mk('削减',3,'spell',0,0,0,'表达','目标敌方单位本回合-2/-2',['debuff22']),
  mk('战争宣言',4,'event',0,0,0,'表达','己方全场本回合获得冲锋',['chargeall']),
  mk('核选项',7,'terminal',0,0,0,'表达','对所有敌方单位和卡牌师造成12点伤害',['dmgall12']),
  mk('弃牌',1,'spell',0,0,0,'表达','弃置手牌1张，然后抽2张',['discarddraw2']),
  mk('深度侦察',2,'event',0,0,0,'表达','查看敌方牌库顶3张',['peek3'])
];
var qixing_ally = [
  mk('海盗',1,'unit',1,1,0,'盟友','部署后立即可以攻击',['charge']),
  mk('海盗',1,'unit',1,1,0,'盟友','部署后立即可以攻击',['charge']),
  mk('掠夺者',2,'unit',2,2,0,'盟友','部署后立即可以攻击',['charge']),
  mk('劫掠',3,'event',0,0,0,'盟友','按己方海盗数量从牌库抽牌',['piratedraw']),
  mk('八幡',5,'unit',6,6,0,'盟友','嘲讽：必须先攻击此单位',['taunt'])
];
// ===== 注册表 =====
window.CARDS = {
  shuishui:{
    key:'shuishui', name:'下水', title:'火炮铺场', factions:['架子班','凹槽帝国','袜子国'],
    tier:'顶尖', loadMax:20, skillName:'火炮体系',
    skillDesc:'你的回合结束时，场上每门火炮对随机敌人造成1点伤害。',
    deck:shuishui_ident.concat(shuishui_expr.concat(shuishui_ally))
  },
  qixing:{
    key:'qixing', name:'七星', title:'法力压制', factions:['袜子国','彗星国','架子班','凹槽帝国'],
    tier:'顶尖', loadMax:20, skillName:'法力压制',
    skillDesc:'你的回合开始时，永久摧毁敌方1点最大产出上限。',
    deck:qixing_ident.concat(qixing_expr.concat(qixing_ally))
  }
};

// 为所有41个角色创建卡组
// 基于现有卡牌模板，为每个角色生成独特的卡组

// 通用卡牌模板
var GENERIC_UNITS = {
  'guard11': {k:'guard',n:'守卫',c:1,s:'u',a:1,h:3},
  'guard22': {k:'guard',n:'重守卫',c:2,s:'u',a:2,h:4},
  'guard33': {k:'guard',n:'铁壁守卫',c:3,s:'u',a:3,h:5},
  'gun12': {k:'gun',n:'火炮手',c:1,s:'u',a:1,h:2},
  'gun22': {k:'gun',n:'重火炮',c:2,s:'u',a:2,h:3},
  'charge11': {k:'charge',n:'冲锋者',c:1,s:'u',a:2,h:1},
  'charge21': {k:'charge',n:'重冲锋',c:2,s:'u',a:3,h:2},
  'dmg1': {k:'dmg',n:'攻击',c:1,s:'s',t:'dmg1'},
  'dmg2': {k:'dmg',n:'重击',c:2,s:'s',t:'dmg2'},
  'dmg3': {k:'dmg',n:'毁灭',c:3,s:'s',t:'dmg3'},
  'dmgface2': {k:'dmg',n:'直击',c:2,s:'s',t:'dmgface2'},
  'dmgface3': {k:'dmg',n:'斩杀',c:3,s:'s',t:'dmgface3'},
  'dmgall1': {k:'dmg',n:'群伤1',c:2,s:'s',t:'dmgall1'},
  'dmgall2': {k:'dmg',n:'群伤2',c:3,s:'s',t:'dmgall2'},
  'dmgall3': {k:'dmg',n:'群伤3',c:4,s:'s',t:'dmgall3'},
  'heal3': {k:'heal',n:'治疗3',c:3,s:'s',t:'heal3'},
  'heal2': {k:'heal',n:'治疗2',c:2,s:'s',t:'heal2'},
  'draw2': {k:'draw',n:'抽2',c:2,s:'s',t:'draw2'},
  'draw3': {k:'draw',n:'抽3',c:3,s:'s',t:'draw3'},
  'buff22': {k:'buff',n:'+2/+2',c:2,s:'s',t:'buff22'},
  'buff33': {k:'buff',n:'+3/+3',c:3,s:'s',t:'buff33'},
  'buffall2': {k:'buff',n:'全体+2',c:4,s:'s',t:'buffall2'},
  'prod1': {k:'prod',n:'+1产出',c:2,s:'s',t:'prod1'},
  'prod2': {k:'prod',n:'+2产出',c:4,s:'s',t:'prod2'},
  'prodmax': {k:'prod',n:'+1产出上限',c:5,s:'s',t:'prodmax'},
  'destroyprod1': {k:'prod',n:'削产1',c:2,s:'s',t:'destroyprod1'},
  'destroyprod2': {k:'prod',n:'削产2',c:3,s:'s',t:'destroyprod2'},
  'limitunit': {k:'limit',n:'封锁',c:3,s:'s',t:'limitunit'},
  'kill1': {k:'kill',n:'终结1',c:1,s:'s',t:'kill1'},
  'kill2': {k:'kill',n:'终结2',c:2,s:'s',t:'kill2'},
  'kill3': {k:'kill',n:'终结3',c:3,s:'s',t:'kill3'},
  'reveal': {k:'reveal',n:'侦察',c:1,s:'s',t:'reveal'},
  'reveal2': {k:'reveal',n:'侦察2',c:2,s:'s',t:'reveal2'},
  'reveal3': {k:'reveal',n:'侦察3',c:3,s:'s',t:'reveal3'},
  'copy1': {k:'copy',n:'复制1',c:1,s:'s',t:'copy1'},
  'copy2': {k:'copy',n:'复制2',c:2,s:'s',t:'copy2'},
  'copy3': {k:'copy',n:'复制3',c:3,s:'s',t:'copy3'},
  'taunt1': {k:'taunt',n:'嘲讽',c:1,s:'u',a:0,h:3},
  'taunt2': {k:'taunt',n:'重嘲讽',c:2,s:'u',a:1,h:4},
  'taunt3': {k:'taunt',n:'铁嘲讽',c:3,s:'u',a:2,h:5}
};

// 为每个角色生成卡组
function genDeck(heroKey, style) {
  var deck = [];
  var heroDef = CARDS[heroKey];
  if (!heroDef) return deck;
  
  // 根据风格生成卡组
  if (style === 'gun') {
    deck = [
      'guard11', 'guard11', 'gun12', 'gun12', 'gun12', 'gun22', 'gun22',
      'dmg1', 'dmg1', 'dmg2', 'dmg2', 'dmgface2', 'dmgface3',
      'draw2', 'draw2', 'prod1', 'prod1', 'heal2', 'heal3'
    ];
  } else if (style === 'spell') {
    deck = [
      'guard11', 'dmg1', 'dmg1', 'dmg2', 'dmg2', 'dmg2', 'dmg3',
      'dmgface2', 'dmgface3', 'dmgall1', 'dmgall2', 'dmgall3',
      'heal2', 'heal3', 'buff22', 'buff22', 'draw2', 'draw3'
    ];
  } else if (style === 'control') {
    deck = [
      'guard11', 'guard11', 'guard22', 'guard22', 'guard33',
      'taunt1', 'taunt2', 'taunt3', 'dmg1', 'dmg2', 'dmg2',
      'buff22', 'buff33', 'draw2', 'draw2', 'draw3', 'heal2', 'heal3'
    ];
  } else if (style === 'aggro') {
    deck = [
      'charge11', 'charge11', 'charge11', 'charge21', 'charge21',
      'dmg1', 'dmg1', 'dmg2', 'dmg2', 'dmgface2', 'dmgface3',
      'kill1', 'kill2', 'buff22', 'draw2', 'draw2', 'prod1'
    ];
  } else if (style === 'draw') {
    deck = [
      'guard11', 'guard11', 'dmg1', 'dmg1', 'dmg2', 'dmg2',
      'dmgface2', 'dmgface3', 'draw2', 'draw2', 'draw2', 'draw3',
      'reveal', 'reveal', 'copy1', 'copy2', 'heal2', 'prod1'
    ];
  } else {
    // 默认卡组
    deck = [
      'guard11', 'guard11', 'guard22', 'gun12', 'gun12', 'gun22',
      'dmg1', 'dmg1', 'dmg2', 'dmg2', 'dmgface2', 'dmgface3',
      'draw2', 'draw2', 'buff22', 'heal2', 'heal3', 'prod1'
    ];
  }
  
  // 将卡牌键转换为完整卡牌对象
  var result = [];
  for (var i = 0; i < deck.length; i++) {
    var cardKey = deck[i];
    var card = GENERIC_UNITS[cardKey];
    if (card) {
      result.push(JSON.parse(JSON.stringify(card)));
    }
  }
  return result;
}

// 41个角色的卡组定义
var HERO_DECKS = {
  // 克里斯蒂安松 - 控制型
  'kristiansen': {style:'control', name:'克里斯蒂安松', title:'帝国元首', loadMax:5, skillName:'神圣威严', skillDesc:'回合开始：获得+1/+1直至本回合结束'},
  // Jking7 - 法术型
  'jking7': {style:'spell', name:'Jking7', title:'战术大师', loadMax:5, skillName:'战术压制', skillDesc:'抽一张牌并弃一张牌'},
  // 八幡 - 平衡型
  'yato': {style:'default', name:'八幡', title:'战术执行', loadMax:5, skillName:'精准打击', skillDesc:'对一个敌方单位造成2点伤害'},
  // SIE - 法术型
  'sie': {style:'spell', name:'SIE', title:'控制者', loadMax:5, skillName:'控制核心', skillDesc:'选择一个敌方单位，本回合无法攻击'},
  // Tangentle - 控制型
  'tangentle': {style:'control', name:'Tangentle', title:'接受随机', loadMax:5, skillName:'随机战术', skillDesc:'随机获得一张卡牌'},
  // 66better - 平衡型
  'huang': {style:'default', name:'黄立新', title:'经济大师', loadMax:5, skillName:'经济引擎', skillDesc:'本回合获得额外1点产出'},
  // 青 - 控制型
  'qing': {style:'control', name:'青', title:'隐士', loadMax:5, skillName:'隐身', skillDesc:'一个单位获得不可选中状态'},
  // 张猪 - 火炮型
  'zhangzhu': {style:'gun', name:'张猪', title:'炮火支援', loadMax:5, skillName:'炮火支援', skillDesc:'召唤一个火炮单位'},
  // 停尸 - 控制型
  'tingshi': {style:'control', name:'停尸', title:'停尸房主管', loadMax:5, skillName:'停尸', skillDesc:'一个单位无法行动直至其死亡'},
  // 王九日 - 法术型
  'wang': {style:'spell', name:'王九日', title:'九日之王', loadMax:5, skillName:'九日循环', skillDesc:'弃置所有手牌，抽等量牌'},
  // 发廊 - 法术型
  'falon': {style:'spell', name:'发廊', title:'信息枢纽', loadMax:5, skillName:'情报网络', skillDesc:'侦察对手手牌'},
  // 486 - 法术型
  '486': {style:'spell', name:'486', title:'数据核心', loadMax:5, skillName:'数据流', skillDesc:'复制一个已使用过的卡牌效果'},
  // 花咲里 - 控制型
  'huaxli': {style:'control', name:'花咲里', title:'花心少女', loadMax:5, skillName:'花心', skillDesc:'随机获得三个 Buff'},
  // 猪瘟鱼 - 法术型
  'zhufengyu': {style:'spell', name:'猪瘟鱼', title:'瘟疫传播', loadMax:5, skillName:'瘟疫传播', skillDesc:'一个敌方单位获得 -2/-2'},
  // 偏信 - 控制型
  'pianxin': {style:'control', name:'偏信', title:'信仰坚定', loadMax:5, skillName:'信仰坚定', skillDesc:'一个单位获得嘲讽'},
  // 下水 - 火炮型 (已有)
  'shuishui': {style:'gun', name:'下水', title:'下水队', loadMax:5, skillName:'饱和式打击', skillDesc:'召唤四个1/1火炮'},
  // 阿伟 - 平衡型
  'awei': {style:'default', name:'阿伟', title:'战术顾问', loadMax:5, skillName:'顾问建议', skillDesc:'抽一张牌'},
  // 七星 - 法术型 (已有)
  'qixing': {style:'spell', name:'七星', title:'七星舰队', loadMax:5, skillName:'齐射', skillDesc:'对一个敌方单位造成3点伤害'},
  // 白猫 - 控制型
  'baimao': {style:'control', name:'白猫', title:'潜伏者', loadMax:5, skillName:'潜行', skillDesc:'一个单位获得潜行'},
  // 小岛 - 平衡型
  'xiaodao': {style:'default', name:'小岛', title:'小岛之主', loadMax:5, skillName:'岛屿防守', skillDesc:'获得3点承受力'},
  // 南京市民李先生 - 法术型
  'nanjing': {style:'spell', name:'南京市民李先生', title:'普通市民', loadMax:5, skillName:'市民权利', skillDesc:'抽两张牌'},
  // 叶戈尔 - 平衡型
  'yegor': {style:'default', name:'叶戈尔', title:'苏联顾问', loadMax:5, skillName:'苏联经验', skillDesc:'一个单位获得+1/+1'},
  // 苏苏 - 法术型
  'susu': {style:'spell', name:'苏苏', title:'革命导师', loadMax:5, skillName:'革命', skillDesc:'所有敌方单位 -1/-1'},
  // 榻榻米 - 控制型
  'tatami': {style:'control', name:'榻榻米', title:'榻榻米之主', loadMax:5, skillName:'榻榻米防御', skillDesc:'所有友方单位获得嘲讽'},
  // 木头的滚动 - 平衡型
  'mutou': {style:'default', name:'木头的滚动', title:'滚动者', loadMax:5, skillName:'滚动攻击', skillDesc:'对所有敌方单位造成1点伤害'},
  // 蕾米 - 法术型
  'remei': {style:'spell', name:'蕾米', title:'吸血鬼', loadMax:5, skillName:'吸血', skillDesc:'对一个单位造成2点伤害，回复2点生命'},
  // 敦贺联队 - 平衡型
  'tsuwabuki': {style:'default', name:'敦贺联队', title:'联队指挥官', loadMax:5, skillName:'联队进攻', skillDesc:'所有友方单位获得+1攻击'},
  // 淘金 - 平衡型
  'taojin': {style:'default', name:'淘金', title:'淘金者', loadMax:5, skillName:'淘金', skillDesc:'获得2点产出'},
  // 假战 - 控制型
  'jiazhan': {style:'control', name:'假战', title:'假战大师', loadMax:5, skillName:'假战', skillDesc:'本回合你无法被攻击'},
  // 绘梨衣 - 法术型
  'huiliyi': {style:'spell', name:'绘梨衣', title:'绘梨衣之主', loadMax:5, skillName:'绘梨衣之赐', skillDesc:'一个友方单位获得+3/+3'},
  // Zwest - 平衡型
  'zwest': {style:'default', name:'Zwest', title:'西部枪手', loadMax:5, skillName:'西部射击', skillDesc:'对一个敌方单位造成2点伤害'},
  // 045 - 法术型
  '045': {style:'spell', name:'045', title:'045特工', loadMax:5, skillName:'特工行动', skillDesc:'抽一张牌并弃一张牌'},
  // 爻 - 控制型
  'yao': {style:'control', name:'爻', title:'爻变之主', loadMax:5, skillName:'爻变', skillDesc:'随机改变一个单位的效果'},
  // 逆流 - 平衡型
  'niliu': {style:'default', name:'逆流', title:'逆流者', loadMax:5, skillName:'逆流而上', skillDesc:'一个单位获得冲锋'},
  // 木桶饭 - 法术型
  'mutong': {style:'spell', name:'木桶饭', title:'木桶饭之主', loadMax:5, skillName:'木桶饭', skillDesc:'治疗5点生命'},
  // 汐 - 平衡型
  'xi': {style:'default', name:'汐', title:'汐之主', loadMax:5, skillName:'汐之力量', skillDesc:'获得2点承受力'},
  // 愚蠢 - 平衡型
  'yongyin': {style:'default', name:'愚蠢', title:'愚蠢之主', loadMax:5, skillName:'愚蠢的力量', skillDesc:'获得+2/+2'},
  // 梦的原野 - 法术型
  'meng': {style:'spell', name:'梦的原野', title:'梦之主', loadMax:5, skillName:'梦境', skillDesc:'所有敌方单位睡眠'},
  // 皇冠最初拥有者 - 控制型
  'huangguan': {style:'control', name:'皇冠最初拥有者', title:'皇冠之主', loadMax:5, skillName:'皇冠之权', skillDesc:'所有友方单位获得+1/+1'},
  // 肉铺子 - 法术型
  'roupu': {style:'spell', name:'肉铺子', title:'肉铺之主', loadMax:5, skillName:'肉铺供应', skillDesc:'召唤一个2/2单位'},
  // 上书房行走 - 平衡型
  'shangshufang': {style:'default', name:'上书房行走', title:'上书房之主', loadMax:5, skillName:'上书房之智', skillDesc:'抽两张牌'}
};

// 为每个英雄生成卡组
for (var key in HERO_DECKS) {
  if (HERO_DECKS.hasOwnProperty(key)) {
    var heroData = HERO_DECKS[key];
    var deck = genDeck(key, heroData.style);
    
    // 创建英雄定义
    CARDS[key] = {
      key: key,
      name: heroData.name,
      title: heroData.title,
      factions: ['通用'],
      tier: '通用',
      loadMax: heroData.loadMax,
      skillName: heroData.skillName,
      skillDesc: heroData.skillDesc,
      deck: deck
    };
  }
}

