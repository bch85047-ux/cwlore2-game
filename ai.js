/* ============================================================================
 * 皇冠·卡牌战斗 — AI / AI
 * ----------------------------------------------------------------------------
 * 贪心决策，按当前局面价值排序：
 *   1. 斩杀优先：法术/技能直伤 ≥ 对手剩余生命+承受值 → 立即施放
 *   2. 清场：若敌方场面总攻击 ≥ 我方生命安全线，优先解场
 *   3. 出牌：按「攻击价值 + 换牌价值」评分，取最高
 *   4. 攻击：嘲讽优先，其次打能一击消灭的目标，最后打脸
 * ========================================================================== */
(function (root) {
  'use strict';
  var CD = root.CardData, E = root.Engine;

  function cardScore(card) {
    var s = 0;
    if (card.t === 'u') {
      s += card.atk * 1.0 + (card.hp || 0) * 0.5;
      if ((card.kw || []).indexOf('taunt') >= 0) s += 1.5;
      if ((card.kw || []).indexOf('charge') >= 0) s += 1.0;
      if ((card.kw || []).indexOf('artillery') >= 0) s += 1.0;
      if (card.eff && card.eff.die) s += card.eff.die * 0.5;
    }
    if (card.eff) {
      if (card.eff.damageHero) s += card.eff.damageHero * 1.2;
      if (card.eff.damageAll) s += card.eff.damageAll * 0.7;
      if (card.eff.killWeak) s += 3;
      if (card.eff.destroyAll) s += 4;
      if (card.eff.draw) s += card.eff.draw * 1.1;
      if (card.eff.healHero) s += card.eff.healHero * 0.4;
      if (card.eff.forceDraw) s += card.eff.forceDraw * 0.5;
      if (card.eff.scry) s += card.eff.scry * 0.4;
      if (card.eff.handPollute) s += card.eff.handPollute * 0.6;
      if (card.eff.buffAll) s += (card.eff.buffAll.atk + card.eff.buffAll.hp) * 0.3;
      if (card.eff.gainProd) s += card.eff.gainProd * 0.5;
      if (card.eff.prodDeny) s += card.eff.prodDeny * 1.5;
      if (card.eff.finisher) s += 5;
    }
    return s;
  }

  /* 单回合 AI：返回值 = 是否又执行了一步 */
  function step(g, idx) {
    var s = g.p[idx], o = g.p[idx ^ 1];
    if (g.winner !== null) return false;

    /* ---- 1. 技能 ---- */
    var sc = E.skillCost(s.hero.ability);
    if (s.prod >= sc && !s.skillUsed) {
      var r = E.useSkill(g, idx);
      if (!r.ok) s.skillUsed = true;
      return true;
    }

    /* ---- 2. 出牌 ---- */
    var best = -1, bestScore = -1, bestCost = -1;
    for (var i = 0; i < s.hand.length; i++) {
      var c = CD.CARDS[s.hand[i]];
      if (!c || c.cost > s.prod) continue;
      if (c.t === 'u' && s.board.length >= s.load) continue;
      var score = cardScore(c);
      /* 斩杀检测 */
      if (c.eff && c.eff.damageHero && c.eff.damageHero >= o.hp + o.armor) score += 100;
      /* 同分取费用高（省产出） */
      if (score > bestScore || (score === bestScore && c.cost > bestCost)) {
        bestScore = score; bestCost = c.cost; best = i;
      }
    }
    if (best >= 0) {
      var r2 = E.playCard(g, idx, best);
      if (r2.ok) return true;
    }

    /* ---- 3. 攻击 ---- */
    var taunts = o.board.filter(function (x) { return x.kw.indexOf('taunt') >= 0; });
    for (var j = 0; j < s.board.length; j++) {
      var u = s.board[j];
      if (u.summonSick || u.attacked <= 0 || u.atk <= 0) continue;

      var tgt = null;
      if (taunts.length) {
        /* 嘲讽：优先能一换一的 */
        var cands = taunts.slice().sort(function (a, b) { return a.hp - b.hp; });
        for (var k = 0; k < cands.length; k++) {
          if (u.atk >= cands[k].hp && !(cands[k].ward)) { tgt = cands[k].uid; break; }
          if (u.atk >= cands[k].hp) tgt = cands[k].uid;
        }
        if (tgt === null) tgt = cands[0].uid;
      } else if (o.board.length) {
        /* 无嘲讽：打能消灭的，其次打攻击最高的 */
        var live = o.board.filter(function (x) { return x.hp <= u.atk; });
        if (live.length) {
          live.sort(function (a, b) { return b.atk - a.atk; });
          tgt = live[0].uid;
        } else {
          /* 我方生命安全线：敌方总攻 > 我方剩余生命时先清场 */
          var enemyPower = o.board.reduce(function (t, x) { return t + x.atk; }, 0);
          if (enemyPower > s.hp + s.armor * 0.5) {
            var sorted = o.board.slice().sort(function (a, b) { return b.atk - a.atk; });
            tgt = sorted[0].uid;
          } else {
            tgt = 'hero';   /* 直接打脸 */
          }
        }
      } else {
        tgt = 'hero';
      }

      var r3 = E.attack(g, idx, u.uid, tgt);
      if (r3.ok) return true;
    }
    return false;
  }

  /* 跑完一整回合 */
  function fullTurn(g, idx) {
    var guard = 0;
    while (step(g, idx) && guard++ < 80 && g.winner === null) { /* loop */ }
    return g;
  }

  root.AI = { step: step, fullTurn: fullTurn, score: cardScore };
})(typeof window !== 'undefined' ? window : globalThis);
