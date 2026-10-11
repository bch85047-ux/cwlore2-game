/* 冒烟测试：42 名英雄两两对打 100 局，检查引擎是否崩溃/超时 */
global.window = undefined;
globalThis.window = globalThis;

require('./data/heroes.js');
require('./data/cards.js');
require('./engine.js');

var HD = globalThis.HeroData, CD = globalThis.CardData, E = globalThis.Engine;

console.log('英雄数:', HD.ORDER.length);
console.log('卡牌数:', Object.keys(CD.CARDS).length);

/* 卡组构筑检查 */
var buildErr = 0;
HD.ORDER.forEach(function (k) {
  var d = CD.buildDeck(k);
  if (d.length !== 30) { console.log('! 构筑异常', k, d.length); buildErr++; }
  d.forEach(function (n) { if (!CD.CARDS[n]) { console.log('! 未知卡', k, n); buildErr++; } });
});
console.log('构筑检查错误:', buildErr);

/* 贪心 AI：能打就打，否则出最贵的牌 */
function ai(g, idx) {
  var s = g.p[idx], o = g.p[idx ^ 1];
  var steps = 0;
  while (g.winner === null && steps++ < 60) {
    /* 技能 */
    var sc = E.SKILL_COST(s.hero.ability);
    if (s.prod >= sc && !s.skillUsed) { var r = E.useSkill(g, idx); if (!r.ok) s.skillUsed = true; continue; }
    /* 出牌 */
    var best = -1, bestCost = -1;
    for (var i = 0; i < s.hand.length; i++) {
      var c = CD.CARDS[s.hand[i]];
      if (c.cost <= s.prod && c.cost > bestCost) {
        if (c.t === 'u' && s.board.length >= s.load) continue;
        bestCost = c.cost; best = i;
      }
    }
    if (best >= 0) { var r2 = E.playCard(g, idx, best); if (r2.ok) continue; }
    /* 攻击 */
    for (var j = 0; j < s.board.length; j++) {
      var u = s.board[j];
      if (u.summonSick || u.attacked <= 0 || u.atk <= 0) continue;
      var taunts = o.board.filter(function (x) { return x.kw.indexOf('taunt') >= 0; });
      var tgt = taunts.length ? taunts[0].uid : (o.board.length ? o.board[0].uid : 'hero');
      if (u.pierce && !o.board.length) tgt = 'hero';
      var r3 = E.attack(g, idx, u.uid, tgt);
      if (r3.ok) break;
    }
    break;
  }
}

/* 100 局随机对打 */
var wins = {}, err = 0, timeout = 0, maxTurn = 0;
var N = 100;
for (var n = 0; n < N; n++) {
  var k1 = HD.ORDER[Math.floor(Math.random() * HD.ORDER.length)];
  var k2 = HD.ORDER[Math.floor(Math.random() * HD.ORDER.length)];
  var g;
  try {
    g = E.newGame(k1, k2);
  } catch (e) { console.log('开局崩溃', k1, k2, e.message); err++; continue; }
  try {
    var guard = 0;
    while (g.winner === null && guard++ < 200) {
      ai(g, g.active);
      E.endPlayerTurn(g, g.active);
    }
    if (g.winner === null) timeout++;
    else wins[k1] = (wins[k1] || 0) + (g.winner === 0 ? 1 : 0);
    if (g.turn > maxTurn) maxTurn = g.turn;
  } catch (e) { console.log('对战崩溃', k1, 'vs', k2, '@turn', g.turn, e.message); err++; }
}
console.log('异常:', err, ' 超时:', timeout, ' 最长回合:', maxTurn);
var top = Object.keys(wins).sort(function (a, b) { return wins[b] - wins[a]; }).slice(0, 8);
console.log('胜率前 8:');
top.forEach(function (k) { console.log('  ' + HD.HEROES[k].name + '  ' + wins[k]); });

/* 快照格式检查 */
var g2 = E.newGame('zimu', 'xiashui');
var s = E.snapshot(g2);
console.log('快照字段:', Object.keys(s).join(','));
console.log('边字段:', Object.keys(s.sides[0]).join(','));
