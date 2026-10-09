window.ENG = (function(){
'use strict';
var UID = 1;
function shuffle(a){
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}
  return a;
}
function log(s,t){return {t:t||'info',s:s};}

function makePlayer(roster){
  return {
    key:roster.key, name:roster.name, title:roster.title,
    factions:roster.factions.slice(), tier:roster.tier,
    loadMax:roster.loadMax||20, skillName:roster.skillName, skillDesc:roster.skillDesc,
    deck:shuffle(roster.deck.map(function(c){
      return {uid:UID++,name:c.name,cost:c.cost,type:c.type,atk:c.atk,hp:c.hp,maxhp:c.hp,
        load:c.load,src:c.src,text:c.text,kw:c.kw.slice(),buff:0,buffhp:0,mod:0,ready:false,turnsOnBoard:0};
    })),
    hand:[], board:[], discard:[], life:40,
    prod:0, prodMax:10, load:20,
    flags:{}, cardsPlayed:0, unitsPlayed:0,
    seen:0   // 侦察揭示的敌方牌数
  };
}

function newBattle(rA,rB){
  var b={
    t:1, who:0, p:[makePlayer(rA),makePlayer(rB)],
    log:[log('对局开始','turn')],
    over:null, pending:null,
    heroAtk:0
  };
  draw(b,b.p[0],4);   // 先手 4
  draw(b,b.p[1],3);   // 后手 3
  b.p[0].prod=1;
  b.log.push(log(rA.name+' 先手','turn'));
  return b;
}

function opp(b){return b.p[1-b.who];}
function cur(b){return b.p[b.who];}

function draw(b,p,n){
  n=n||1; var got=0;
  for(var i=0;i<n;i++){
    if(!p.deck.length){ p.life=Math.max(0,p.life-2); b.log.push(log(p.name+" 牌库耗尽，疲劳 -2")); }
    else { p.hand.push(p.deck.shift()); got++; }
  }
  return got;
}
// 牌库耗尽：每回合疲劳（这里简化为抽不到牌直接掉血）


function endOfTurnSkill(b,p){
  // 下水 火炮体系：回合结束时每门火炮对随机敌人造成1
  if(p.key==='shuishui'){
    var guns=p.board.filter(function(u){return u.kw.indexOf('gun')>=0;});
    if(!guns.length) return;
    var e=opp(b);
    var hits=[];
    for(var i=0;i<guns.length;i++){
      var targets=e.board.slice();
      if(targets.length) targets.push({hero:true});
      if(!targets.length) continue;
      var t=targets[Math.floor(Math.random()*targets.length)];
      if(t.hero){ e.life-=1; b.log.push(log('火炮打击 '+e.name+'，-1')); }
      else { t.hp-=1; if(t.hp<=0) hits.push(t); }
    }
    if(hits.length){
      var keep=[];
      p.board.forEach(function(u){ if(hits.indexOf(u)>=0){ u.discard=true; dealDeathrattle(b,e,u); } else keep.push(u); });
      e.board=keep;
      b.log.push(log(hits.length+' 个单位被摧毁','combat'));
    }
    // 苏联红军：回合结束 +1/+1 本回合
    p.board.forEach(function(u){
      if(u.kw.indexOf('soviet')>=0 && u.hp>0){ u.buff+=1; u.buffhp+=1; }
    });
  }
}

function startTurnSkill(b,p){
  if(p.key==='qixing'){
    var e=opp(b);
    if(e.prodMax>1){
      e.prodMax-=1; e.prod=Math.min(e.prod,e.prodMax);
      b.log.push(log('法力压制：'+e.name+' 产出上限 -1（剩 '+e.prodMax+'）','skill'));
    }
  }
}

function beginTurn(b){
  var p=cur(b), e=opp(b);
  p.prod=Math.min(p.prodMax,p.prod+1);
  p.load=p.loadMax;
  p.flags={}; p.cardsPlayed=0; p.unitsPlayed=0;
  // 单位就绪：非本回合部署的可行动
  p.board.forEach(function(u){ if(!u.nocharge && (u.kw.indexOf('charge')>=0||u.turnsOnBoard>0)) u.ready=true; });
  e.board.forEach(function(u){ u.nocharge=false; });
  var got=draw(b,p,2);
  b.log.push(log(p.name+' 回合 '+b.t+'：产出 '+p.prod+'，抽 '+got,'turn'));
  startTurnSkill(b,p);
  if(p.life<=0){ b.over=(1-b.who)+''; return; }
}

function endTurn(b){
  var p=cur(b), e=opp(b);
  endOfTurnSkill(b,p);
  // 清除临时 buff
  p.board.forEach(function(u){ u.buff=0; u.buffhp=0; });
  e.board.forEach(function(u){ u.buff=0; u.buffhp=0; });
  p.board.forEach(function(u){ u.ready=false; u.turnsOnBoard++; u.nocharge=false; });
  e.board.forEach(function(u){ u.turnsOnBoard++; });
  b.pending=null;
  if(b.over) return;
  b.who=1-b.who; b.t++;
  beginTurn(b);
}

function atk(u){return u.atk+u.buff;}
function hp(u){return u.hp+u.buffhp;}

function unitName(u){return u.name+' '+atk(u)+'/'+hp(u);}

// 亡语
function dealDeathrattle(b,owner,u){
  if(u.kw.indexOf('deathrattle')>=0){
    var g={uid:UID++,name:'火炮',cost:2,type:'unit',atk:1,hp:3,maxhp:3,load:0,src:'亡语',
      text:'每门火炮每回合结束对随机敌人造成1点伤害',kw:['gun'],buff:0,buffhp:0,mod:0,ready:false,turnsOnBoard:0};
    owner.board.push(g);
    b.log.push(log(u.name+' 的炮手部署一门火炮','deathrattle'));
  }
  if(u.kw.indexOf('draw1')>=0){
    draw(b,owner,1);
    b.log.push(log(u.name+' 的侦察兵抽1张','deathrattle'));
  }
}

// 随机敌人 = 敌方单位或英雄
function randomEnemy(b,e){
  if(e.board.length && Math.random()<0.75) return e.board[Math.floor(Math.random()*e.board.length)];
  return {hero:true,e:e};
}

function dmgHero(b,e,n){
  e.life-=n;
  b.log.push(log(e.name+' -'+n+' 生命（剩 '+e.life+'）','combat'));
  if(e.life<=0) b.over=(b.p.indexOf(e)^1)+'';
}

function resolveEffects(b,p,e,card){
  var kw=card.kw;
  function has(k){return kw.indexOf(k)>=0;}
  var i,t;
  if(has('draw1')) draw(b,p,1);
  else if(has('draw3')) {draw(b,p,3); b.log.push(log('抽3张','play'));}
  else if(has('draw4')) {draw(b,p,4); b.log.push(log('抽4张','play'));}
  else if(has('draw3nolimit')) {draw(b,p,3); p.nolimit=true; b.log.push(log('抽3张，本回合产出无上限','play'));}
  else if(has('discarddraw2')) {
    if(p.hand.length){var d=p.hand.shift(); p.discard.push(d); b.log.push(log('弃掉 '+d.name,'play'));}
    draw(b,p,2);
  }
  else if(has('dmg2')) {var g=randomEnemy(b,e); if(g.hero) dmgHero(b,e,2); else {g.hp-=2; if(g.hp<=0){e.board=e.board.filter(function(x){return x!==g;}); dealDeathrattle(b,e,g); b.log.push(log(g.name+' 被摧毁','combat'));}}}
  else if(has('dmgface3')) dmgHero(b,e,3);
  else if(has('dmgall2')) {
    var ks=e.board.slice(); e.board=[];
    ks.forEach(function(u){u.hp-=2; if(u.hp>0) e.board.push(u); else {dealDeathrattle(b,e,u);}});
    b.log.push(log('群攻造成2点，'+(ks.length-e.board.length)+' 个被摧毁','play'));
  }
  else if(has('dmgall12')) {
    var ks2=e.board.slice(); e.board=[];
    ks2.forEach(function(u){u.hp-=12; if(u.hp>0) e.board.push(u); else dealDeathrattle(b,e,u);});
    b.log.push(log('核选项造成12点全场伤害','play'));
  }
  else if(has('dmgall15')) {
    var ks3=e.board.slice(); e.board=[];
    ks3.forEach(function(u){u.hp-=15; if(u.hp>0) e.board.push(u); else dealDeathrattle(b,e,u);});
    b.log.push(log('大清洗造成15点全场伤害','play'));
  }
  else if(has('gunburst')) {
    var guns=p.board.filter(function(u){return u.kw.indexOf('gun')>=0;}).length;
    var d=guns*2;
    var ks4=e.board.slice(); e.board=[];
    ks4.forEach(function(u){u.hp-=d; if(u.hp>0) e.board.push(u); else dealDeathrattle(b,e,u);});
    b.log.push(log('饱和式打击：'+guns+' 门火炮造成 '+d+' 点全场伤害','play'));
  }
  else if(has('heal3')) {
    var mine=p.board.filter(function(u){return u.hp<u.maxhp;});
    if(mine.length){t=mine[Math.floor(Math.random()*mine.length)]; t.buffhp+=3; b.log.push(log(t.name+' +3 生命','play'));}
  }
  else if(has('buffall')) {
    p.board.filter(function(u){return u.kw.indexOf('gun')>=0;}).forEach(function(u){u.buff+=1;u.buffhp+=1;});
    b.log.push(log('装填：所有火炮 +1/+1 本回合','play'));
  }
  else if(has('buffall33')) {
    p.board.forEach(function(u){u.buff+=3;u.buffhp+=3;});
    b.log.push(log('全体强化：己方全场 +3/+3 本回合','play'));
  }
  else if(has('buffrand')) {
    if(p.board.length){t=p.board[Math.floor(Math.random()*p.board.length)]; t.buff+=2;t.buffhp+=2; b.log.push(log(t.name+' +2/+2','play'));}
  }
  else if(has('revolution')) {
    draw(b,p,3);
    p.board.filter(function(u){return u.kw.indexOf('soviet')>=0;}).forEach(function(u){u.buff+=2;u.buffhp+=2;});
    b.log.push(log('十月革命：抽3张，红军 +2/+2 本回合','play'));
  }
  else if(has('prodmax1')) {p.prodMax++; p.prod++; b.log.push(log('多共和国：产出上限 +1','play'));}
  else if(has('destroyprod1')) {
    if(e.prodMax>1){e.prodMax--; e.prod=Math.min(e.prod,e.prodMax); b.log.push(log('水晶破坏：'+e.name+' 产出上限 -1（剩 '+e.prodMax+'）','play'));}
  }
  else if(has('limitunit')) {e.flags.limitunit=true; b.log.push(log('出牌封锁：'+e.name+' 本回合最多打出1张单位','play'));}
  else if(has('skipdraw3')) {draw(b,p,3); p.flags.skipped=true; b.log.push(log('慢节奏：抽3张，跳过本回合','play'));}
  else if(has('finito')) {
    var n=e.prodMax<=2?16:8; dmgHero(b,e,n);
    b.log.push(log('慢节奏斩杀造成 '+n+' 点（产出上限'+e.prodMax+'）','play'));
  }
  else if(has('chargeall')) {
    p.board.forEach(function(u){u.nocharge=false; u.ready=true;});
    b.log.push(log('战争宣言：己方全场本回合获得冲锋','play'));
  }
  else if(has('piratedraw')) {
    var n2=p.board.filter(function(u){return /海盗|掠夺者/.test(u.name);}).length;
    draw(b,p,n2); b.log.push(log('劫掠：海盗 '+n2+' 个，抽 '+n2+' 张','play'));
  }
  else if(has('peek2')||has('peek3')) {
    var n3=has('peek3')?3:2;
    var seen=e.deck.slice(0,n3).map(function(c){return c.name;});
    b.log.push(log('侦察看到 '+e.name+' 卡组顶：'+(seen.join('、')||'无'),'play'));
  }
  else if(has('buff22')||has('debuff22')) {
    var u=card._target;
    if(u){ if(has('buff22')){u.buff+=2;u.buffhp+=2;} else {u.buff-=2;u.buffhp-=2;} b.log.push(log(unitName(u)+(has('buff22')?'+2/+2':'-2/-2'),'play')); }
  }
}

function needsTarget(card){
  return card.kw.indexOf('buff22')>=0||card.kw.indexOf('debuff22')>=0;
}

function canPlay(b,p,card){
  if(p.prod<card.cost) return {ok:false,why:'产出不足'};
  if(card.load>p.load) return {ok:false,why:'承受力不足（会爆炸）'};
  if(card.type==='unit'){
    if(p.flags.limitunit && p.unitsPlayed>=1) return {ok:false,why:'出牌封锁'};
    if(p.flags.skipped) return {ok:false,why:'本回合已跳过'};
  }
  return {ok:true};
}

function playCard(b,idx,target){
  var p=cur(b), e=opp(b);
  var card=p.hand[idx];
  if(!card) return false;
  var chk=canPlay(b,p,card);
  if(!chk.ok){ b.log.push(log('无法打出：'+chk.why,'fail')); return false; }
  if(needsTarget(card) && !target){ b.log.push(log(card.name+' 需选择目标','fail')); return false; }
  // 承受力结算
  if(card.load>0){ p.load-=card.load; b.log.push(log('承受力 -'+card.load+'（剩 '+p.load+'）','load')); }
  if(card.load<0){ p.load=Math.min(p.loadMax,p.load+(-card.load)); b.log.push(log('承受力 +'+(-card.load),'load')); }
  p.prod-=card.cost;
  p.hand.splice(idx,1);
  p.cardsPlayed++;
  if(needsTarget(card)) card._target=target;
  resolveEffects(b,p,e,card);
  if(card.type==='unit'){
    if(card.kw.indexOf('charge')>=0) card.ready=true;
    p.board.push(card); p.unitsPlayed++;
    b.log.push(log(p.name+' 部署 '+unitName(card),'play'));
  } else {
    p.discard.push(card);
    b.log.push(log(p.name+' 打出 '+card.name,'play'));
  }
  if(!b.over && p.flags.skipped){ /* 跳过不影响结算 */ }
  checkWin(b);
  return true;
}

function hasTaunt(list){return list.some(function(u){return u.kw.indexOf('taunt')>=0;});}

// target = {kind:'unit',id:uid} | {kind:'hero'}
function attack(b,attUid,tgt){
  var p=cur(b), e=opp(b);
  var u=p.board.filter(function(x){return x.uid===attUid;})[0];
  if(!u) return false;
  if(!u.ready){ b.log.push(log(u.name+' 未就绪','fail')); return false; }
  var eTaunt=hasTaunt(e.board);
  if(tgt.kind==='hero' && eTaunt){ b.log.push(log('必须先攻击嘲讽单位','fail')); return false; }
  var d=atk(u);
  if(d<=0){ b.log.push(log(u.name+' 攻击力为0','fail')); return false; }
  if(tgt.kind==='hero'){
    dmgHero(b,e,d);
    if(p.weapon){ dmgHero(b,p,0); }
  } else {
    var t=e.board.filter(function(x){return x.uid===tgt.id;})[0];
    if(!t){ b.log.push(log('目标已不存在','fail')); return false; }
    if(eTaunt && t.kw.indexOf('taunt')<0){ b.log.push(log('嘲讽限制','fail')); return false; }
    var td=atk(t);
    t.hp-=d; u.hp-=td;
    b.log.push(log(unitName(u)+' 攻击 '+unitName(t)+'（互伤 '+d+'/'+td+'）','combat'));
    if(t.kw.indexOf('chargeall')>=0) t.buff=0;
    if(u.kw.indexOf('chargeall')>=0) u.buff=0;
    if(t.hp<=0){ e.board=e.board.filter(function(x){return x!==t;}); dealDeathrattle(b,e,t); b.log.push(log(t.name+' 被摧毁','combat')); }
    if(u.hp<=0){ p.board=p.board.filter(function(x){return x!==u;}); dealDeathrattle(b,p,u); b.log.push(log(u.name+' 被摧毁','combat')); }
  }
  u.ready=false;
  checkWin(b);
  return true;
}

function checkWin(b){
  if(b.p[0].life<=0 && !b.over){ b.over='1'; b.log.push(log(b.p[0].name+' 被摧毁','turn')); }
  if(b.p[1].life<=0 && !b.over){ b.over='0'; b.log.push(log(b.p[1].name+' 被摧毁','turn')); }
}

// 跳过回合（慢节奏）
function skipRest(b){
  b.log.push(log(cur(b).name+' 跳过本回合剩余时间','turn'));
  return endTurn(b);
}

return {
  newBattle:newBattle, playCard:playCard, attack:attack, endTurn:endTurn, skipRest:skipRest,
  canPlay:canPlay, needsTarget:needsTarget, atk:atk, hp:hp, unitName:unitName,
  cur:cur, opp:opp, hasTaunt:hasTaunt
};
})();
