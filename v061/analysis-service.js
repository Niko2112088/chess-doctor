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
  const pieceValue={p:1,n:3,b:3,r:5,q:9,k:99};
  function immediateRecapture(moves,i) {
    const prev=moves[i-1],move=moves[i];
    return !!(prev&&prev.captured&&move&&move.captured&&prev.to===move.to);
  }
  function teachingStrong(x,moves) {
    if(!x.bestmove||!sameMove(x.move,x.bestmove)||x.loss>35)return false;
    const move=x.move;
    if(move.promotion||/[+#]/.test(move.san)||/[kq]/.test(move.flags||''))return true;
    if(move.captured&&pieceValue[move.captured]>pieceValue[move.piece]&&!immediateRecapture(moves,x.i))return true;
    return false;
  }
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
    const suspects=candidates.filter(x=>master?(x.loss>=100||teachingStrong(x,moves)):x.source==='local'&&x.loss>=55)
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
      } else if(teachingStrong(x,moves))x.label='Сильный ход';
      else continue;
      if(moments.some(m=>Math.abs(m.i-x.i)<3))continue;
      moments.push(x);if(moments.length===6)break;
    }
    return {evals,issues,moments:moments.sort((a,b)=>a.i-b.i)};
  }
  function verdict(exactTarget,lossValue,targetLoss,repeatedHistorical=false,lessonType='strong') {
    if(exactTarget)return lessonType==='improve'
      ? {kind:'exact',text:'✅ Ты нашёл более сильный вариант'}
      : {kind:'exact',text:'✅ Ты нашёл сильный ход'};
    if(repeatedHistorical&&lessonType==='improve')return {kind:'repeat',text:'🔁 Ты повторил ход из партии'};
    if(lossValue<=40)return {kind:'strong',text:'🟢 Другой сильный ход — один из сильнейших вариантов'};
    if(lossValue<=120)return {kind:'playable',text:'🟡 Можно играть, но есть сильнее'};
    return {kind:'weak',text:'❌ Этот ход заметно ухудшает позицию'};
  }
  async function compare(service,fen,historicalMove,attempt,{targetMove=historicalMove,referenceBestmove=null,depth=14,lessonType='strong',active=()=>true}={}) {
    const check=()=>{if(!active())throw Error('Анализ прерван');};check();
    const game=new Chess(fen),actual=game.move(attempt);
    if(!actual)throw Error('Так ходить нельзя');
    const historical=new Chess(fen),played=historical.move(historicalMove);
    if(!played)throw Error('Нелегальный исторический ход в уроке');
    const target=new Chess(fen),targetPlayed=target.move(targetMove);
    if(!targetPlayed)throw Error('Нелегальный целевой ход в уроке');
    const pre=await service.local(fen,depth);check();
    const historicalEval=await service.local(historical.fen(),depth);check();
    const targetEval=sameMove(targetPlayed,played)?historicalEval:await service.local(target.fen(),depth);check();
    const attemptEval=sameMove(actual,targetPlayed)?targetEval:sameMove(actual,played)?historicalEval:await service.local(game.fen(),depth);check();
    const attemptLoss=loss(pre,attemptEval,actual.color),historicalLoss=loss(pre,historicalEval,actual.color),targetLoss=loss(pre,targetEval,actual.color);
    const checkedReference=referenceBestmove&&new Chess(fen).move(referenceBestmove)?referenceBestmove:null;
    const bestmove=checkedReference||legalMove(fen,pre.bestmove);
    const repeatedHistorical=sameMove(actual,played)&&!sameMove(played,targetPlayed);
    return {actual,fen:game.fen(),attemptLoss,historicalLoss,targetLoss,bestmove,targetMove:targetPlayed,historicalMove:played,
      ...verdict(sameMove(actual,targetPlayed),attemptLoss,targetLoss,repeatedHistorical,lessonType)};
  }
  function plural(n,one='момент',few='момента',many='моментов') {
    return n+' '+(n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many);
  }
  return {sameMove,legalMove,replay,loss,scan,compare,verdict,plural};
})();
if(typeof module!=='undefined')module.exports=Analysis;
