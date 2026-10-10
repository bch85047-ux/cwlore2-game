(function(){
'use strict';
var B = null, selUnit = null, needTgt = null, busy = false, locked = false;
window.AI_SIDE = 1;
var $ = function(s){ return document.querySelector(s); };

// 大厅逻辑
var lobbyState = { hero: null, opponent: null };
// 41个人物列表（来自history文件）
var lobbyHeroes = ['克里斯蒂安松', 'Jking7', '八幡', 'SIE', 'Tangentle/Spoker', '66better/黄立新', '青', '张猪', '停尸', '王九日', '发廊', '486', '花咲里', '猪瘟鱼', '偏信', '下水', '阿伟', '七星', '白猫', '小岛', '南京市民李先生', '叶戈尔', '苏苏', '榻榻米', '木头的滚动', '蕾米', '敦贺联队', '淘金', '假战', '绘梨衣', 'Zwest', '045', '爻', '逆流', '木桶饭', '汐', '愚蠢', '梦的原野', '皇冠最初拥有者', '肉铺子（已故）', '上书房行走'];
var lobbyOpponents = ['克里斯蒂安松', 'Jking7', '八幡', 'SIE', 'Tangentle/Spoker', '66better/黄立新', '青', '张猪', '停尸', '王九日', '发廊', '486', '花咲里', '猪瘟鱼', '偏信', '下水', '阿伟', '七星', '白猫', '小岛', '南京市民李先生', '叶戈尔', '苏苏', '榻榻米', '木头的滚动', '蕾米', '敦贺联队', '淘金', '假战', '绘梨衣', 'Zwest', '045', '爻', '逆流', '木桶饭', '汐', '愚蠢', '梦的原野', '皇冠最初拥有者', '肉铺子（已故）', '上书房行走'];

function initLobby(){
 var heroGrid = $('#heroGrid');
 var oppGrid = $('#oppGrid');
 if (!heroGrid || !oppGrid) return;
 
 heroGrid.innerHTML = '';
 lobbyHeroes.forEach(function(h){
   var btn = document.createElement('button');
   btn.className = 'hero-btn';
   btn.textContent = h;
   btn.onclick = function(){
     lobbyState.hero = h;
     updateLobbySelection();
   };
   heroGrid.appendChild(btn);
 });
 
 oppGrid.innerHTML = '';
 lobbyOpponents.forEach(function(o){
   var btn = document.createElement('button');
   btn.className = 'opp-btn';
   btn.textContent = o;
   btn.onclick = function(){
     lobbyState.opponent = o;
     updateLobbySelection();
   };
   oppGrid.appendChild(btn);
 });
 
 updateLobbySelection();
}

function updateLobbySelection(){
 var heroBtns = $('#heroGrid').children;
 for (var i = 0; i < heroBtns.length; i++){
   heroBtns[i].className = 'hero-btn' + (heroBtns[i].textContent === lobbyState.hero ? ' selected' : '');
 }
 var oppBtns = $('#oppGrid').children;
 for (var i = 0; i < oppBtns.length; i++){
   oppBtns[i].className = 'opp-btn' + (oppBtns[i].textContent === lobbyState.opponent ? ' selected' : '');
 }
 var btnStart = $('#btnStart');
 if (btnStart){
   btnStart.disabled = !(lobbyState.hero && lobbyState.opponent);
 }
}

// 英雄名称到卡组键的映射
var HERO_NAME_TO_KEY = {
 '克里斯蒂安松':'kristiansen', 'Jking7':'jking7', '八幡':'yato', 'SIE':'sie',
 'Tangentle/Spoker':'tangentle', '66better/黄立新':'huang', '青':'qing', '张猪':'zhangzhu',
 '停尸':'tingshi', '王九日':'wang', '发廊':'falon', '486':'486',
 '花咲里':'huaxli', '猪瘟鱼':'zhufengyu', '偏信':'pianxin', '下水':'shuishui',
 '阿伟':'awei', '七星':'qixing', '白猫':'baimao', '小岛':'xiaodao',
 '南京市民李先生':'nanjing', '叶戈尔':'yegor', '苏苏':'susu', '榻榻米':'tatami',
 '木头的滚动':'mutou', '蕾米':'remei', '敦贺联队':'tsuwabuki', '淘金':'taojin',
 '假战':'jiazhan', '绘梨衣':'huiliyi', 'Zwest':'zwest', '045':'045',
 '爻':'yao', '逆流':'niliu', '木桶饭':'mutong', '汐':'xi',
 '愚蠢':'yongyin', '梦的原野':'meng', '皇冠最初拥有者':'huangguan',
 '肉铺子（已故）':'roupu', '上书房行走':'shangshufang'
};

function getHeroCardByName(name){
 var key = HERO_NAME_TO_KEY[name] || 'shuishui';
 return CARDS[key] || CARDS.shuishui;
}

function startGame(){
 var heroCard = getHeroCardByName(lobbyState.hero);
 var oppCard = getHeroCardByName(lobbyState.opponent);
 $('#lobby').hidden = true;
 $('#app').hidden = false;
 B = E.newBattle(heroCard, oppCard);
 selUnit = null; needTgt = null; busy = false; locked = false;
 $('#banner').classList.remove('show');
 renderLog(); render();
}

// 等待DOM加载完成后初始化大厅
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){
    initLobby();
    $('#btnStart').onclick = startGame;
  });
} else {
  initLobby();
  $('#btnStart').onclick = startGame;
}
var KW_LABEL = {gun:'火炮',taunt:'嘲讽',charge:'冲锋',deathrattle:'亡语',soviet:'苏维埃',draw1:'抽1',draw3:'抽3',draw4:'抽4',buffall:'装填',buffall33:'全体+3',buff22:'+2/+2',debuff22:'-2/-2',dmg2:'伤害2',dmgface3:'斩杀3',dmgall2:'群伤2',dmgall12:'核12',dmgall15:'清洗15',gunburst:'饱和',heal3:'治疗3',destroyprod1:'削产1',limitunit:'封锁',skipdraw3:'慢节奏',finito:'终结',chargeall:'全员冲锋',piratedraw:'劫掠',peek2:'侦察2',peek3:'侦察3',discdraw:'弃1抽2',prodmax1:'+1产出',revolution:'革命',draw3nolimit:'无限产出'};
function kwLabel(k){
 return KW_LABEL[k] || ({buff22:'+2/+2',debuff22:'-2/-2'}[k]) || k;
}
var TYPE_CN = {unit:'单位',spell:'指令',event:'事件',terminal:'终端'};
var SRC_CN = {'身份':'身份卡','表达':'表达卡','盟友':'盟友卡','亡语':'衍生'};
var SA = 'viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"';
var ICON = {
 unit:'<svg '+SA+'><circle cx="6" cy="3.2" r="1.5"/><path d="M6 5.4v3.2M3.6 7.6h4.8M6 8.6L4.6 11M6 8.6L7.4 11"/></svg>',
 gun:'<svg '+SA+'><circle cx="4.4" cy="8.6" r="2.1"/><path d="M5.8 6.6L10.2 4.2M10.2 4.2l.6.5"/></svg>',
 taunt:'<svg '+SA+'><path d="M6 1.6L10 3.1v2.9c0 2.2-1.7 3.8-4 4.6-2.3-.8-4-2.4-4-4.6V3.1z"/></svg>',
 charge:'<svg '+SA+'><path d="M7.1 1.4L3.4 6.6h2.6L5 10.8l4.2-5.6H6.6z"/></svg>',
 deathrattle:'<svg '+SA+'><path d="M6 1.9c-2.1 0-3.3 1.4-3.3 3.2 0 1.3.6 2.1 1.4 2.7v1.7h3.8V7.8c.8-.6 1.4-1.4 1.4-2.7C9.3 3.3 8.1 1.9 6 1.9z"/><circle cx="4.9" cy="5.4" r=".62" fill="currentColor" stroke="none"/><circle cx="7.1" cy="5.4" r=".62" fill="currentColor" stroke="none"/></svg>',
 spell:'<svg '+SA+'><path d="M6 1.5v2.3M6 8.2v2.3M1.5 6h2.3M8.2 6h2.3M3.2 3.2l1.6 1.6M7.2 7.2l1.6 1.6M8.8 3.2L7.2 4.8M4.8 7.2L3.2 8.8"/></svg>',
 event:'<svg '+SA+'><rect x="2.6" y="1.6" width="6.8" height="8.8" rx="1"/><path d="M4.6 4.4h2.8M4.6 6.4h2.8"/></svg>',
 terminal:'<svg '+SA+'><circle cx="6" cy="7.6" r="3"/><path d="M6 4.6v1.4M4.4 5.2l1 1M7.6 5.2l-1 1"/></svg>'
};
function typeIcon(c){
 if (c.type === 'terminal') return ICON.terminal;
 if (c.type === 'event') return ICON.event;
 if (c.type === 'spell') return ICON.spell;
 if (c.kw && c.kw.indexOf('gun') >= 0) return ICON.gun;
 if (c.kw && c.kw.indexOf('taunt') >= 0) return ICON.taunt;
 if (c.kw && c.kw.indexOf('charge') >= 0) return ICON.charge;
 if (c.kw && c.kw.indexOf('deathrattle') >= 0) return ICON.deathrattle;
 return ICON.unit;
}

function heroHTML(p, side){
 var h = document.createElement('div');
 h.className = 'hero ' + side;
 var prod = p.prod + ' / ' + p.prodMax;
 h.innerHTML =
 '<div class="hname">' + p.name + '</div>' +
 '<div class="htitle">' + p.title + '</div>' +
 '<div class="life">' + p.life + '<small>/ 40</small></div>' +
 '<div class="stats">' +
 '<div>产出<b>' + prod + '</b></div>' +
 '<div>承受<b>' + p.load + '</b></div>' +
 '<div>牌库<b>' + p.deck.length + '</b></div>' +
 '<div>弃牌<b>' + p.discard.length + '</b></div>' +
 '</div>' +
 '<div class="tag">' + p.factions.map(function(f){ return '<span class="faction-badge">' + f + '</span>'; }).join('') + '</div>' +
 '<div class="skill"><b style="color:var(--gold)">' + p.skillName + '</b><br>' + p.skillDesc + '</div>';
 h.id = 'hero' + side.charAt(0).toUpperCase() + side.slice(1);
 h.onclick = function(){ onHeroClick(1 - B.who); };
 return h;
}

function cardHTML(c, opts){
 opts = opts || {};
 var d = document.createElement('div');
 var cls = 'card';
 if (c.src === '盟友') cls += ' ally';
 if (c.type === 'unit') cls += ' tier';
 if (opts.canAttack) cls += ' canattack';
 if (opts.exhausted) cls += ' exhausted';
 if (opts.targetable) cls += ' targetable';
 if (opts.poor) cls += ' poor';
 if (opts.selected) cls += ' selected';
 if (opts.buffed) cls += ' buffed';
 d.className = cls;
 var kws = c.kw.map(kwLabel).join(' ');
 var stat = c.type === 'unit'
 ? '<div class="foot"><span class="atk">' + (c.atk + c.buff) + '</span><span class="hpv">' + (c.hp + c.buffhp) + '</span></div>'
 : '<div class="foot"><span class="atk" style="color:#8a7f63">◆</span><span class="hpv" style="color:#8a7f63">◇</span></div>';
 d.innerHTML =
 '<div class="row"><span class="cost">' + c.cost + '</span><span class="nm">' + c.name + '</span><span class="type-icon">' + typeIcon(c) + '</span></div>' +
 '<div class="body">' + (c.text || '') + '</div>' +
 (kws ? '<div class="kw">' + c.kw.map(function(k){ return '<span class="k">' + kwLabel(k) + '</span>'; }).join('') + '</div>' : '') +
 stat;
 if (opts.uid) d.dataset.uid = opts.uid;
 if (opts.handIdx != null) d.dataset.idx = opts.handIdx;
 if (c.mod >0) d.style.boxShadow = '0 0 0 2px var(--gold) inset, 0 2px 0 rgba(0,0,0,.35)';
 return d;
}

function renderHero(){
 $('#heroTop').replaceWith(heroHTML(B.p[1], 'top'));
 $('#heroBot').replaceWith(heroHTML(B.p[0], 'bot'));
}
function renderTop(){
 var box = $('#handTop');
 box.innerHTML = '';
 for (var i = 0; i< B.p[1].hand.length; i++){
 var b = document.createElement('div');
 b.className = 'card back';
 box.appendChild(b);
 }
 var f = $('#fieldTop');
 f.innerHTML = '';
 B.p[1].board.forEach(function(u){
 var o = {uid:u.uid, targetable: canTargetUnit(u)};
 var el = cardHTML(u, o);
 // 修复：添加敌方单位点击事件
 el.onclick = function(){ onUnitClick(1, u); };
 f.appendChild(el);
 });
}
function renderBot(){
 var f = $('#fieldBot');
 f.innerHTML = '';
 B.p[0].board.forEach(function(u){
 var o = {uid:u.uid, canAttack: u.ready && !B.over, exhausted: !u.ready};
 if (selUnit === u.uid) o.selected = true;
 var el = cardHTML(u, o);
 el.onclick = function(){ onUnitClick(0, u); };
 f.appendChild(el);
 });
 var h = $('#handBot');
 h.innerHTML = '';
 B.p[0].hand.forEach(function(c, i){
 var o = {handIdx:i, poor: !E.canPlay(B, B.p[0], c).ok};
 var el = cardHTML(c, o);
 el.onclick = function(){ onHandClick(i); };
 el.setAttribute('draggable', 'true');
 el.addEventListener('dragstart', function(e){
 if (B.over || E.cur(B) !== B.p[0] || !E.canPlay(B, B.p[0], c).ok) { e.preventDefault(); return; }
 e.dataTransfer.setData('text/plain', String(i));
 e.dataTransfer.effectAllowed = 'move';
 });
 h.appendChild(el);
 });
}
function render(){
 renderHero();
 renderTop();
 renderBot();
 var p = E.cur(B);
 $('#turnInfo').textContent = B.over ? '对局结束' :
 '回合 ' + B.t + ' · ' + p.name + ' 行动 · 产出 ' + p.prod + ' / ' + p.prodMax + ' · 承受力 ' + p.load;
 $('#btnEnd').disabled = !!B.over;
 $('#btnNew').textContent = '新对局';
}

function canTargetUnit(u){
 if (needTgt != null) return true;
 if (selUnit == null || B.over) return false;
 var me = E.cur(B);
 if (!me.board.some(function(x){return x.uid === selUnit;})) return false;
 return true;
}

function onHandClick(i){
 if (B.over) return;
 var c = B.p[0].hand[i];
 if (!c) return;
 var chk = E.canPlay(B, B.p[0], c);
 if (!chk.ok){ flash('无法打出：' + chk.why); return; }
 if (E.needsTarget(c)){
 needTgt = i;
 flash('为「' + c.name + '」选择目标');
 render();
 return;
 }
 if (!E.playCard(B, i)) render();
 else { needTgt = null; afterMove(); }
}

function onUnitClick(side, u){
 if (B.over) return;
 if (side === 0){
 if (!u.ready){ flash(u.name + ' 尚未就绪'); return; }
 selUnit = (selUnit === u.uid) ? null : u.uid;
 flash(selUnit ? u.name + ' 已选中，点击目标' : '已取消选中');
 render();
 return;
 }
 // 敌方单位
 if (needTgt != null){
 var ci = needTgt; needTgt = null;
 if (!E.playCard(B, ci, {kind:'unit', id:u.uid})) { render(); return; }
 afterMove();
 return;
 }
 if (selUnit == null){ flash('请先选中己方单位'); return; }
 if (!E.attack(B, selUnit, {kind:'unit', id:u.uid})){ selUnit = null; render(); return; }
 selUnit = null;
 afterMove();
}

function onHeroClick(side){
 if (B.over) return;
 if (needTgt != null){ flash('此指令需指定单位目标'); return; }
 if (selUnit == null) return;
 if (!E.attack(B, selUnit, {kind:'hero'})){ selUnit = null; render(); return; }
 selUnit = null;
 afterMove();
}

function afterMove(){
 var p = E.cur(B);
 if (p.flags.skipped && p.cardsPlayed >0){ E.skipRest(B); p.flags.skipped = false; }
 renderLog();
 render();
 if (B.over) showBanner(); else maybeAI();
}

function maybeAI(){
 if (B.over || busy || !AI.isAI(B)) return;
 busy = true;
 $('#btnEnd').disabled = true;
 $('#turnInfo').textContent = E.cur(B).name + ' 思考中…';
 AI.run(B, function(){
 busy = false;
 selUnit = null; needTgt = null;
 renderLog(); render();
 if (B.over) showBanner();
 });
}

function renderLog(){
 var box = $('#log');
 box.innerHTML = '';
 B.log.slice().reverse().slice(0, 200).forEach(function(e){
 var d = document.createElement('div');
 d.className = 'l ' + e.t;
 d.textContent = e.s;
 box.appendChild(d);
 });
}

var flashT = null;
function flash(s){
 if (locked) return;
 var b = $('#banner');
 b.querySelector('.t').textContent = '';
 b.querySelector('.w').textContent = s;
 b.querySelector('.s').textContent = '';
 b.classList.add('show');
 clearTimeout(flashT);
 flashT = setTimeout(function(){ if (!locked) b.classList.remove('show'); }, 1300);
}

function showBanner(){
 locked = true;
 clearTimeout(flashT);
 var b = $('#banner');
 var win = parseInt(B.over, 10);
 b.querySelector('.t').textContent = '对局结束 · 回合 ' + B.t;
 b.querySelector('.w').textContent = B.p[win].name + ' 获胜';
 b.querySelector('.s').textContent = B.p[1-win].name + ' 卡牌师被击溃 · 点击「新对局」重置';
 b.classList.add('show');
}

function newGame(){
 selUnit = null; needTgt = null; busy = false; locked = false;
 $('#banner').classList.remove('show');
 B = E.newBattle(CARDS.shuishui, CARDS.qixing);
 $('#banner').classList.remove('show');
 renderLog(); render();
}

$('#btnEnd').onclick = function(){
 if (B.over || busy || AI.isAI(B)) return;
 E.endTurn(B);
 selUnit = null; needTgt = null;
 renderLog(); render();
 if (B.over) showBanner(); else maybeAI();
};
$('#btnNew').onclick = newGame;

var E = window.ENG, CARDS = window.CARDS;
// 拖拽打出
var appEl = $('#app');
appEl.addEventListener('dragover', function(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
appEl.addEventListener('drop', function(e){
 e.preventDefault();
 var idx = parseInt(e.dataTransfer.getData('text/plain'));
 if (isNaN(idx) || B.over || E.cur(B) !== B.p[0]) return;
 var c = B.p[0].hand[idx];
 if (!c) return;
 var chk = E.canPlay(B, B.p[0], c);
 if (!chk.ok) { flash('无法打出：' + chk.why); return; }
 var dropEl = e.target;
 while (dropEl && dropEl !== document.body && !dropEl.classList.contains('card') && !dropEl.classList.contains('hero')) {
 dropEl = dropEl.parentElement;
 }
 var target = null;
 if (dropEl && dropEl.classList.contains('card')) {
 var uid = parseInt(dropEl.dataset.uid);
 if (!isNaN(uid) && E.needsTarget(c)) target = {kind:'unit', id:uid};
 } else if (dropEl && dropEl.classList.contains('hero')) {
 if (E.needsTarget(c)) target = {kind:'hero'};
 }
 if (target) {
 if (E.playCard(B, idx, target)) { needTgt = null; afterMove(); } else render();
 } else if (E.needsTarget(c)) {
 needTgt = idx;
 flash('为「' + c.name + '」选择目标');
 render();
 } else {
 if (E.playCard(B, idx)) { needTgt = null; afterMove(); } else render();
 }
});

// Theme toggle
function toggleTheme(){
 var cur = document.documentElement.getAttribute('data-theme') || 'dark';
 var next = cur === 'dark' ? 'light' : 'dark';
 document.documentElement.setAttribute('data-theme', next);
 $('#btnTheme').textContent = next === 'dark' ? '暗' : '亮';
 try { localStorage.setItem('cwlore-theme', next); } catch(e){}
}
(function initTheme(){
 var saved = 'dark';
 try { saved = localStorage.getItem('cwlore-theme') || 'dark'; } catch(e){}
 document.documentElement.setAttribute('data-theme', saved);
 $('#btnTheme').textContent = saved === 'dark' ? '暗' : '亮';
})();

// Guide modal
window.hideGuide = function(){ $('#modal').classList.remove('show'); };
$('#btnTheme').onclick = toggleTheme;
$('#btnGuide').onclick = function(){
 var m = $('#modal');
 m.querySelector('#modal-content').innerHTML =
'<button id="modal-close" onclick="hideGuide()">关闭</button>' +
'<h2 style="margin-bottom:16px;color:var(--gold)">新手指南</h2>' +
'<div style="line-height:1.8;font-size:13px;color:var(--text)">' +
'<h3 style="color:var(--gold);margin:14px 0 6px">基本目标</h3>' +
'<p>• 双方各有 40 点生命值，先把对方打到 0 即胜。</p>' +
'<p>• 每回合开始，你的最大产出 +1，用来打出卡牌。</p>' +
'<h3 style="color:var(--gold);margin:14px 0 6px">英雄选择</h3>' +
'<p>• 开局选择一名英雄，每局只能选一次。</p>' +
'<p>• 不同英雄拥有不同的核心机制，例如火炮铺场或法术压制。</p>' +
'<p>• 英雄特性影响整体打法风格，选择后锁定。</p>' +
'<h3 style="color:var(--gold);margin:14px 0 6px">出牌与攻击</h3>' +
'<p>• 点击手牌打出，点击己方单位选中，再点击目标攻击。</p>' +
'<p>• 也可拖拽手牌到场上或目标直接打出。</p>' +
'<p>• 场上单位数量受承受力限制，超出则无法打出。</p>' +
'<p>• 点击「结束回合」让对手行动。</p>' +
'<h3 style="color:var(--gold);margin:14px 0 6px">卡牌类型</h3>' +
'<p>• 步兵：普通单位，部署后可攻击。</p>' +
'<p>• 炮兵：带「火炮」，回合结束触发火炮效果。</p>' +
'<p>• 坦克：带「嘲讽」，敌人必须先攻击它。</p>' +
'<p>• 突击：带「冲锋」，部署后立即可以攻击。</p>' +
'<p>• 特殊：带「亡语」，死亡时触发效果。</p>' +
'<p>• 指令：直接触发效果，如强化、削弱、治疗。</p>' +
'<p>• 事件：一次性效果，如抽牌、产出调整。</p>' +
'<p>• 终端：终结技，强力但可能有代价。</p>' +
'<h3 style="color:var(--gold);margin:14px 0 6px">卡牌来源</h3>' +
'<p>• 身份卡：定义核心机制，如下水的火炮体系。</p>' +
'<p>• 表达卡：常规战斗卡牌。</p>' +
'<p>• 盟友卡：特殊来源，通常有独特效果。</p>' +
'<h3 style="color:var(--gold);margin:14px 0 6px">关键词说明</h3>' +
'<p>• 嘲讽：敌方单位必须先攻击此单位。</p>' +
'<p>• 冲锋：部署后立即可以攻击。</p>' +
'<p>• 亡语：死亡时触发效果。</p>' +
'<p>• 火炮：回合结束时对随机敌人造成 1 点伤害。</p>' +
'<p>• 苏维埃：回合结束时 +1/+1 持续至本回合结束。</p>' +
'</div>';
 m.classList.add('show');
};
$('#modal').onclick = function(e){ if (e.target === this) hideGuide(); };

window.addEventListener('keydown', function(e){
 if (e.key === 'Escape'){ selUnit = null; needTgt = null; hideGuide(); render(); }
});
newGame();
})();
