global.window = {};
require('./cards.js');
require('./engine.js');
const C = window.CARDS, E = window.ENG;

let wins = [0, 0], draws = 0, maxTurns = 0, errors = [];
const N = 100;
for (let i = 0; i < N; i++) {
  try {
    const b = E.newBattle(C.shuishui, C.qixing);
    let guard = 0;
    while (!b.over && guard++ < 80) {
      const p = E.cur(b);
      // 尽量打出能打出的牌
      let played = true;
      while (played && !b.over) {
        played = false;
        for (let j = 0; j < p.hand.length; j++) {
          const c = p.hand[j];
          if (E.canPlay(b, p, c).ok && !E.needsTarget(c)) {
            if (E.playCard(b, j)) { played = true; break; }
          }
        }
      }
      // 有目标的牌：找第一个
      for (let j = 0; j < p.hand.length; j++) {
        const c = p.hand[j];
        if (E.canPlay(b, p, c).ok && E.needsTarget(c)) {
          const tgt = E.opp(b).board.length ? {kind:'unit', id: E.opp(b).board[0].uid} : (p.board.length ? {kind:'unit', id: p.board[0].uid} : null);
          if (tgt && E.playCard(b, j, tgt)) break;
        }
      }
      // 攻击
      for (const u of p.board.slice()) {
        if (!E.opp(b).board.length) break;
        const taunt = E.opp(b).board.filter(t => t.kw.indexOf('taunt') >= 0);
        const t = (taunt.length ? taunt[0] : E.opp(b).board[0]);
        E.attack(b, u.uid, {kind:'unit', id: t.uid});
      }
      // 攻击英雄
      if (!E.opp(b).board.length) {
        for (const u of p.board.slice()) {
          E.attack(b, u.uid, {kind:'hero'});
        }
      }
      if (!b.over) E.endTurn(b);
      maxTurns = Math.max(maxTurns, b.t);
    }
    if (b.over === '0') wins[0]++; else if (b.over === '1') wins[1]++; else draws++;
  } catch (err) {
    errors.push(String(err));
  }
}
console.log(`模拟 ${N} 局`);
console.log(`下水胜 ${wins[0]}  七星胜 ${wins[1]}  超时 ${draws}`);
console.log(`最长回合 ${maxTurns}`);
console.log(`异常 ${errors.length}`, errors.slice(0, 5));
