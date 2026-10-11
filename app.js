/* ============================================================================
 * 皇冠·卡牌战斗 — 应用 / APP
 * ----------------------------------------------------------------------------
 * 屏幕：大厅 · 战斗 · 肉鸽地图 · 商人 · 改造 · 图鉴 · 永久技能
 * 存档：localStorage['huanguan.save']
 * ========================================================================== */
(function (root) {
  'use strict';
  var HD = root.HeroData, CD = root.CardData, RL = root.Roguelike, E = root.Engine, AI = root.AI;

  /* ---------------- 存档 ---------------- */
  var SAVE_KEY = 'huanguan.save.v1';
  function defaultSave() {
    return {
      frag: 0, gold: 1,
      perm: {},                     /* permSkillId -> true */
      unlocked: { 'zimu': 1 },      /* 首次解锁：字母 */
      runs: 0, wins: 0, losses: 0,
      bestRun: 0
    };
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      var s = JSON.parse(raw);
      var d = defaultSave();
      for (var k in d) if (s[k] === undefined) s[k] = d[k];
      return s;
    } catch (e) { return defaultSave(); }
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(State.save)); } catch (e) {}
  }
  function hasPerm(id) { return !!(State.save.perm && State.save.perm[id]); }

  /* ---------------- 运行态 ---------------- */
  var State = {
    save: loadSave(),
    screen: 'lobby',
    sel: 'zimu',
    opp: 'xiashui',
    run: null,
    battle: null,
    shopIdx: 0,
    shopItems: [],
    modChoices: [],
    pendingModFrom: null,   /* 'battle' | 'shop' */
    codexCat: 'hero',
    codexSel: 'zimu',
    toastT: null
  };

  /* ---------------- DOM ---------------- */
  var $ = function (s, p) { return (p || document).querySelector(s); };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(State.toastT);
    State.toastT = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  /* ---------------- 切屏 ---------------- */
  function go(screen) {
    State.screen = screen;
    document.querySelectorAll('.lobby').forEach(function (x) { x.classList.remove('lobby'); });
    document.querySelectorAll('.screen').forEach(function (x) { x.classList.remove('on'); });
    var LAYOUT = { lobby:'lobby', battle:'battle', run:'run', shop:'shop', mod:'mod', codex:'codex', meta:'meta' };
    var sc = $('#screen-' + screen);
    if (sc) sc.className = 'screen on' + (LAYOUT[screen] ? ' ' + LAYOUT[screen] : '');
    /* 导航高亮 */
    var navMap = { lobby: 'nav-lobby', run: 'nav-lobby', shop: 'nav-lobby', mod: 'nav-lobby' };
    document.querySelectorAll('.topbar nav button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.scr === screen || (navMap[screen] && b.id === navMap[screen]));
    });
    renderTopbar();
    if (screen === 'lobby') renderLobby();
    if (screen === 'run') renderRun();
    if (screen === 'shop') renderShop();
    if (screen === 'mod') renderMod();
    if (screen === 'codex') renderCodex();
    if (screen === 'meta') renderMeta();
  }
  function switchBattle() {
    State.screen = 'battle';
    document.querySelectorAll('.screen').forEach(function (s) { s.className = 'screen'; });
    $('#screen-battle').className = 'screen on battle';
    renderTopbar();
  }

  /* ---------------- 顶部栏 ---------------- */
  function renderTopbar() {
    var tb = $('#topbar');
    /* 战斗中不显示导航，避免中途切到图鉴等无关界面 */
    var nav = '';
    if (!State.battle) {
      if (State.run) nav = '<button data-scr="run" id="nav-run">征途</button>';
      nav += '<button data-scr="lobby" id="nav-lobby">大厅</button>' +
             '<button data-scr="codex" id="nav-codex">图鉴</button>' +
             '<button data-scr="meta" id="nav-meta">技能树</button>';
    }
    var cur = '';
    if (!State.battle) {
      cur = '<div class="currency">' +
        '<div title="碎片"><span class="ico frag">碎</span><b>' + State.save.frag + '</b></div>' +
        '<div title="皇冠"><span class="ico gold">冠</span><b>' + State.save.gold + '</b></div>' +
        '</div>';
    } else {
      cur = '<button class="end-btn" id="navQuit" style="padding:5px 14px;font-size:11px">退出</button>';
    }
    var sub = State.run
      ? '<small>RUN ' + (State.run.nodeIdx + 1) + '/12 · ' + HD.HEROES[State.run.hero].name + '</small>'
      : '<small>44 英雄 · 177 卡</small>';
    tb.innerHTML =
      '<div class="logo">皇冠·卡牌战斗' + sub + '</div>' +
      '<nav>' + nav + '</nav>' +
      '<div class="spacer"></div>' + cur;
    tb.querySelectorAll('nav button').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.scr); });
    });
    var q = $('#navQuit');
    if (q) q.addEventListener('click', quitBattle);
  }
  /* =====================================================================
   * 卡面渲染（全站共用）
   * =================================================================== */
  function kindOf(c) {
    if (c.t === 'u') return '单位';
    if (c.t === 'sp') return '法术';
    return '指令';
  }
  function cardHTML(c, o) {
    o = o || {};
    var cls = 'card ' + (c.t === 'sp' ? 'spell' : (c.t === 'or' ? 'order' : ''));
    if (o.cls) cls += ' ' + o.cls;
    if (o.disabled) cls += ' cant';
    var data = o.data ? ' data-i="' + o.data + '"' : '';
    var s = '<div class="' + cls + '"' + data + '>';
    s += '<div class="head">' +
      '<span class="cost' + (c.t === 'u' ? ' u' : '') + '">' + c.cost + '</span>' +
      '<span>' + esc(c.n) + '</span>' +
      '<span class="kind">' + kindOf(c) + '</span>' +
      '</div>';
    var txt = c.text || '';
    if (c.mods > 0) txt += '（改造 ×' + c.mods + '）';
    if (o.blur) txt = '· 内容遮蔽 ·';
    s += '<div class="body">' + esc(txt) + '</div>';
    if ((c.kw || []).length) {
      var kws = c.kw.map(function (k) { return HD.KW[k] ? HD.KW[k].zh : k; });
      s += '<div class="kw">' + kws.map(function (k) { return '<span>' + k + '</span>'; }).join('') + '</div>';
    }
    if (c.t === 'u') {
      s += '<div class="foot"><span class="atk">' + c.atk + '</span>' +
           '<span class="hpc">' + (o.showMax ? c.hp + '/' + c.maxHp : c.hp) + '</span></div>';
    }
    s += '</div>';
    return s;
  }

  /* =====================================================================
   * 大厅
   * =================================================================== */
  function heroOf(k) { return HD.HEROES[k]; }
  function archTag(k) {
    var h = heroOf(k);
    var a = Array.isArray(h.arch) ? h.arch[0] : h.arch;
    return HD.ARCHETYPES[a] ? HD.ARCHETYPES[a].tag : a;
  }
  function facTags(k) {
    return heroOf(k).fac.map(function (f) { return HD.FAC[f] || f; });
  }

  function renderLobby() {
        var box = $('#screen-lobby');
    box.innerHTML =
      '<aside class="lobby-side" id="lobbySide"></aside>' +
      '<main class="lobby-main" id="lobbyMain"></main>';

    /* 左侧：选中英雄详情 */
    var k = State.sel, h = heroOf(k);
    var a = HD.ARCHETYPES[Array.isArray(h.arch) ? h.arch[0] : h.arch];
    var side = $('#lobbySide');
    var skillHtml = '<div class="skill"><span class="sn">【' + esc(h.skillName) + '】</span>' +
      esc(h.skillDesc) + '</div>';
    var traitHtml = '<div class="trait">' + esc(h.trait) + '</div>';
    var lookHtml = h.look
      ? '<div class="trait" style="border-top:1px dashed var(--border);padding-top:10px">' +
        '<div style="color:var(--gold);font-size:11px;letter-spacing:.16em;margin-bottom:6px;font-family:var(--serif)">外貌</div>' +
        esc(h.look).replace(/\n/g, '<br>') + '</div>'
      : '';
    side.innerHTML =
      '<div class="sel-card">' +
      '<div class="nm">' + esc(h.name) + '</div>' +
      '<div class="tt">' + esc(h.title) + '</div>' +
      '<div class="tags">' +
        '<span class="tag g">' + esc(a.tag) + '</span>' +
        facTags(k).map(function (f) { return '<span class="tag b">' + esc(f) + '</span>'; }).join('') +
        '<span class="tag p">' + esc(h.tier) + '</span>' +
      '</div>' +
      '<div style="margin-top:10px">' +
        '<div class="row"><span>生命</span><b>' + h.hp + '</b></div>' +
        '<div class="row"><span>承受力</span><b>' + h.maxLoad + '</b></div>' +
        '<div class="row"><span>手牌上限</span><b>' + h.handMax + '</b></div>' +
        '<div class="row"><span>初始产出</span><b>' + h.prod1 + '</b></div>' +
        '<div class="row"><span>产出成长</span><b>+' + h.prodGrowth + '/回合</b></div>' +
        '<div class="row" style="border:none"><span>机制簇</span><b>' + esc(a.note) + '</b></div>' +
      '</div>' +
      skillHtml + traitHtml + lookHtml +
      '</div>';

    /* 右侧：英雄网格 + 动作 */
    var main = $('#lobbyMain');
    var grid = HD.ORDER.map(function (k2) {
      var h2 = heroOf(k2);
      var a2 = HD.ARCHETYPES[Array.isArray(h2.arch) ? h2.arch[0] : h2.arch];
      var isDlc = (k2 === 'roupuzi' || k2 === 'shangshufang');
      var unlocked = !isDlc || State.save.unlocked[k2];
      var cls = 'htile' + (k2 === State.sel ? ' on' : '') + (isDlc ? ' dlc' : '');
      return '<div class="' + cls + '" data-k="' + k2 + '">' +
        (isDlc ? '<span class="lock">锁</span>' : '') +
        '<div class="hst">' + esc(a2.tag) + '</div>' +
        '<div class="av">' + esc(h2.name.charAt(0)) + '</div>' +
        '<div class="hn">' + esc(h2.name) + '</div>' +
        '<div class="hs">' + esc(h2.title) + '</div>' +
        '</div>';
    }).join('');

    /* 对手选择 */
    var oppOpts = HD.ORDER.filter(function (x) { return x !== State.sel; }).map(function (k2) {
      var h2 = heroOf(k2);
      return '<option value="' + k2 + '"' + (k2 === State.sel ? '' : '') + '>' +
        esc(h2.name) + '（' + esc(HD.ARCHETYPES[Array.isArray(h2.arch) ? h2.arch[0] : h2.arch].tag) + '）</option>';
    }).join('');
    if (State.opp === State.sel) State.opp = (State.sel === 'zimu' ? 'xiashui' : 'zimu');

    main.innerHTML =
      '<div class="sec-h"><h3>动作</h3><div class="line"></div><span class="cnt">选择英雄后开始</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">' +
        '<div class="sel-card" style="padding:12px">' +
          '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">对手</div>' +
          '<select id="oppSel" style="width:100%;background:var(--panel2);color:var(--text);' +
            'border:1px solid var(--border2);border-radius:3px;padding:6px 8px;font-size:13px">' +
            oppOpts + '</select>' +
        '</div>' +
        '<div class="sel-card" style="padding:12px;display:flex;flex-direction:column;gap:8px;justify-content:center">' +
          '<button class="end-btn" id="btnQuick" style="width:100%">快速战斗</button>' +
          '<button class="buy" id="btnRun" style="width:100%;font-size:13px;padding:9px">开始征途（12 节点）</button>' +
        '</div>' +
      '</div>' +
      '<div class="sec-h"><h3>英雄</h3><div class="line"></div><span class="cnt">' + HD.ORDER.length + ' 位</span></div>' +
      '<div class="hero-grid">' + grid + '</div>';

    /* 事件 */
    main.querySelectorAll('.htile').forEach(function (t) {
      t.addEventListener('click', function () {
        State.sel = t.dataset.k;
        renderLobby();
      });
    });
    $('#oppSel').value = State.opp;
    $('#oppSel').addEventListener('change', function () { State.opp = this.value; });
    $('#btnQuick').addEventListener('click', startAIBattle);
    $('#btnRun').addEventListener('click', startRun);
  }

  /* =====================================================================
   * 起手
   * =================================================================== */
  function battleOpts() {
    var meta = State.save;
    return {
      startDraw: hasPerm('p_start') ? 3 : 2,
      startArmor: hasPerm('p_ward') ? 4 : 0
    };
  }
  function startQuickBattle() {
    E.setSkillPenalty(hasPerm('p_skill') ? 1 : 0);
    State.run = null;
    var opts = battleOpts();
    State.battle = E.newGame(State.sel, State.opp, opts);
    hideResult();
    switchBattle();
    renderBattle();
  }
  function startRun() {
    State.save.runs++;
    State.run = RL.newRun(State.sel, State.save.perm);
    State.shopIdx = 0;
    State.run.shopBuyCount = {};
    go('run');
    writeSave();
  }
  /* =====================================================================
   * 战斗界面
   * =================================================================== */
  function cur() { return State.battle; }
  function isHumanTurn() {
    var g = cur();
    return !!g && g.winner === null && g.active === 0;
  }

  function renderBattle() {
    var g = cur();
    if (!g) { go('lobby'); return; }
    var me = g.p[0], foe = g.p[1];
    var s = $('#screen-battle');
    var humanTurn = isHumanTurn();
    var sel = State.selUnit || null;

    var pips = function (side) {
      var out = '';
      var max = Math.max(side.maxProd, side.prod);
      for (var i = 0; i < max; i++) {
        out += '<i class="' + (i < side.prod ? 'max' : 'used') + '"></i>';
      }
      return out;
    };
    var heroRow = function (side, isMe) {
      var skCost = E.skillCost(side.hero.ability);
      var canSk = humanTurn && isMe && side.prod >= skCost && !side.skillUsed;
      var skUsed = side.skillUsed ? ' · 已施放' : '';
      /* 我方英雄：两行布局，第一行头像+信息，第二行技能+说明 */
      if (isMe) {
        return '<div class="b-row me-row">' +
          '<div class="me-top">' +
            '<div class="av">' + esc(side.hero.name.charAt(0)) + '</div>' +
            '<div class="me-info">' +
              '<div class="nm">' + esc(side.name) +
                '<span class="nm-t">' + esc(side.hero.title) + '</span></div>' +
              '<div class="stats">' +
                '<span class="hp"><span class="ico hp">血</span><b>' + side.hp + '</b>/' + side.maxHp + '</span>' +
                (side.armor > 0 ? '<span class="arm"><span class="ico arm">甲</span><b>' + side.armor + '</b></span>' : '') +
                '<span class="load"><span class="ico load">位</span><b>' + side.board.length + '</b>/' + side.load + '</span>' +
                '<span><span class="ico hand">手</span><b>' + side.hand.length + '</b>/' + side.handMax + '</span>' +
                '<span><span class="ico lib">库</span><b>' + side.deck.length + '</b></span>' +
              '</div>' +
            '</div>' +
            '<div class="pips">' + pips(side) + '</div>' +
          '</div>' +
          '<div class="me-skill">' +
            '<button class="skill-btn" data-act="skill"' + (canSk ? '' : ' disabled') + '>' +
              esc(side.hero.skillName) + '<span class="sk-cost">· ' + skCost + ' 产出</span></button>' +
            '<div class="skill-desc">' + esc(side.hero.skillDesc) + skUsed + '</div>' +
          '</div>' +
        '</div>';
      }
      /* 敌方英雄：右对齐单行 */
      return '<div class="b-row">' +
        '<div class="spacer"></div>' +
        '<div class="hero-box foe drop-zone' + (humanTurn && sel ? ' tgt-hero' : '') + '" data-act="hero-target"' +
          (humanTurn && sel ? ' style="cursor:crosshair"' : '') + '>' +
          '<div class="info">' +
            '<div class="nm">' + esc(side.name) +
              '<span class="nm-t">' + esc(side.hero.title) + '</span></div>' +
            '<div class="stats">' +
              '<span class="hp"><span class="ico hp">血</span><b>' + side.hp + '</b>/' + side.maxHp + '</span>' +
              (side.armor > 0 ? '<span class="arm"><span class="ico arm">甲</span><b>' + side.armor + '</b></span>' : '') +
              '<span class="load"><span class="ico load">位</span><b>' + side.board.length + '</b>/' + side.load + '</span>' +
              '<span><span class="ico hand">手</span><b>' + side.hand.length + '</b></span>' +
              '<span><span class="ico lib">库</span><b>' + side.deck.length + '</b></span>' +
            '</div>' +
          '</div>' +
          '<div class="av">' + esc(side.hero.name.charAt(0)) + '</div>' +
        '</div>' +
      '</div>';
    };

    var unitRow = function (side, isMe) {
      var sideCls = isMe ? ' mine' : ' enemy';
      if (!side.board.length) {
        return '<div class="board' + sideCls + ' drop-zone"><div class="empty">' +
          (isMe ? '我方战场 · 0/' + side.load : '敌方战场 · 0/' + side.load) + '</div></div>';
      }
      var html = side.board.map(function (u) {
        var canAtk = isMe && humanTurn && !u.summonSick && u.attacked > 0 && u.atk > 0;
        var cls = 'unit' + (canAtk ? ' can-atk' : '') +
                  (sel === u.uid ? ' sel' : '') +
                  (!canAtk && isMe ? ' exhausted' : '');
        var kws = (u.kw || []).map(function (k) { return HD.KW[k] ? HD.KW[k].zh : k; }).join(' ');
        var data = 'data-act="' + (isMe ? 'unit-mine' : 'unit-enemy') + '" data-uid="' + u.uid + '"';
        return '<div class="' + cls + ' drop-zone" ' + data + '>' +
          '<div class="un">' + esc(u.name) + '</div>' +
          (u.ward ? '<div class="uw">盾</div>' : '') +
          (u.pierce ? '<div class="um">穿透</div>' : '') +
          '<div class="row2"><span class="um-atk">' + u.atk + '</span>' +
            '<span class="um-hp">' + u.hp + '</span></div>' +
          (kws ? '<div class="ukw">' + kws + '</div>' : '') +
          '</div>';
      }).join('');
      return '<div class="board' + sideCls + ' drop-zone">' +
        '<div class="lane-lbl">' + (isMe ? '我方' : '敌方') + '</div>' +
        '<div class="slots">' + html + '</div></div>';
    };

    var handHTML = me.hand.map(function (name, i) {
      var c = CD.get(name) || CD.CARDS[name];
      if (!c) return '';
      var cant = !humanTurn || c.cost > me.prod || (c.t === 'u' && me.board.length >= me.load);
      return cardHTML(c, { data: i, cls: 'h' + (cant ? ' cant' : ''), blur: me.blind });
    }).join('');

    var hint = '';
    if (sel) hint = '点击敌方单位或卡牌师攻击。';
    else if (!humanTurn) hint = '敌方回合…';
    else hint = '拖拽出牌 / 点技能 / 点单位攻击。';

    /* 左侧日志栏 + 右侧战斗区 */
    s.innerHTML =
      '<div class="battle-wrap">' +
        '<aside class="battle-log" id="battleLog">' +
          '<div class="bl-hd">' +
            '<span class="bl-tt">日志</span>' +
            '<span class="bl-turn">回合 ' + g.turn + '</span>' +
            '<span class="bl-side' + (g.active === 0 ? ' me' : '') + '">' +
              (g.active === 0 ? '我方回合' : '敌方回合') + '</span>' +
          '</div>' +
          '<div class="bl-state">' +
            '<div class="bl-row"><span class="bl-lbl">我方</span>' +
              '<b>' + esc(me.name) + '</b>' +
              '<span class="bl-hp' + (me.hp <= 6 ? ' low' : '') + '">血 ' + me.hp + '</span>' +
              (me.armor > 0 ? '<span class="bl-arm">甲 ' + me.armor + '</span>' : '') +
              '<span class="bl-pr">产 ' + me.prod + '/' + me.maxProd + '</span>' +
              '<span class="bl-bd">场 ' + me.board.length + '</span>' +
              '<span class="bl-hd2">手 ' + me.hand.length + '</span>' +
              '<span class="bl-dc">库 ' + me.deck.length + '</span>' +
            '</div>' +
            '<div class="bl-row">' +
              '<span class="bl-lbl">敌方</span>' +
              '<b>' + esc(foe.name) + '</b>' +
              '<span class="bl-hp' + (foe.hp <= 6 ? ' low' : '') + '">血 ' + foe.hp + '</span>' +
              (foe.armor > 0 ? '<span class="bl-arm">甲 ' + foe.armor + '</span>' : '') +
              '<span class="bl-pr">产 ' + foe.prod + '/' + foe.maxProd + '</span>' +
              '<span class="bl-bd">场 ' + foe.board.length + '</span>' +
              '<span class="bl-hd2">手 ' + foe.hand.length + '</span>' +
              '<span class="bl-dc">库 ' + foe.deck.length + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="bl-body" id="logbar">' + logHTML(g) + '</div>' +
        '</aside>' +
        '<div class="battle-main">' +
          heroRow(foe, false) +
          unitRow(foe, false) +
          unitRow(me, true) +
          heroRow(me, true) +
          '<div class="b-row" style="justify-content:space-between;padding:4px 12px 2px">' +
            '<span style="font-size:11px;color:var(--muted)">' + esc(hint) + '</span>' +
            '<div style="display:flex;gap:10px;align-items:center">' +
              '<span style="font-size:11px;color:var(--gold);font-family:var(--serif);letter-spacing:.16em;white-space:nowrap">回合 ' +
                g.turn + ' · ' + (g.active === 0 ? me.name : foe.name) + '</span>' +
              '<button class="end-btn" data-act="end"' + (humanTurn ? '' : ' disabled') + '>结束回合</button>' +
            '</div>' +
          '</div>' +
          '<div class="hand" id="hand">' + (handHTML || '<div class="empty-hint">手牌为空</div>') + '</div>' +
        '</div>' +
      '</div>';

    bindBattle();
    var lb = $('#logbar');
    if (lb) lb.scrollTop = lb.scrollHeight;
  }

  function logHTML(g) {
    var items = g.log.slice(-120);
    return items.map(function (l) {
      var cls = l.who === '系统' ? 'sys' : '';
      var mark = '';
      return '<div class="' + cls + '">' + mark +
        (l.who === '系统' ? '' : '<b>' + esc(l.who) + '</b> ') + esc(l.text) + '</div>';
    }).join('');
  }

  function bindBattle() {
    var s = $('#screen-battle');
    s.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', onBattleAct);
    });
    /* 手牌：拖拽打出（主）+ 点击打出（兼容） */
    var hand = $('#hand');
    if (hand) {
      hand.querySelectorAll('.card.h').forEach(function (c) {
        var i = parseInt(c.getAttribute('data-i'), 10);
        if (isNaN(i)) return;
        c.addEventListener('click', onHandCard);
        c.addEventListener('pointerdown', function (e) {
          if (e.button !== undefined && e.button !== 0) return;
          Drag.start(e, i);
        });
      });
    }
  }

  /* =====================================================================
   * 拖拽出牌：pointer events，桌面与触屏通用
   *   单位卡 → 拖到我方战场 = 入场
   *   法术卡 → 拖到敌方单位或敌方卡牌师 = 施放（带目标）
   *   拖起但未落到有效区域 = 取消
   * =================================================================== */
  var Drag = {
    on: false, idx: -1, ghost: null, x0: 0, y0: 0, moved: false,
    card: null, zone: null,

    start: function (e, idx) {
      if (!isHumanTurn()) return;
      var g = cur(), me = g.p[0];
      var c = CD.get(me.hand[idx]) || CD.CARDS[me.hand[idx]];
      if (!c) return;
      if (c.cost > me.prod) { toast('产出不足。'); return; }
      if (c.t === 'u' && me.board.length >= me.load) { toast('战场已满。'); return; }
      this.on = true; this.idx = idx; this.card = c; this.moved = false;
      this.x0 = e.clientX; this.y0 = e.clientY;
      this.t0 = e.pointerId;
      var gh = document.createElement('div');
      gh.className = 'drag-ghost';
      gh.innerHTML = cardHTML(c, {});
      document.body.appendChild(gh);
      this.ghost = gh;
      gh.style.display = 'none';
      document.addEventListener('pointermove', Drag.move, { passive: false });
      document.addEventListener('pointerup', Drag.up);
      document.addEventListener('pointercancel', Drag.up);
    },

    move: function (e) {
      if (!Drag.on) return;
      var dx = e.clientX - Drag.x0, dy = e.clientY - Drag.y0;
      if (!Drag.moved && Math.sqrt(dx * dx + dy * dy) > 6) {
        Drag.moved = true;
        if (Drag.ghost) Drag.ghost.style.display = 'block';
      }
      if (Drag.moved) {
        e.preventDefault();   /* 阻止页面滚动 / 选择 */
        if (Drag.ghost) {
          Drag.ghost.style.left = (e.clientX - 48) + 'px';
          Drag.ghost.style.top = (e.clientY - 40) + 'px';
        }
        /* 高亮悬停区 */
        var prev = Drag.zone;
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var z = el ? el.closest('.drop-zone') : null;
        Drag.zone = z || null;
        if (prev && prev !== z) prev.classList.remove('over');
        if (z) z.classList.add('over');
      }
    },

    up: function (e) {
      if (!Drag.on) return;
      document.removeEventListener('pointermove', Drag.move);
      document.removeEventListener('pointerup', Drag.up);
      document.removeEventListener('pointercancel', Drag.up);
      document.querySelectorAll('.drop-zone.over').forEach(function (z) {
        z.classList.remove('over'); delete z.dataset.zone;
      });
      var played = false;
      if (Drag.moved && Drag.zone && Drag.card) {
        /* 所有法术均为全场/随机结算，不指定目标；
           单位卡落在任何战场区即入场，法术落在敌侧任意位置即施放。 */
        played = tryPlay(Drag.idx);
      }
      if (Drag.ghost) Drag.ghost.remove();
      document.querySelectorAll('.drop-zone.over').forEach(function (z) {
        z.classList.remove('over'); delete z.dataset.zone;
      });
      /* 拖拽结束后紧随的 click 事件要忽略，否则会重复出牌 */
      if (Drag.moved) {
        Drag.justDragged = true;
        setTimeout(function () { Drag.justDragged = false; }, 0);
      }
      Drag.on = false; Drag.idx = -1; Drag.card = null; Drag.zone = null;
    }
  };
  function tryPlay(idx) {
    var g = cur(), me = g.p[0];
    var r = E.playCard(g, 0, idx);
    if (!r.ok) { toast(r.err); return false; }
    renderBattle();
    checkHumanWon();
    return true;
  }

  function quitBattle() {
    if (!State.battle) return;
    State.battle = null; State.selUnit = null;
    $('#result').classList.remove('on');
    go('run');
  }

  function onHandCard(ev) {
    /* 拖拽结束后的一次 click 由拖拽逻辑处理，这里忽略 */
    if (Drag.justDragged) return;
    if (!isHumanTurn()) return;
    var i = parseInt(this.getAttribute('data-i'), 10);
    if (isNaN(i)) return;
    var g = cur(), me = g.p[0];
    var c = CD.get(me.hand[i]) || CD.CARDS[me.hand[i]];
    if (!c) return;
    var r = E.playCard(g, 0, i);
    if (!r.ok) { toast(r.err); return; }
    renderBattle();
    checkHumanWon();
  }

  function onBattleAct(ev) {
    var act = this.getAttribute('data-act');
    var g = cur();
    if (!g) return;

    if (act === 'end') {
      if (!isHumanTurn()) return;
      State.selUnit = null;
      E.endPlayerTurn(g, 0);
      renderBattle();
      checkHumanWon();
      /* 玩家回合结束 → 交给 AI */
      playAIGame();
      return;
    }
    if (act === 'skill') {
      if (!isHumanTurn()) return;
      var r = E.useSkill(g, 0);
      if (!r.ok) { toast(r.err); return; }
      renderBattle();
      checkHumanWon();
      return;
    }
    if (act === 'unit-mine') {
      var uid = parseInt(this.getAttribute('data-uid'), 10);
      if (!isHumanTurn()) return;
      var me = g.p[0];
      var u = me.board.filter(function (x) { return x.uid === uid; })[0];
      if (!u) return;
      if (u.summonSick || u.attacked <= 0 || u.atk <= 0) {
        toast('此单位本回合无法攻击。');
        return;
      }
      State.selUnit = (State.selUnit === uid) ? null : uid;
      renderBattle();
      return;
    }
    if (act === 'unit-enemy' || act === 'hero-target') {
      if (!isHumanTurn() || State.selUnit === null) {
        toast('请先选中一个我方单位。');
        return;
      }
      var tgt = act === 'hero-target' ? 'hero' : parseInt(this.getAttribute('data-uid'), 10);
      var r2 = E.attack(g, 0, State.selUnit, tgt);
      if (!r2.ok) { toast(r2.err); return; }
      State.selUnit = null;
      renderBattle();
      checkHumanWon();
    }
  }

  function checkHumanWon() {
    var g = cur();
    if (!g || g.winner === null) return;
    showResult(g);
  }

  function showResult(g) {
    var me = g.p[0], foe = g.p[1];
    var win = g.winner === 0;
    var rw = '';
    if (State.run) {
      if (win) {
        var node = State.run.nodes[State.run.nodeIdx];
        var isBoss = node && node.type === 'boss';
        rw = '<div class="reward">' +
          '<div>碎片 <b>+' + RL.battleReward(State.run, isBoss, State.save.perm) + '</b></div>' +
          '<div>改造机会 <b>×1（免费）</b></div>' +
          '</div>';
      }
    }
    $('#resultT').textContent = win ? '胜 利' : '战 败';
    $('#resultW').textContent = win ? me.name + ' 获胜' : foe.name + ' 获胜';
    $('#resultS').textContent = '共 ' + g.turn + ' 回合';
    $('#resultR').innerHTML = rw;
    $('#resultB').innerHTML = State.run
      ? '<button class="buy" id="rOk">继续</button>'
      : '<button class="buy" id="rOk">回到大厅</button>';
    $('#result').classList.add('on');
    $('#rOk').addEventListener('click', function () {
      $('#result').classList.remove('on');
      if (State.run) afterBattle(win);
      else { go('lobby'); }
    });
  }
  function hideResult() { $('#result').classList.remove('on'); }

  /* ---------------- 快速战斗 vs AI ---------------- */
  function playAIGame() {
    var g = cur();
    if (!g) return;
    if (g.winner !== null) return;
    /* active===1 → 敌方回合，交给 AI；active===0 → 玩家回合，等玩家操作 */
    if (g.active === 1) { runAITurn(); }
  }
  function runAITurn() {
    var g = cur();
    var stepN = 0;
    (function tick() {
      if (g.winner !== null) { showResult(g); return; }
      if (stepN++ > 90) { showResult(g); return; }
      var did = AI.step(g, 1);
      renderBattle();
      if (!did) {
        E.endPlayerTurn(g, 1);
        renderBattle();
        if (g.winner !== null) { showResult(g); return; }
        return;
      }
      setTimeout(tick, 380);
    })();
  }
  function startAIBattle() {
    startQuickBattle();
    setTimeout(playAIGame, 420);
  }
  /* =====================================================================
   * 肉鸽 · 征途地图
   * =================================================================== */
  function runDeckNames() {
    var run = State.run;
    var deck = CD.buildDeck(run.hero);
    return deck;
  }
  function runCardSource() {
    /* 返回 {name -> card} 的 run 内改造副本 */
    var src = {};
    var deck = runDeckNames();
    var seen = {};
    deck.forEach(function (n) { seen[n] = 1; });
    Object.keys(seen).forEach(function (n) {
      var c = RL.cardOf(State.run, n);
      if (c) src[n] = c;
    });
    /* 兜底：所有基础卡 */
    Object.keys(CD.CARDS).forEach(function (n) {
      if (!src[n]) src[n] = CD.CARDS[n];
    });
    return src;
  }

  function renderRun() {
    var run = State.run;
    if (!run) { go('lobby'); return; }
    var box = $('#screen-run');
    var node = run.nodes[run.nodeIdx];
    var opp = node && node.opp ? heroOf(node.opp) : null;

    var nodes = run.nodes.map(function (n, i) {
      var cls = 'run-node' + (n.done ? ' done' : '') +
                (i === run.nodeIdx ? ' cur' : '') + (i > run.nodeIdx ? ' lock' : '');
      var sub = '';
      if ((n.type === 'battle' || n.type === 'boss') && n.opp) {
        sub = '<div style="font-size:9px;color:var(--dim);margin-top:2px">' +
          esc(heroOf(n.opp).name) + '</div>';
      }
      return '<div class="' + cls + '">' +
        '<div class="ic">' + n.ic + '</div>' +
        '<div class="lb">' + n.lb + '</div>' + sub + '</div>';
    }).join('<div class="run-arrow">›</div>');

    var actBtn = '';
    if (node) {
      if (node.type === 'battle' || node.type === 'boss') {
        actBtn = '<button class="end-btn" id="rFight">迎击 ' + esc(opp.name) + '</button>';
      } else if (node.type === 'shop') {
        actBtn = '<button class="end-btn" id="rShop">拜访商人</button>';
      } else if (node.type === 'camp') {
        actBtn = '<button class="end-btn" id="rCamp">营地休整（免费改造 ×1）</button>';
      }
    } else {
      actBtn = '<button class="end-btn" id="rExit">本次征途结束</button>';
    }

    box.innerHTML =
      '<div class="run-map">' +
        '<div class="run-top">' +
          '<span>英雄 <b>' + esc(heroOf(run.hero).name) + '</b></span>' +
          '<span>节点 <b>' + (run.nodeIdx + 1) + ' / 12</b></span>' +
          '<span>胜利 <b>' + run.wins + '</b></span>' +
          '<span>失败 <b>' + run.losses + '</b></span>' +
          '<span>碎片 <b>' + run.frag + '</b></span>' +
          '<span>改造卡数 <b>' + Object.keys(run.mods).length + '</b></span>' +
        '</div>' +
        '<div class="run-nodes">' + nodes + '</div>' +
        '<div style="text-align:center;margin-top:8px">' + actBtn + '</div>' +
        '<div style="margin-top:16px">' +
          '<div class="sec-h"><h3>当前节点</h3><div class="line"></div></div>' +
          (node
            ? nodeDesc(node, opp)
            : '<div class="empty-hint">征途已结束。结算已写入大厅。</div>') +
        '</div>' +
        '<div style="margin-top:14px">' +
          '<div class="sec-h"><h3>改造记录</h3><div class="line"></div></div>' +
          modLogHTML() +
        '</div>' +
      '</div>';

    if (node && (node.type === 'battle' || node.type === 'boss')) {
      $('#rFight').addEventListener('click', function () { beginRunBattle(); });
    } else if (node && node.type === 'shop') {
      $('#rShop').addEventListener('click', openShop);
    } else if (node && node.type === 'camp') {
      $('#rCamp').addEventListener('click', function () { offerMods('camp'); });
    } else {
      $('#rExit').addEventListener('click', finishRun);
    }
  }

  function nodeDesc(node, opp) {
    if (node.type === 'boss') {
      return '<div class="shop-item"><div class="si-ic">冠</div>' +
        '<div class="si-bd"><div class="si-n">BOSS · ' + esc(opp.name) + '</div>' +
        '<div class="si-d">' + esc(opp.trait) + '</div>' +
        '<div class="si-f">胜利奖励：碎片 +1500，无需改造</div></div></div>';
    }
    if (node.type === 'battle') {
      return '<div class="shop-item"><div class="si-ic">战</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(opp.name) + '（' + esc(opp.tier) + '）</div>' +
        '<div class="si-d">' + esc(opp.trait) + '</div>' +
        '<div class="si-f">胜利奖励：碎片 400–900 + 免费改造 ×1</div></div></div>';
    }
    if (node.type === 'shop') {
      return '<div class="shop-item"><div class="si-ic">碎</div>' +
        '<div class="si-bd"><div class="si-n">商人</div>' +
        '<div class="si-d">用碎片购买改造。同一商人连续购买，价格每次 +50%。</div></div></div>';
    }
    return '<div class="shop-item"><div class="si-ic">营</div>' +
      '<div class="si-bd"><div class="si-n">营地</div>' +
      '<div class="si-d">休整：免费改造 ×1，不消耗碎片。</div></div></div>';
  }

  function modLogHTML() {
    var run = State.run;
    var keys = Object.keys(run.mods);
    if (!keys.length) return '<div class="empty-hint">尚未进行改造。</div>';
    return keys.map(function (n) {
      var ids = run.mods[n];
      var c = CD.CARDS[n];
      return '<div class="shop-item" style="margin-bottom:6px;padding:8px 10px">' +
        '<div class="si-bd">' +
          '<div class="si-n">' + esc(n) + '</div>' +
          '<div class="si-d">' + ids.map(function (id) {
            return RL.MUT_BY_ID[id] ? RL.MUT_BY_ID[id].n : id;
          }).join(' · ') + '</div>' +
        '</div></div>';
    }).join('');
  }

  /* ---------------- 征途节点执行 ---------------- */
  function beginRunBattle() {
    var run = State.run;
    var node = run.nodes[run.nodeIdx];
    E.setSkillPenalty(hasPerm('p_skill') ? 1 : 0);
    var src = runCardSource();
    CD.setSource(src);
    var opts = battleOpts();
    State.battle = E.newGame(run.hero, node.opp, opts);
    hideResult();
    switchBattle();
    renderBattle();
  }

  function afterBattle(win) {
    var run = State.run;
    var node = run.nodes[run.nodeIdx];
    if (win) {
      run.wins++;
      run.frag += RL.battleReward(run, node.type === 'boss', State.save.perm);
      node.done = true; node.result = 'win';
      if (node.type !== 'boss') offerMods('battle');
      else advanceNode();
    } else {
      run.losses++;
      node.done = true; node.result = 'loss';
      State.battle = null;
      finishRun();
    }
    writeSave();
  }

  function advanceNode() {
    var run = State.run;
    run.nodeIdx++;
    if (run.nodeIdx >= run.nodes.length) { finishRun(); return; }
    go('run');
  }

  function finishRun() {
    var run = State.run;
    if (!run) { go('lobby'); return; }
    var gold = RL.fragToGold(run.frag);
    State.save.frag += run.frag;
    State.save.gold += gold;
    State.save.wins += run.wins;
    State.save.losses += run.losses;
    if (run.wins > State.save.bestRun) State.save.bestRun = run.wins;
    /* 通关 8 场以上解锁 DLC */
    if (run.wins >= 4) State.save.unlocked['roupuzi'] = 1;
    if (run.wins >= 8) State.save.unlocked['shangshufang'] = 1;
    writeSave();
    State.run = null;
    State.battle = null;
    CD.setSource(null);
    toast('征途结算：+' + run.frag + ' 碎片，+' + gold + ' 皇冠');
    go('lobby');
  }

  /* =====================================================================
   * 改造三选一
   * =================================================================== */
  function offerMods(from) {
    var run = State.run;
    State.pendingModFrom = from;
    State.modChoices = RL.modChoices(run, run.hero, 3);
    if (!State.modChoices.length) {
      if (from === 'battle') advanceNode();
      else go('run');
      return;
    }
    go('mod');
  }

  function renderMod() {
    var box = $('#screen-mod');
    var items = State.modChoices.map(function (ch, i) {
      var c = RL.cardOf(State.run, ch.card);
      var m = RL.MUT_BY_ID[ch.mut];
      return '<div class="shop-item" data-i="' + i + '" style="cursor:pointer;border-color:var(--gold-dim)">' +
        '<div class="si-bd"><div class="si-n">' + esc(ch.card) + '</div>' +
        '<div class="si-d">' + (c ? c.text : '') + '</div>' +
        '<div class="si-f" style="color:var(--gold2)">→ ' + esc(m.n) + '：' + esc(m.d) + '</div>' +
        '</div></div>';
    }).join('');
    var reroll = '';
    if (State.run.rerollLeft > 0) {
      reroll = '<button class="buy" id="mReroll">重铸选项（剩 ' + State.run.rerollLeft + ' 次）</button>';
    }
    box.innerHTML = '<div class="shop"><main class="shop-main">' +
      '<div class="sec-h"><h3>改造 · 三选一</h3><div class="line"></div>' +
        '<span class="cnt">' + (State.pendingModFrom === 'camp' ? '营地休整' : '战斗胜利') + ' · 不消耗碎片</span></div>' +
      items +
      '<div style="margin-top:14px;display:flex;gap:8px">' + reroll +
        '<button class="buy" id="mSkip">跳过</button></div>' +
      '</main><aside class="shop-side">' + modSideHTML() + '</aside></div>';

    box.querySelectorAll('.shop-item').forEach(function (b) {
      b.addEventListener('click', function () {
        pickMod(parseInt(b.getAttribute('data-i'), 10));
      });
    });
    if ($('#mReroll')) {
      $('#mReroll').addEventListener('click', function () {
        State.run.rerollLeft--;
        State.modChoices = RL.modChoices(State.run, State.run.hero, 3);
        renderMod();
      });
    }
    $('#mSkip').addEventListener('click', function () { skipMod(); });
  }

  function modSideHTML() {
    var run = State.run;
    var c = Object.keys(run.mods);
    return '<div class="sel-card">' +
      '<div class="nm" style="font-size:16px">碎片</div>' +
      '<div class="tt">碎 ' + run.frag + '</div>' +
      '<div class="row" style="margin-top:10px"><span>已改造卡</span><b>' + c.length + '</b></div>' +
      '<div class="row"><span>总改造次数</span><b>' + c.reduce(function (t, k) {
        return t + run.mods[k].length; }, 0) + '</b></div>' +
      '<div class="trait" style="margin-top:10px">每卡上限 3 次改造。' +
        '碎片可用于商人购买，也可在结算时兑换皇冠（800 碎片 = 1 皇冠）。</div>' +
      '</div>';
  }

  function pickMod(i) {
    var ch = State.modChoices[i];
    if (!ch) return;
    var run = State.run;
    if (RL.modCount(run, ch.card) >= 3) { toast('此卡已达改造上限。'); return; }
    (run.mods[ch.card] = run.mods[ch.card] || []).push(ch.mut);
    toast('已改造「' + ch.card + '」');
    afterModPicked();
  }
  function skipMod() { afterModPicked(); }
  function afterModPicked() {
    var from = State.pendingModFrom;
    if (from === 'shop') { go('shop'); return; }
    advanceNode();
  }

  /* =====================================================================
   * 商人
   * =================================================================== */
  function openShop() {
    var run = State.run;
    var node = run.nodes[run.nodeIdx];
    State.shopItems = RL.shopStock(run, run.hero, State.shopIdx, Math.random);
    go('shop');
  }

  function renderShop() {
    var run = State.run;
    if (!run) { go('run'); return; }
    var box = $('#screen-shop');
    var items = State.shopItems.map(function (it, i) {
      var c = it.kind === 'mod' ? RL.cardOf(run, it.card) : CD.CARDS[it.card];
      var dis = run.frag < it.price;
      return '<div class="shop-item">' +
        '<div class="si-ic">' + (c ? c.cost : '?') + '</div>' +
        '<div class="si-bd">' +
          '<div class="si-n">' + esc(it.name) + '</div>' +
          '<div class="si-d">' + (c ? c.text : '') + '</div>' +
          '<div class="si-f">' + esc(it.desc) +
            (it.base !== it.price ? '（原价 ' + it.base + '，连买涨价）' : '') +
          '</div>' +
        '</div>' +
        '<div class="si-r"><div class="price frag">碎 ' + it.price + '</div>' +
          '<button class="buy" data-i="' + i + '"' + (dis ? ' disabled' : '') + '>购买</button></div>' +
      '</div>';
    }).join('');
    box.innerHTML = '<div class="shop"><main class="shop-main">' +
      '<div class="sec-h"><h3>商人</h3><div class="line"></div>' +
        '<span class="cnt">同一商人连买，价格 +50%</span></div>' +
      items +
      '<div style="margin-top:14px"><button class="end-btn" id="sLeave">离开商人</button></div>' +
      '</main><aside class="shop-side">' +
      '<div class="sel-card"><div class="nm" style="font-size:16px">碎片</div>' +
        '<div class="tt">碎 ' + run.frag + '</div></div>' +
      '<div class="sel-card"><div class="nm" style="font-size:16px">已改造</div>' +
        '<div class="tt">' + Object.keys(run.mods).length + ' 张卡</div>' +
        modLogHTML() + '</div>' +
      '</aside></div>';
    box.querySelectorAll('.buy[data-i]').forEach(function (b) {
      b.addEventListener('click', function () { buyItem(parseInt(b.getAttribute('data-i'), 10)); });
    });
    $('#sLeave').addEventListener('click', function () { leaveShop(); });
  }

  function buyItem(i) {
    var run = State.run;
    var it = State.shopItems[i];
    if (!it) return;
    if (run.frag < it.price) { toast('碎片不足。'); return; }
    if (RL.modCount(run, it.card) >= 3) { toast('此卡已达改造上限。'); return; }
    run.frag -= it.price;
    run.shopBuyCount = run.shopBuyCount || {};
    var key = 'shop' + State.shopIdx;
    run.shopBuyCount[key] = (run.shopBuyCount[key] || 0) + 1;
    if (it.kind === 'mod') {
      (run.mods[it.card] = run.mods[it.card] || []).push(it.mut);
      toast('已改造「' + it.card + '」：' + it.name);
    } else {
      (run.mods[it.card] = run.mods[it.card] || []).push('plus');
      toast('已精制「' + it.card + '」');
    }
    it.sold = 1;
    State.shopItems = State.shopItems.filter(function (x) { return !x.sold; });
    writeSave();
    renderShop();
  }

  function leaveShop() {
    var node = State.run.nodes[State.run.nodeIdx];
    node.done = true; node.result = 'shop';
    State.shopIdx++;
    advanceNode();
  }
  /* =====================================================================
   * 图鉴
   * =================================================================== */
  function renderCodex() {
    var box = $('#screen-codex');
    var cats = [
      { id: 'hero', n: '英雄', sub: HD.ORDER.length },
      { id: 'card', n: '卡牌', sub: Object.keys(CD.CARDS).length },
      { id: 'kw', n: '关键词', sub: Object.keys(HD.KW).length },
      { id: 'arch', n: '机制簇', sub: Object.keys(HD.ARCHETYPES).length },
      { id: 'mut', n: '改造', sub: RL.MUTATIONS.length },
      { id: 'perm', n: '永久技能', sub: RL.PERM_SKILLS.length }
    ];
    var side = cats.map(function (c) {
      return '<button data-c="' + c.id + '"' + (c.id === State.codexCat ? ' class="on"' : '') + '>' +
        '<span>' + c.n + '</span><small>' + c.sub + '</small></button>';
    }).join('');

    box.innerHTML = '<div class="codex"><aside class="codex-side">' + side + '</aside>' +
      '<main class="codex-main" id="codexMain"></main></div>';
    box.querySelectorAll('.codex-side button').forEach(function (b) {
      b.addEventListener('click', function () {
        State.codexCat = b.getAttribute('data-c');
        renderCodex();
      });
    });
    var main = $('#codexMain');
    if (State.codexCat === 'hero') renderCodexHero(main);
    else if (State.codexCat === 'card') renderCodexCard(main);
    else if (State.codexCat === 'kw') renderCodexKw(main);
    else if (State.codexCat === 'arch') renderCodexArch(main);
    else if (State.codexCat === 'mut') renderCodexMut(main);
    else renderCodexPerm(main);
  }

  function renderCodexHero(main) {
    var byArch = {};
    HD.list().forEach(function (h) {
      var a = Array.isArray(h.arch) ? h.arch[0] : h.arch;
      (byArch[a] = byArch[a] || []).push(h);
    });
    var html = '';
    Object.keys(byArch).sort().forEach(function (a) {
      var A = HD.ARCHETYPES[a];
      html += '<div class="sec-h"><h3>' + esc(A.tag) + '</h3><div class="line"></div>' +
        '<span class="cnt">' + byArch[a].length + '</span></div>' +
        '<div class="hero-grid" style="margin-bottom:14px">' +
        byArch[a].map(function (h) {
          return '<div class="htile' + (h.key === State.codexSel ? ' on' : '') + '" data-k="' + h.key + '">' +
            '<div class="hst">' + esc(A.tag) + '</div>' +
            '<div class="av">' + esc(h.name.charAt(0)) + '</div>' +
            '<div class="hn">' + esc(h.name) + '</div>' +
            '<div class="hs">' + esc(h.title) + '</div></div>';
        }).join('') + '</div>';
    });
    main.innerHTML = html + '<div id="codexDetail"></div>';
    main.querySelectorAll('.htile').forEach(function (t) {
      t.addEventListener('click', function () {
        State.codexSel = t.getAttribute('data-k');
        renderCodex();
      });
    });
    var h = heroOf(State.codexSel);
    var A = HD.ARCHETYPES[Array.isArray(h.arch) ? h.arch[0] : h.arch];
    var sigs = CD.signatureOf(h.key).map(function (c) { return cardHTML(c); }).join('');
    $('#codexDetail').innerHTML =
      '<div class="codex-detail">' +
        '<div class="cd-h"><span class="nm">' + esc(h.name) + '</span>' +
          '<span class="tt">' + esc(h.title) + '</span>' +
          '<span class="tag g">' + esc(A.tag) + '</span>' +
          h.fac.map(function (f) { return '<span class="tag b">' + esc(HD.FAC[f]) + '</span>'; }).join('') +
          '<span class="tag p">' + esc(h.tier) + '</span></div>' +
        '<div class="row" style="display:flex;gap:16px;font-size:12px;color:var(--muted);margin:6px 0">' +
          '<span>生命 <b style="color:var(--text)">' + h.hp + '</b></span>' +
          '<span>承受力 <b style="color:var(--text)">' + h.maxLoad + '</b></span>' +
          '<span>手牌上限 <b style="color:var(--text)">' + h.handMax + '</b></span>' +
          '<span>初始产出 <b style="color:var(--text)">' + h.prod1 + '</b></span>' +
          '<span>产出成长 <b style="color:var(--text)">' + h.prodGrowth + '</b></span>' +
        '</div>' +
        '<div class="cd-sk"><span class="sn">【' + esc(h.skillName) + '】</span>' + esc(h.skillDesc) + '</div>' +
        '<div class="cd-tr">' + esc(h.trait) + '</div>' +
        '<div class="cd-look"><h4>外貌</h4>' + esc(h.look || '（图鉴未收录外貌。）').replace(/\n/g, '<br>') + '</div>' +
        '<h4 style="font-size:11px;color:var(--gold);letter-spacing:.16em;margin:14px 0 8px">专属卡 · ' +
          CD.signatureOf(h.key).length + ' 张</h4>' +
        '<div class="cgrid">' + sigs + '</div>' +
      '</div>';
  }

  function renderCodexCard(main) {
    var all = Object.keys(CD.CARDS).map(function (n) { return CD.CARDS[n]; });
    all.sort(function (a, b) { return a.cost - b.cost || a.n.localeCompare(b.n, 'zh'); });
    var html = '<div class="sec-h"><h3>全部卡牌</h3><div class="line"></div>' +
      '<span class="cnt">' + all.length + ' 张</span></div>' +
      '<div class="cgrid">' + all.map(function (c) { return cardHTML(c); }).join('') + '</div>';
    main.innerHTML = html;
  }

  function renderCodexKw(main) {
    var html = '<div class="sec-h"><h3>关键词</h3><div class="line"></div></div>';
    Object.keys(HD.KW).forEach(function (k) {
      var d = HD.KW[k];
      html += '<div class="shop-item"><div class="si-ic" style="font-size:14px">' + esc(d.zh) + '</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(d.zh) + '</div>' +
        '<div class="si-d">' + esc(d.desc) + '</div>' +
        '<div class="si-f">' + k + '</div></div></div>';
    });
    main.innerHTML = html;
  }

  function renderCodexArch(main) {
    var html = '<div class="sec-h"><h3>机制簇</h3><div class="line"></div></div>';
    Object.keys(HD.ARCHETYPES).forEach(function (a) {
      var A = HD.ARCHETYPES[a];
      var who = HD.list().filter(function (h) {
        var x = Array.isArray(h.arch) ? h.arch : [h.arch];
        return x.indexOf(a) >= 0;
      });
      html += '<div class="shop-item"><div class="si-ic">' + esc(A.tag.charAt(0)) + '</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(A.tag) + '</div>' +
        '<div class="si-d">' + esc(A.note) + '</div>' +
        '<div class="si-f">使用者：' + who.map(function (h) { return h.name; }).join('、') + '</div>' +
        '</div></div>';
    });
    main.innerHTML = html;
  }

  function renderCodexMut(main) {
    var html = '<div class="sec-h"><h3>改造</h3><div class="line"></div>' +
      '<span class="cnt">每卡上限 3 次</span></div>';
    RL.MUTATIONS.forEach(function (m) {
      html += '<div class="shop-item"><div class="si-ic">' + esc(m.n.charAt(0)) + '</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(m.n) + '</div>' +
        '<div class="si-d">' + esc(m.d) + '</div>' +
        '<div class="si-f">商人标价 碎 ' + m.price + '</div>' +
        '</div></div>';
    });
    main.innerHTML = html;
  }

  function renderCodexPerm(main) {
    var html = '<div class="sec-h"><h3>永久技能</h3><div class="line"></div></div>';
    RL.PERM_SKILLS.forEach(function (p) {
      html += '<div class="shop-item"><div class="si-ic">' + esc(p.n.charAt(0)) + '</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(p.n) + '</div>' +
        '<div class="si-d">' + esc(p.d) + '</div>' +
        '<div class="si-f">冠 ' + p.cost + '</div>' +
        '</div></div>';
    });
    main.innerHTML = html;
  }

  /* =====================================================================
   * 技能树（meta 商店）
   * =================================================================== */
  function renderMeta() {
    var box = $('#screen-meta');
    var stats = State.save;
    var items = RL.PERM_SKILLS.map(function (p) {
      var owned = !!stats.perm[p.id];
      var can = !owned && stats.gold >= p.cost;
      return '<div class="shop-item">' +
        '<div class="si-ic">' + (owned ? '✓' : esc(p.n.charAt(0))) + '</div>' +
        '<div class="si-bd"><div class="si-n">' + esc(p.n) + '</div>' +
        '<div class="si-d">' + esc(p.d) + '</div>' +
        '<div class="si-f">' + (owned ? '已解锁' : '冠 ' + p.cost) + '</div></div>' +
        '<div class="si-r"><button class="buy" data-id="' + p.id + '"' +
          (can ? '' : ' disabled') + '>' + (owned ? '已拥有' : '解锁') + '</button></div>' +
      '</div>';
    }).join('');
    box.innerHTML = '<div class="shop"><main class="shop-main">' +
      '<div class="sec-h"><h3>永久技能</h3><div class="line"></div>' +
        '<span class="cnt">800 碎片 = 1 皇冠</span></div>' + items + '</main>' +
      '<aside class="shop-side">' +
        '<div class="sel-card"><div class="nm" style="font-size:16px">皇冠</div>' +
          '<div class="tt">冠 ' + stats.gold + '</div>' +
          '<div class="row" style="margin-top:10px"><span>碎片</span><b>' + stats.frag + '</b></div>' +
          '<div class="row"><span>已解锁</span><b>' +
            Object.keys(stats.perm).length + '/' + RL.PERM_SKILLS.length + '</b></div></div>' +
        '<div class="sel-card"><div class="nm" style="font-size:16px">战绩</div>' +
          '<div class="row" style="margin-top:10px"><span>征途次数</span><b>' + stats.runs + '</b></div>' +
          '<div class="row"><span>胜利节点</span><b>' + stats.wins + '</b></div>' +
          '<div class="row"><span>最佳征途</span><b>' + stats.bestRun + '</b></div></div>' +
        '<div class="sel-card"><div class="nm" style="font-size:16px">重置存档</div>' +
          '<div class="trait">清空碎片、皇冠、永久技能与解锁进度。</div>' +
          '<button class="buy" id="mReset" style="margin-top:10px;width:100%">重置</button></div>' +
      '</aside></div>';
    box.querySelectorAll('.buy[data-id]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        var p = RL.PERM_SKILLS.filter(function (x) { return x.id === id; })[0];
        if (!p || stats.perm[id] || stats.gold < p.cost) return;
        stats.gold -= p.cost;
        stats.perm[id] = 1;
        writeSave();
        toast('已解锁【' + p.n + '】');
        renderMeta();
      });
    });
    $('#mReset').addEventListener('click', function () {
      if (!confirm('确定重置全部进度？')) return;
      State.save = defaultSave();
      State.save.unlocked = { 'zimu': 1 };
      writeSave();
      renderMeta();
      renderTopbar();
    });
  }

  /* =====================================================================
   * 启动
   * =================================================================== */
  function boot() {
    /* 首次：默认选中字母 */
    if (!heroOf(State.sel)) State.sel = 'zimu';
    if (State.sel === State.opp) State.opp = 'xiashui';
    go('lobby');
    renderTopbar();
  }

  root.App = {
    go: go, State: State, boot: boot, toast: toast,
    startAIBattle: startAIBattle, renderBattle: renderBattle
  };
  document.addEventListener('DOMContentLoaded', boot);
})(typeof window !== 'undefined' ? window : globalThis);
