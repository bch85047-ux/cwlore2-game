// 贪心 AI：能打就打、能杀就杀。不做前瞻，纯规则序。
window.AI = (function(){
'use strict';
var E = null;
function init(){ E = window.ENG; }

function pick(cardList){
  return cardList.slice().sort(function(a,b){ return a.cost - b.cost; });
}

// 打一张不需要目标的牌。返回是否成功。
function playSimple(b, i){
  return E.playCard(b, i);
}

// 给有目标的牌找目标：强化→己方最大攻击；削减→敌方最大攻击
function pickTarget(b, p, e, kw){
  var own = p.board.slice().sort(function(a,b){ return E.atk(b)-E.atk(a); });
  var foe = e.board.slice().sort(function(a,b){ return E.atk(b)-E.atk(a); });
  if (kw.indexOf('buff22') >= 0 && own.length) return {kind:'unit', id:own[0].uid};
  if (kw.indexOf('debuff22') >= 0 && foe.length) return {kind:'unit', id:foe[0].uid};
  return null;
}

function attackPhase(b){
  var p = E.cur(b), e = E.opp(b);
  var foeTaunt = e.board.filter(function(u){ return u.kw.indexOf('taunt') >= 0; });
  var units = p.board.filter(function(u){ return u.ready && E.atk(u) > 0; });
  for (var i = 0; i < units.length && !b.over; i++){
    var u = units[i];
    if (u.hp <= 0) continue;   // 之前被反伤打死
    if (foeTaunt.length){
      // 找最脆的嘲讽
      var t = foeTaunt.slice().sort(function(a,b){ return E.hp(a)-E.hp(b); })[0];
      E.attack(b, u.uid, {kind:'unit', id:t.uid});
    } else if (e.board.length && e.life > 8){
      // 场上有怪但英雄血厚：先清场
      var t2 = e.board.slice().sort(function(a,b){ return E.atk(b)-E.atk(a); })[0];
      E.attack(b, u.uid, {kind:'unit', id:t2.uid});
    } else {
      E.attack(b, u.uid, {kind:'hero'});
    }
    if (u.hp <= 0) continue;
    u.ready = false;
  }
  if (!b.over){
    // 刷新嘲讽列表后剩余单位直取英雄
    var left = p.board.filter(function(u){ return u.ready && E.atk(u) > 0; });
    for (var j = 0; j < left.length && !b.over; j++) E.attack(b, left[j].uid, {kind:'hero'});
  }
}

// 跑完整一个 AI 回合，分帧回调避免卡 UI
function run(b, done){
  init();
  var p, e, plays = 0;
  function step(){
    if (b.over) return done();
    p = E.cur(b); e = E.opp(b);
    if (b.who === (window.AI_SIDE == null ? 1 : window.AI_SIDE)){
      // 出牌阶段：从低费到高费
      var guard = 0;
      while (guard++ < 30 && !b.over){
        var order = pick(p.hand).map(function(c){
          return {idx: p.hand.indexOf(c), c: c};
        }).filter(function(x){ return E.canPlay(b, p, x.c).ok; });
        if (!order.length) break;
        var first = order[0];
        if (E.needsTarget(first.c)){
          var t = pickTarget(b, p, e, first.c.kw);
          if (t && E.playCard(b, first.idx, t)){ plays++; } else break;
        } else if (E.playCard(b, first.idx)) { plays++; }
        else break;
      }
      setTimeout(function(){ attackPhase(b); setTimeout(function(){ E.endTurn(b); done(); }, 30); }, 30);
    } else { done(); }
  }
  step();
}

return {run:run, isAI:function(b){ return b.who === (window.AI_SIDE == null ? 1 : window.AI_SIDE); }};
})();
