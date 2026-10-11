/* ============================================================================
 * 皇冠·卡牌战斗 — 战斗引擎 / ENGINE
 * ----------------------------------------------------------------------------
 * 结算流程（每回合）
 *   beginTurn → 产出恢复 / 抽牌 / 光环与被动 → 主阶段（出牌·攻击·技能）→ endTurn
 *               → 火炮结算 / 圣盾刷新检查 / 死亡清扫 → checkEnd
 * 规则要点
 *   1. 手牌上限 handMax，超出则抽牌销毁。
 *   2. 承受力 load = 战场满编数，满编不可出单位。
 *   3. 单位有召唤延迟（summonSick），【冲锋】可跳过。
 *   4. 【嘲讽】存在时，敌方攻击必须优先命中嘲讽单位。
 *   5. 【圣盾】消耗后本回合不再刷新。
 *   6. 牌库抽空 → 疲劳伤害（递增，从 1 起）。
 *   7. 卡牌师生命 ≤ 0 判负；特殊胜利条件见各英雄 ability。
 * ========================================================================== */
(function (root) {
  'use strict';

  var HD = root.HeroData, CD = root.CardData;

  /* ---------------- 侧（玩家） ---------------- */
  function makeSide(heroKey, isFirst, opts) {
    opts = opts || {};
    var H = opts.hero || HD.HEROES[heroKey];
    var deck = opts.deck ? CD.shuffle(opts.deck.slice()) : CD.shuffle(CD.buildDeck(heroKey));
    return {
      hero: H,
      key: heroKey,
      name: H.name,
      hp: H.hp, maxHp: H.hp,
      armor: 0,
      maxProd: 0, prod: 0,
      prod1: H.prod1, prodGrowth: H.prodGrowth,
      load: H.maxLoad,
      handMax: H.handMax,
      fatigueBase: 1,
      fatigue: 0,
      deck: deck, hand: [], board: [],
      turns: 0,
      ritual: 0,        /* 英灵槽 */
      prodDeny: 0,      /* 产出上限压制 */
      playLimit: 99,    /* 本回合出牌上限 */
      plays: 0,         /* 本回合已出牌数 */
      handHidden: false,
      blind: false
    };
  }

  /* ---------------- 单位实例 ---------------- */
  var _uid = 1;
  function makeUnit(cardName, owner) {
      var c = CD.get(cardName);
    if (!c) return null;
    if (c.t !== 'u') return null;
    return {
      uid: _uid++,
      name: c.n,
      cost: c.cost,
      atk: c.atk || 0,
      hp: c.hp || 1,
      maxHp: (c.hp || 1),
      kw: (c.kw || []).slice(),
      eff: c.eff || null,
      t: 'u',
      owner: owner,
      summonSick: true,
      ward: (c.kw || []).indexOf('ward') >= 0,
      attacked: 0
    };
  }

  /* ---------------- 日志 ---------------- */
  function log(g, who, text) {
    g.log.push({ who: who, text: text, turn: g.turn });
    if (g.log.length > 200) g.log.shift();
  }

  /* ---------------- 抽牌 / 疲劳 ---------------- */
  function draw(g, s, n) {
    n = n || 1;
    for (var i = 0; i < n; i++) {
      if (s.hand.length >= s.handMax) {
        if (s.deck.length > 0) {
          s.deck.pop();
          log(g, s.name, '手牌已满，抽到的牌被销毁。');
        }
        continue;
      }
      if (s.deck.length === 0) {
        s.fatigue += s.fatigueBase;
        log(g, s.name, '牌库抽空，疲劳伤害 +' + s.fatigue + '。');
        damageHero(g, s, s.fatigue);
        if (checkEnd(g)) return;
        continue;
      }
      s.hand.push(s.deck.pop());
    }
  }

  function sideIdx(g, s) { return g.p[0] === s ? 0 : 1; }
  /* s._g 由 newGame 绑定，因此 foe(s) 与 foe(g, s) 等价 */
  function foe(gOrS, maybeS) {
    var g = (gOrS && gOrS.p) ? gOrS : gOrS._g;
    var s = maybeS || gOrS;
    return g.p[g.p.indexOf(s) ^ 1];
  }
  function foeIdx(g, s) { return g.p.indexOf(s) ^ 1; }

  /* ---------------- 伤害 ---------------- */
  function damageHero(g, s, n, pierce) {
    var remain = n;
    if (!pierce && s.armor > 0) {
      var absorbed = Math.min(s.armor, remain);
      s.armor -= absorbed;
      remain -= absorbed;
    }
    if (remain > 0) s.hp -= remain;
    if (s.hp <= 0) s.hp = 0;
  }

  function damageUnit(g, u, n) {
    if (u.ward) { u.ward = false; return false; }
    u.hp -= n;
    return true;
  }

  /* 死亡结算带递归深度闸：自爆链与亡语互殴可能无限循环 */
  var _depth = 0;
  function clean(g, s) {
    var dead = s.board.filter(function (u) { return u.hp <= 0; });
    if (dead.length && _depth > 40) {
      s.board = s.board.filter(function (u) { return u.hp > 0; });
      return;
    }
    dead.forEach(function (u) { _depth++; onDeath(g, s, u); _depth--; });
    if (dead.length) {
      s.board = s.board.filter(function (u) { return u.hp > 0; });
    }
  }

  /* ---------------- 亡语 ---------------- */
  function onDeath(g, s, u) {
    var eff = u.eff;
    var o = foe(s);
    if (eff && eff.die) {
      /* 相邻敌人：简化为敌方全场随机 1 个，或无单位时打脸 */
      var targets = o.board;
      if (targets.length) {
        var t = targets[Math.floor(Math.random() * targets.length)];
        damageUnit(g, t, eff.die);
        clean(g, o);
        log(g, s.name, u.name + ' 亡语：对 ' + t.name + ' 造成 ' + eff.die + ' 点伤害。');
      } else {
        damageHero(g, o, eff.die);
        log(g, s.name, u.name + ' 亡语：对 ' + o.name + ' 造成 ' + eff.die + ' 点伤害。');
      }
    }
    if (eff && eff.revive) {
      /* 复活：半血重新上场（若未超编） */
      if (s.board.length < s.load) {
        var r = {
          uid: u.uid, name: u.name, cost: u.cost, atk: u.atk,
          hp: Math.max(1, Math.ceil(u.maxHp / 2)), maxHp: u.maxHp,
          kw: u.kw.slice(), eff: u.eff, owner: u.owner,
          summonSick: true, ward: false, attacked: 0
        };
        s.board.push(r);
        log(g, s.name, u.name + ' 被复活。');
      }
    }
  }

  /* =====================================================================
   * 效果结算
   * =================================================================== */
  function applyEffect(g, s, eff, ctx) {
    if (!eff) return;
    var o = foe(s);
    for (var k in eff) {
      if (!Object.prototype.hasOwnProperty.call(eff, k)) continue;
      var v = eff[k];
      switch (k) {
        case 'draw':        draw(g, s, v); break;
        case 'damageHero':  damageHero(g, o, v); break;
        case 'damageAll':
          o.board.forEach(function (u) { damageUnit(g, u, v); });
          clean(g, o);
          log(g, s.name, '对敌方全场造成 ' + v + ' 点伤害。');
          break;
        case 'killWeak':
          o.board.forEach(function (u) { if (u.atk <= v) damageUnit(g, u, 999); });
          clean(g, o);
          log(g, s.name, '消灭敌方攻击 ≤ ' + v + ' 的单位。');
          break;
        case 'destroyAll':
          o.board.forEach(function (u) { damageUnit(g, u, 999); });
          clean(g, o);
          log(g, s.name, '消灭敌方全场单位。');
          break;
        case 'buffAll':
          s.board.forEach(function (u) {
            u.atk += v.atk; u.hp += v.hp; u.maxHp += v.hp;
          });
          log(g, s.name, '我方全场 +' + v.atk + '/' + v.hp + '。');
          break;
        case 'buffHand':
          s.hand.forEach(function (n) {
            var u = makeUnit(n, s.owner !== undefined ? s.owner : 0);
          });
          break;
        case 'summon':
          for (var a = 0; a < v.n; a++) {
            if (s.board.length >= s.load) break;
            var u1 = makeUnit(v.id, g.p.indexOf(s));
            if (u1) s.board.push(u1);
          }
          break;
        case 'summonWeak':
          for (var b = 0; b < v.n; b++) {
            if (s.board.length >= s.load) break;
            s.board.push({
              uid: _uid++, name: v.id || ('临时单位'), cost: 0,
              atk: v.a, hp: v.h, maxHp: v.h, kw: [], eff: null,
              owner: g.p.indexOf(s), summonSick: true, ward: false, attacked: 0
            });
          }
          log(g, s.name, '召唤 ' + v.n + ' 个 ' + v.a + '/' + v.h + ' 单位。');
          break;
        case 'healHero': s.hp = Math.min(s.maxHp, s.hp + v); break;
        case 'gainProd': s.prod += v; break;
        case 'gainMaxProd': s.maxProd += v; s.prod += v; break;
        case 'addArmor': s.armor += v; break;
        case 'stealProd':
          var amt = Math.min(v, o.prod);
          o.prod -= amt; s.prod += amt;
          if (s.key === 'zhuweiyu') s.stolen = (s.stolen || 0) + amt;
          log(g, s.name, '偷取 ' + amt + ' 点产出。');
          break;
        case 'scry':
          var pool = s.deck.splice(s.deck.length - v, v);
          if (pool.length === 0) { log(g, s.name, '牌库已空，检视失败。'); break; }
          if (pool.length === 1) { s.hand.push(pool[0]); }
          else {
            /* 自动选费用最高的一张入场，其余回底（真交互在 UI 层实现） */
            pool.sort(function (a, b) { return (CD.get(b)||{}).cost - (CD.get(a)||{}).cost; });
            s.hand.push(pool[0]);
            pool.slice(1).forEach(function (c) { s.deck.unshift(c); });
          }
          log(g, s.name, '检视牌库顶 ' + pool.length + ' 张，指定 1 张入场。');
          break;
        case 'forceDraw':
          log(g, s.name, '对手被迫抽 ' + v + ' 张牌。');
          draw(g, o, v);
          break;
        case 'handPollute':
          for (var c2 = 0; c2 < v; c2++) {
            if (o.deck.length === 0) break;
            o.deck[o.deck.length - 1] = '鸭子';
          }
          log(g, s.name, '将对手牌库顶 ' + v + ' 张卡变为「鸭子」。');
          break;
        case 'chargeAll':
          s.board.forEach(function (u) { if (u.kw.indexOf('charge') < 0) u.kw.push('charge'); u.summonSick = false; });
          log(g, s.name, '我方全场获得【冲锋】。');
          break;
        case 'wardAll':
          s.board.forEach(function (u) { u.ward = true; });
          log(g, s.name, '我方全场获得【圣盾】。');
          break;
        case 'dispelAll':
          o.board.forEach(function (u) {
            if (u.atk > u.cost) u.atk = Math.max(u.cost, Math.floor(u.cost / 2));
            if (u.maxHp > u.cost) { u.maxHp = u.cost; u.hp = Math.min(u.hp, u.maxHp); }
          });
          log(g, s.name, '移除敌方全场增益。');
          break;
        case 'prodDeny': o.prodDeny += v; log(g, s.name, '对手产出上限永久 -' + v + '。'); break;
        case 'fatigueUp': o.fatigueBase += 1; log(g, s.name, '对手疲劳基础伤害 +1。'); break;
        case 'extraAtk':
          if (s.board.length) {
            var best = s.board.slice().sort(function (a, b) { return b.atk - a.atk; })[0];
            best.attacked = (best.attacked || 0) + 99; /* 追加攻击标记 */
            best.summonSick = false;
            log(g, s.name, best.name + ' 获得追加攻击。');
          }
          break;
        case 'ritual':
          s.ritual = Math.min(3, s.ritual + 1);
          if (s.ritual >= 3) {
            s.ritual = 0;
            o.board.forEach(function (u) { damageUnit(g, u, 6); });
            clean(g, o);
            draw(g, s, 1);
            log(g, s.name, '【抹除】触发：对敌方全场造成 6 点伤害。');
          }
          break;
        case 'die': break;
        case 'lifestealHit': break;
        case 'revive': break;
        case 'stackBuff':
          var cnt = s.board.filter(function (x) { return x.name === (ctx && ctx.name); }).length;
          if (ctx) { ctx.atk += Math.floor(cnt / 2) * v.atk; ctx.hp += Math.floor(cnt / 2) * v.hp; }
          break;
        case 'randomRes': {
          var kinds = ['prod', 'draw', 'buff', 'debuff'];
          var pick = kinds[Math.floor(Math.random() * kinds.length)];
          if (pick === 'prod') s.prod += 2;
          else if (pick === 'draw') draw(g, s, 1);
          else if (pick === 'buff') s.board.forEach(function (u) { u.atk += 1; u.hp += 1; });
          else o.board.forEach(function (u) { u.atk = Math.max(0, u.atk - 1); u.hp = Math.max(1, u.hp - 1); });
          break;
        }
        case 'weatherDie': {
          var d = 1 + Math.floor(Math.random() * 6);
          if (d >= 4) s.board.forEach(function (u) { u.atk += 1; });
          else if (d === 3) s.hp = Math.min(s.maxHp, s.hp + 2);
          else o.board.forEach(function (u) { damageUnit(g, u, d); });
          clean(g, o);
          s.weather = d;
          log(g, s.name, '天候骰 = ' + d + '。');
          break;
        }
        case 'upgrade':
          var low = s.board.filter(function (u) { return u.cost <= 2; })[0];
          if (low) { low.atk += 2; low.hp += 2; low.maxHp += 2; log(g, s.name, low.name + ' 被升级为优质单位。'); }
          break;
        case 'stealWin':
          if ((s.stolen || 0) >= 12) g.winner = g.p.indexOf(s);
          break;
        case 'finisher':
          var guns = s.board.filter(function (u) { return u.kw.indexOf('artillery') >= 0; }).length;
          var dmg = guns * v.mul;
          o.board.forEach(function (u) { damageUnit(g, u, dmg); });
          clean(g, o);
          if (dmg === 0) damageHero(g, o, v.mul);
          log(g, s.name, '饱和式打击：' + guns + ' 门火炮 × ' + v.mul + ' = ' + dmg + ' 点全场伤害。');
          break;
      }
    }
  }

  /* =====================================================================
   * 英雄技能
   * =================================================================== */
  function useSkill(g, idx) {
    var s = g.p[idx], o = foe(s);
    var cost = Math.max(1, SKILL_COST(s.hero.ability) - _skillPen);
    if (s.prod < cost) return { ok: false, err: '产出不足（需要 ' + cost + '）。' };
    if (s.skillUsed && s.skillLimit === 1) return { ok: false, err: '本回合已使用技能。' };
    s.prod -= cost;
    s.skillUsed = true;
    log(g, s.name, '使用技能【' + s.hero.skillName + '】。');

    switch (s.hero.ability) {
      case 'ritualSlot':   applyEffect(g, s, { ritual: 1 }); break;
      case 'handSynergy':
        if (s.hand.length >= 4) { draw(g, s, 2); s.board.forEach(function (u) { u.atk += 1; u.hp += 1; u.maxHp += 1; }); }
        else draw(g, s, 1);
        break;
      case 'swarmDraw':
        s.board.push(makeUnit('民兵', idx) || { uid:_uid++, name:'海盗', atk:1, hp:2, maxHp:2, kw:[], eff:null, owner:idx, summonSick:true, ward:false, attacked:0 });
        if (s.board.length > s.load) s.board.pop();
        s.board.push(makeUnit('民兵', idx) || { uid:_uid++, name:'海盗', atk:1, hp:2, maxHp:2, kw:[], eff:null, owner:idx, summonSick:true, ward:false, attacked:0 });
        var pirates = s.board.filter(function (u) { return u.name === '海盗' || u.name === '民兵'; }).length;
        if (pirates >= 2) draw(g, s, 1);
        break;
      case 'weatherDie': applyEffect(g, s, { weatherDie: 1 }); break;
      case 'randomRes':  applyEffect(g, s, { randomRes: 1 }); break;
      case 'reflect':
        s.armor += 4;
        s.reflect = 1;
        log(g, s.name, '镜面反射：本回合受到的伤害反弹。');
        break;
      case 'stackBuff':
        s.board.forEach(function (u) { u.atk += 1; u.hp += 1; u.maxHp += 1; });
        break;
      case 'superman':
        s.board.push({ uid:_uid++, name:'超人SUPERMAN', atk:6, hp:6, maxHp:6, cost:4,
          kw:['charge','ward'], eff:null, owner:idx, summonSick:false, ward:true,
          pierce:true, extra:true, attacked:99 });
        log(g, s.name, '禁忌召唤【超人SUPERMAN】：本回合攻击无视承受值。');
        break;
      case 'wipeLow': applyEffect(g, s, { killWeak: 3 }); break;
      case 'mindDisrupt':
        log(g, s.name, '翻开对手手牌并随机洗回 2 张。');
        o.hand = CD.shuffle(o.hand);
        o.playLimit = 1; o.plays = Math.max(o.plays, 0);
        draw(g, s, 1);
        break;
      case 'faceDmg': applyEffect(g, s, { damageHero: 5 }); break;
      case 'extraAtk': applyEffect(g, s, { extraAtk: 1 }); break;
      case 'stance':
        s.stance = s.stance === 'guard' ? 'attack' : 'guard';
        if (s.stance === 'guard') s.board.forEach(function (u) { u.hp += 2; u.maxHp += 2; });
        else s.board.forEach(function (u) { u.atk += 2; u.hp = Math.max(1, u.hp - 1); });
        log(g, s.name, '立场切换为【' + (s.stance === 'guard' ? '守' : '攻') + '】。');
        break;
      case 'stealWin':
        applyEffect(g, s, { stealProd: 3, stealWin: 1 });
        break;
      case 'pickBest': applyEffect(g, s, { scry: 5 }); break;
      case 'artilleryEnd': applyEffect(g, s, { finisher: { mul: 2 } }); break;
      case 'craft':
        if (s.board.length < s.load) {
          var pool = ['工程师', '术士', '斥候'];
          var nm = pool[Math.floor(Math.random() * pool.length)];
          var u = makeUnit(nm, idx);
          if (u) { s.board.push(u); log(g, s.name, '按蓝图合成「' + u.name + '」入场。'); }
        }
        break;
      case 'prodDeny': applyEffect(g, s, { prodDeny: 1 }); o.playLimit = 1; break;
      case 'ramp': applyEffect(g, s, { gainMaxProd: 1, gainProd: 2 }); break;
      case 'genericDraw': applyEffect(g, s, { scry: 3 }); break;
      case 'duckRelease':
        if (s.board.length < s.load) {
          s.board.push({ uid:_uid++, name:'鸭子', atk:1, hp:2, maxHp:2, cost:1, kw:[], eff:null, owner:idx, summonSick:true, ward:false, attacked:0 });
          if (o.board.length) {
            var t = o.board[Math.floor(Math.random() * o.board.length)];
            t.atk += 1; t.hp += 1; t.maxHp += 1;
            log(g, s.name, '鸭子将敌方 ' + t.name + ' 转化为资本主义立场（+1/+1）。');
          }
        }
        break;
      case 'susanoo':
        applyEffect(g, s, { summonWeak: { n: 3, a: 14, h: 14 } });
        break;
      case 'sameStack':
        applyEffect(g, s, { summonWeak: { n: 1, a: 3, h: 4 } });
        break;
      case 'lifestealPass': s.lifestealPass = 1; log(g, s.name, '血族祝福：本回合造成伤害 50% 转回复。'); break;
      case 'suicideAll':
        s.board.forEach(function (u) {
          o.board.forEach(function (e) { damageUnit(g, e, 3); });
          damageUnit(g, u, 999);
        });
        clean(g, o); clean(g, s);
        log(g, s.name, '联队突贯：全场单位自爆。');
        break;
      case 'comboChain': applyEffect(g, s, { extraAtk: 1 }); s.combo = true; break;
      case 'forceDraw': applyEffect(g, s, { forceDraw: 3 }); break;
      case 'upgrade': applyEffect(g, s, { upgrade: 1 }); break;
      case 'heavyUnit':
        if (s.board.length < s.load) {
          s.board.push({ uid:_uid++, name:'苏联坦克', atk:4, hp:6, maxHp:6, cost:3, kw:['taunt'], eff:null, owner:idx, summonSick:true, ward:false, attacked:0 });
          log(g, s.name, '召唤 4/6 坦克（嘲讽）。');
        }
        break;
      case 'scryTop': applyEffect(g, s, { scry: 3 }); break;
      case 'chargeBuff': applyEffect(g, s, { chargeAll: 1 }); s.board.forEach(function (u) { u.atk += 1; u.hp += 1; u.maxHp += 1; }); break;
      case 'interest':
        s.prod += 2;
        if (s.prod >= 6) { s.maxProd += 1; s.prod += 1; log(g, s.name, '利息结算：产出上限 +1。'); }
        break;
      case 'healBuff': applyEffect(g, s, { healHero: 5 }); s.board.forEach(function (u) { u.hp += 1; u.maxHp += 1; }); break;
      case 'tideCycle': break; /* 被动，beginTurn 结算 */
      case 'handPollute': applyEffect(g, s, { handPollute: 2 }); break;
      case 'rewriteUnit':
        if (s.board.length) {
          var ru = s.board[0];
          ru.atk += 2; ru.ward = true;
          log(g, s.name, '灵识改卡：' + ru.name + ' 攻击 +2 并附加圣盾。');
        }
        break;
      case 'blindDeck': s.blind = true; break;
      case 'blessCycle': applyEffect(g, s, { wardAll: 1, healHero: 3 }); break;
      case 'swapUnit':
        if (s.board.length && o.board.length) {
          var my = s.board[0], his = o.board[o.board.length - 1];
          var tmp = { uid: my.uid, name: my.name, atk: my.atk, hp: my.hp, maxHp: my.maxHp, kw: my.kw, eff: my.eff, owner: idx, summonSick: my.summonSick, ward: my.ward, attacked: my.attacked };
          his.atk = my.atk; his.hp = my.hp; his.maxHp = my.maxHp;
          s.board.shift();
          log(g, s.name, '游走：我方单位替换敌方 ' + his.name + ' 位置。');
        }
        break;
      case 'pierce':
        applyEffect(g, s, { chargeAll: 1 });
        s.board.forEach(function (u) { u.pierce = true; });
        log(g, s.name, '新式战法：消除全场「无法攻击卡牌师」效果，攻击可穿透嘲讽。');
        break;
      case 'duelDie':
        var a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
        if (a > b) { damageHero(g, o, 8); log(g, s.name, '正午决斗：' + a + ' vs ' + b + '，你胜。造成 8 点伤害。'); }
        else if (b > a) { damageHero(g, s, 8); log(g, s.name, '正午决斗：' + a + ' vs ' + b + '，你败。受到 8 点伤害。'); }
        else { damageHero(g, s, 3); damageHero(g, o, 3); log(g, s.name, '正午决斗：' + a + ' vs ' + b + '，同点，双方各受 3 点。'); }
        break;
      default: break;
    }
    clean(g, s); clean(g, o);
    return { ok: true };
  }

  var _skillPen = 0;
  function SKILL_COST(ab) {
    return ({ ritualSlot:3, handSynergy:2, swarmDraw:2, weatherDie:2, randomRes:1, reflect:2,
      stackBuff:0, superman:4, wipeLow:2, mindDisrupt:2, faceDmg:3, extraAtk:2, stance:2,
      stealWin:1, pickBest:2, artilleryEnd:4, craft:3, prodDeny:3, ramp:1, genericDraw:2,
      duckRelease:2, susanoo:5, sameStack:3, lifestealPass:2, suicideAll:3, comboChain:2,
      forceDraw:2, upgrade:2, heavyUnit:3, scryTop:2, chargeBuff:3, interest:1, healBuff:2,
      tideCycle:0, handPollute:2, rewriteUnit:3, blindDeck:0, blessCycle:0, swapUnit:2,
      pierce:2, duelDie:3 }[ab]) || 2;
  }

  /* =====================================================================
   * 出牌
   * =================================================================== */
  function playCard(g, idx, handIdx) {
    var s = g.p[idx], o = foe(s);
    if (g.winner !== null) return { ok: false, err: '对局已结束。' };
    if (s.plays >= s.playLimit) return { ok: false, err: '本回合出牌数已达上限。' };
    var name = s.hand[handIdx];
    if (!name) return { ok: false, err: '手牌索引无效。' };
      var c = CD.get(name);
    if (!c) return { ok: false, err: '卡牌不存在。' };
    if (c.cost > s.prod) return { ok: false, err: '产出不足（需要 ' + c.cost + '）。' };

    s.hand.splice(handIdx, 1);
    s.prod -= c.cost;
    s.plays++;

    if (c.t === 'u') {
      if (s.board.length >= s.load) {
        s.hand.unshift(name); s.prod += c.cost; s.plays--;
        return { ok: false, err: '承受力已满，无法部署单位。' };
      }
      var u = makeUnit(name, idx);
      if (!u) { s.hand.unshift(name); s.prod += c.cost; s.plays--; return { ok: false, err: '卡牌无效。' }; }
      /* 堆叠增益 */
      if (u.eff && u.eff.stackBuff) {
        var cnt = s.board.filter(function (x) { return x.name === u.name; }).length;
        if (cnt >= 2) { u.atk += Math.floor(cnt / 2); u.hp += Math.floor(cnt / 2); u.maxHp += Math.floor(cnt / 2); }
      }
      if (u.kw.indexOf('charge') >= 0) u.summonSick = false;
      s.board.push(u);
      log(g, s.name, '部署「' + u.name + '」' + u.atk + '/' + u.hp + '。');
      /* 入场效果 */
      if (c.eff) applyEffect(g, s, c.eff, u);
    } else {
      /* 法术 / 指令 */
      log(g, s.name, '施放「' + c.n + '」。');
      if (c.eff) applyEffect(g, s, c.eff, null);
    }
    clean(g, s); clean(g, o);
    checkEnd(g);
    return { ok: true };
  }

  /* =====================================================================
   * 攻击
   * =================================================================== */
  function attack(g, idx, attackerUid, target) {
    var s = g.p[idx], o = foe(s);
    if (g.winner !== null) return { ok: false, err: '对局已结束。' };
    var u = s.board.filter(function (x) { return x.uid === attackerUid; })[0];
    if (!u) return { ok: false, err: '单位不存在。' };
    if (u.summonSick) return { ok: false, err: '单位有召唤延迟，无法攻击。' };
    if (u.attacked <= 0) return { ok: false, err: '单位本回合已攻击。' };
    if (u.atk <= 0) return { ok: false, err: '攻击值为 0，无法攻击。' };

    /* 嘲讽规则 */
    if (target === 'hero') {
      if (!u.pierce && o.board.some(function (x) { return x.kw.indexOf('taunt') >= 0; })) {
        return { ok: false, err: '存在【嘲讽】单位，必须先攻击嘲讽目标。' };
      }
    } else {
      if (!u.pierce && o.board.some(function (x) { return x.kw.indexOf('taunt') >= 0 && x.uid !== target; })) {
        return { ok: false, err: '存在【嘲讽】单位，必须先攻击嘲讽目标。' };
      }
    }

    u.attacked--;
    var dmg = u.atk;

    if (target === 'hero') {
      damageHero(g, o, dmg, !!u.pierce);
      log(g, s.name, u.name + ' 攻击 ' + o.name + '，造成 ' + dmg + ' 点伤害。');
      if (s.lifestealPass) { var h = Math.floor(dmg / 2); s.hp = Math.min(s.maxHp, s.hp + h); }
    } else {
      var t = o.board.filter(function (x) { return x.uid === target; })[0];
      if (!t) return { ok: false, err: '目标不存在。' };
      var took = damageUnit(g, t, dmg);
      var back = took ? t.atk : 0;
      if (back > 0) damageUnit(g, u, back);
      log(g, s.name, u.name + ' 攻击 ' + t.name + '（' + dmg + '/' + back + '）。');
      if (u.kw.indexOf('lifesteal') >= 0) s.hp = Math.min(s.maxHp, s.hp + dmg);
    }

    /* 组合技链条 */
    if (s.combo) { u.attacked = Math.max(u.attacked, 1); }

    clean(g, s); clean(g, o);
    checkEnd(g);
    return { ok: true };
  }

  /* =====================================================================
   * 回合
   * =================================================================== */
  function beginTurn(g, idx) {
    var s = g.p[idx];
    s.turns++;
    s.prod = Math.min(s.maxProd, Math.max(0, s.prod1 + (s.turns - 1) * s.prodGrowth - s.prodDeny));
    s.maxProd = Math.max(0, s.prod1 + (s.turns - 1) * s.prodGrowth);
    s.plays = 0;
    s.playLimit = 99;
    s.skillUsed = false;
    s.reflect = 0;

    /* 潮汐被动 */
    if (s.hero.ability === 'tideCycle') {
      var rising = s.turns % 2 === 1;
      s.board.forEach(function (u) {
        if (rising) u.atk += 2; else { u.hp += 2; u.maxHp += 2; }
      });
      log(g, s.name, rising ? '涨潮：我方全场 +2 攻击。' : '退潮：我方全场 +2 承受值。');
    }

    /* 年礼被动（每 3 回合） */
    if (s.hero.ability === 'blessCycle' && s.turns > 0 && s.turns % 3 === 0) {
      s.board.forEach(function (u) { u.ward = true; });
      s.hp = Math.min(s.maxHp, s.hp + 3);
      log(g, s.name, '年礼：我方全场获得【圣盾】，恢复 3 点生命。');
    }

    /* 首回合额外抽 1 张 */
    draw(g, s, 1);
    /* 手牌保底 */
    if (s.hand.length === 0) draw(g, s, 1);

    s.board.forEach(function (u) {
      if (!u.summonSick) u.attacked = Math.max(u.attacked, u.extra ? 2 : 1);
      if (u.extra) { u.attacked = Math.max(u.attacked, 1); }
      u.extra = false;
    });
  }

  function endTurn(g, idx) {
    var s = g.p[idx], o = foe(s);
    /* 火炮结算 */
    s.board.filter(function (u) { return u.kw.indexOf('artillery') >= 0; }).forEach(function (u) {
      if (o.board.length) {
        var t = o.board[Math.floor(Math.random() * o.board.length)];
        damageUnit(g, t, 1);
        log(g, s.name, u.name + ' 火炮轰击 ' + t.name + '，造成 1 点伤害。');
      } else {
        damageHero(g, o, 1);
        log(g, s.name, u.name + ' 火炮轰击 ' + o.name + '，造成 1 点伤害。');
      }
    });
    clean(g, s); clean(g, o);
    s.board.forEach(function (u) { u.summonSick = true; u.attacked = 0; u.extra = false; });
    s.combo = false;
    s.lifestealPass = 0;
    checkEnd(g);
  }

  /* =====================================================================
   * 终局
   * =================================================================== */
  function checkEnd(g) {
    if (g.winner !== null) return true;
    var a = g.p[0], b = g.p[1];
    if (a.hp <= 0) { g.winner = 1; log(g, b.name, b.name + ' 获胜。'); return true; }
    if (b.hp <= 0) { g.winner = 0; log(g, a.name, a.name + ' 获胜。'); return true; }
    /* 逃跑胜利 */
    if (a.key === 'zhuweiyu' && (a.stolen || 0) >= 12) { g.winner = 0; log(g, a.name, '偷取产出达到 12，触发【逃跑胜利】。'); return true; }
    if (b.key === 'zhuweiyu' && (b.stolen || 0) >= 12) { g.winner = 1; log(g, b.name, '偷取产出达到 12，触发【逃跑胜利】。'); return true; }
    /* 回合上限 */
    if (g.turn > 120) {
      var t = a.hp + a.board.length * 3 - (a.deck.length === 0 ? a.fatigue : 0);
      var t2 = b.hp + b.board.length * 3 - (b.deck.length === 0 ? b.fatigue : 0);
      g.winner = t >= t2 ? 0 : 1;
      log(g, '系统', '达到回合上限，判定胜方：' + g.p[g.winner].name + '。');
      return true;
    }
    return false;
  }

  /* =====================================================================
   * 开局
   * =================================================================== */
  /* opts: { heroA, heroB, deckA, deckB, startDraw, startArmor, maxTurn } */
  function newGame(keyA, keyB, opts) {
    opts = opts || {};
    var a = makeSide(keyA, true, { hero: opts.heroA, deck: opts.deckA });
    var b = makeSide(keyB, false, { hero: opts.heroB, deck: opts.deckB });
    a.owner = 0; b.owner = 1;
    a._g = null; b._g = null;
    var g = {
      p: [a, b],
      active: 0,
      turn: 1,
      log: [],
      winner: null,
      state: {}
    };
    a._g = g; b._g = g;
    log(g, '系统', keyA + ' VS ' + keyB + '，对局开始。');
    /* 永久技能：起手牌数 / 起始承受值 */
    if (opts.startArmor) { a.armor += opts.startArmor; b.armor += opts.startArmor; }
    draw(g, a, opts.startDraw || 2);
    draw(g, b, opts.startDrawFirstB || 3);
    beginTurn(g, 0);
    return g;
  }

  function endPlayerTurn(g, idx) {
    endTurn(g, idx);
    g.active = idx ^ 1;
    g.turn++;
    beginTurn(g, g.active);
  }

  /* ---------------- 调试 / 快照 ---------------- */
  function snapshot(g) {
    return {
      turn: g.turn,
      active: g.active,
      winner: g.winner,
      sides: g.p.map(function (s) {
        return {
          key: s.key, name: s.name, hp: s.hp, maxHp: s.maxHp, armor: s.armor,
          prod: s.prod, maxProd: s.maxProd, load: s.load,
          hand: s.hand.slice(), handCount: s.hand.length,
          board: s.board.map(function (u) {
            return { uid: u.uid, name: u.name, atk: u.atk, hp: u.hp, kw: u.kw.slice(),
              ward: !!u.ward, summonSick: u.summonSick, attacked: u.attacked, pierce: !!u.pierce };
          }),
          deckCount: s.deck.length, fatigue: s.fatigue, plays: s.plays
        };
      })
    };
  }

  root.Engine = {
    newGame: newGame,
    playCard: playCard,
    attack: attack,
    useSkill: useSkill,
    endTurn: endTurn,
    endPlayerTurn: endPlayerTurn,
    checkEnd: checkEnd,
    snapshot: snapshot,
    makeUnit: makeUnit,
    SKILL_COST: SKILL_COST,
    setSkillPenalty: function (n) { _skillPen = n || 0; },
    skillPenalty: function () { return _skillPen; },
    skillCost: function (ab) { return Math.max(1, SKILL_COST(ab) - _skillPen); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
