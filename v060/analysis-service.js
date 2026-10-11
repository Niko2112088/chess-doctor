/* Shared chess truth for Doctor, Detective and Master Lesson. White POV throughout. */
const Analysis = (() => {
  const sameMove=(a,b)=>!!a&&!!b&&a.from===b.from&&a.to===b.to&&(a.promotion||'')===(b.promotion||'');
  function legalMove(fen,uci) {
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci||''))return null;
    return new Chess(fen).move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
  }
  function replay(pgn) {
    const game=new Chess();
    if(!game.load_pgn(pgn,{sloppy:true})||!game.history().length)throw Error('Не удалось прочитать PGN');
    const board=new Chess(game.header().FEN),moves=[],positions=[board.fen()];
    for(const move of game.history()) {
      const played=board.move(move);if(!played)throw Error('Нелегальный ход в PGN');
      moves.push(played);positions.push(board.fen());
    }
    return {moves,positions};
  }
  const loss=(pre,post,color)=>(color==='w'?1:-1)*(pre.cp-post.cp);
  async function scan(service,positions,moves,{side=null,master=false,active=()=>true,progress=()=>{}}={}) {
    const check=()=>{if(!active())throw Error('Анализ прерван');};
    const evals=[],candidates=[];
    for(let i=0;i<positions.length;i++) {
      check();progress(`Быстрая проверка: позиция ${i+1} из ${positions.length}…`,i/positions.length*70);
      evals.push(await service.evaluate(positions[i]));check();
    }
    for(let i=0;i<moves.length;i++) {
      check();const move=moves[i];if(side&&move.color!==side)continue;
      let pre=evals[i],post=evals[i+1];
      if(pre.source!==post.source||(pre.source==='cloud'&&Math.abs(pre.depth-post.depth)>3)) {
        pre=await service.local(positions[i],9);check();post=await service.local(positions[i+1],9);check();
      }
      candidates.push({i,move,reply:moves[i+1]||null,preFen:positions[i],postFen:positions[i+1],before:pre.cp,after:post.cp,
        loss:loss(pre,post,move.color),bestmove:legalMove(positions[i],pre.bestmove),source:pre.source,depth:Math.min(pre.depth,post.depth)});
    }
    // Every displayed master moment is rechecked at equal depth, including cloud candidates.
    const suspects=candidates.filter(x=>master?(x.loss>=100||((x.move.captured||/[+#]/.test(x.move.san))&&x.loss<=55&&sameMove(x.move,x.bestmove))):x.source==='local'&&x.loss>=55)
      .sort((a,b)=>b.loss-a.loss).slice(0,master?12:5);
    for(let n=0;n<suspects.length;n++) {
      check();progress(`Уточняю важные моменты: ${n+1} из ${suspects.length}…`,70+n/suspects.length*29);
      const x=suspects[n],pre=await service.local(x.preFen,14);check();const post=await service.local(x.postFen,14);check();
      x.before=pre.cp;x.after=post.cp;x.loss=loss(pre,post,x.move.color);x.bestmove=legalMove(x.preFen,pre.bestmove);
      x.depth=Math.min(pre.depth,post.depth);x.source='local';x.confirmed=true;
    }
    const issues=candidates.filter(x=>x.loss>=75&&x.bestmove&&!sameMove(x.move,x.bestmove)).sort((a,b)=>b.loss-a.loss).slice(0,3);
    const moments=[];
    for(const x of suspects.sort((a,b)=>b.loss-a.loss)) {
      if(!x.bestmove||!x.confirmed)continue;
      if(x.loss>=120&&!sameMove(x.move,x.bestmove)) {
        const pre=x.before*(x.move.color==='w'?1:-1),post=x.after*(x.move.color==='w'?1:-1);
        x.label=pre>100&&post<0?'Поворот партии':x.loss>=250?'Ошибка':'Шанс был упущен';
      } else if(x.loss<=40&&sameMove(x.move,x.bestmove)&&(x.move.captured||/[+#]/.test(x.move.san)))x.label='Сильный ход';
      else continue;
      if(moments.some(m=>Math.abs(m.i-x.i)<3))continue;
      moments.push(x);if(moments.length===6)break;
    }
    return {evals,issues,moments:moments.sort((a,b)=>a.i-b.i)};
  }
  function verdict(exact,lossValue,masterLoss) {
    // Exact identity is feedback about identity, not proof of engine superiority.
    if(exact)return {kind:'exact',text:'✅ Ты нашёл ход гроссмейстера'};
    if(lossValue<=40)return {kind:'strong',text:'🟢 Другой сильный ход — один из сильнейших вариантов'};
    if(lossValue<=120)return {kind:'playable',text:'🟡 Можно играть, но есть сильнее'};
    return {kind:'weak',text:'❌ Этот ход заметно ухудшает позицию'};
  }
  async function compare(service,fen,masterMove,attempt,{active=()=>true}={}) {
    const check=()=>{if(!active())throw Error('Анализ прерван');};check();
    const game=new Chess(fen),actual=game.move(attempt);
    if(!actual)throw Error('Так ходить нельзя');
    const master=new Chess(fen);if(!master.move(masterMove))throw Error('Нелегальный ход в уроке');
    const pre=await service.local(fen,12);check();
    const masterEval=await service.local(master.fen(),12);check();
    const attemptEval=await service.local(game.fen(),12);check();
    const attemptLoss=loss(pre,attemptEval,actual.color),masterLoss=loss(pre,masterEval,actual.color);
    return {actual,fen:game.fen(),attemptLoss,masterLoss,bestmove:legalMove(fen,pre.bestmove),
      ...verdict(sameMove(actual,masterMove),attemptLoss,masterLoss)};
  }
  function plural(n,one='момент',few='момента',many='моментов') {
    return n+' '+(n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many);
  }
  return {sameMove,legalMove,replay,loss,scan,compare,verdict,plural};
})();
if(typeof module!=='undefined')module.exports=Analysis;
