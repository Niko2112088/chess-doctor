const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),{spawn}=require('child_process');
const app=path.resolve(__dirname,'../'+(process.env.APP_VERSION||'v050'));
const Chess=require(path.join(app,'vendor/chess.js')).Chess;

class EngineWorker {
  constructor(workerPath){
    this.child=spawn(process.execPath,[path.resolve(__dirname,"stockfish-runner.cjs"),path.resolve(app,workerPath)]);
    let buffer='';
    this.child.stdout.on('data',chunk=>{
      buffer+=chunk;
      let i;
      while((i=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,i).trim();
        buffer=buffer.slice(i+1);
        if(line)this.onmessage?.({data:line});
      }
    });
    this.child.on('error',e=>this.onerror?.(e));
    this.child.on('exit',code=>{if(code)this.onerror?.(new Error('exit '+code))});
  }
  postMessage(s){this.child.stdin.write(s+'\n')}
  terminate(){this.child.kill()}
}

class Element {
  constructor(){
    this.innerHTML='';this.value='';this.style={};this.dataset={};this.hidden=false;
    this.disabled=false;this.textContent='';this.className='';
    this.classList={contains:()=>false,add:()=>{},remove:()=>{},toggle:()=>{}};
  }
  appendChild(){} setAttribute(){} addEventListener(){} scrollIntoView(){} insertAdjacentHTML(){} blur(){}
}

const elements=new Map();
function el(sel){if(!elements.has(sel))elements.set(sel,new Element());return elements.get(sel)}

const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
const sample=html.match(/<textarea id="pgn">([\s\S]*?)<\/textarea>/)[1];
el('#pgn').value=sample;
el('#startMove').value='1';

const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
let cloudMode='miss';
const ctx=vm.createContext({
  Chess,
  Worker:EngineWorker,
  document:{getElementById:id=>el('#'+id),querySelector:el,createElement:()=>new Element()},
  fetch:async url=> cloudMode==='network'
    ? Promise.reject(new Error('offline'))
    : cloudMode==='hit'
      ? {ok:true,status:200,json:async()=>{const fen=new URL(url).searchParams.get('fen'),m=new Chess(fen).moves({verbose:true})[0];return {depth:20,pvs:[{cp:0,moves:m?m.from+m.to+(m.promotion||''):''}]};}}
      : {ok:false,status:404},
  URL,AbortController,setTimeout,clearTimeout,console
});

vm.runInContext(fs.readFileSync(path.join(app,'evaluation-service.js'),'utf8')+'\n'+(fs.existsSync(path.join(app,'analysis-service.js'))?fs.readFileSync(path.join(app,'analysis-service.js'),'utf8')+'\n':'')+script,ctx,{filename:'app.js'});

function makePgn(name,fen,moves){
  const g=fen?new Chess(fen):new Chess();
  for(const m of moves){
    const x=g.move(m,{sloppy:true});
    if(!x)throw Error(`${name}: invalid ${m} at ${g.fen()}`);
  }
  return (fen
    ? `[Event "${name}"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n`
    : `[Event "${name}"]\n\n`) + g.pgn();
}

const suite=[
 ['sample',null,['e4','e5','Nf3','Nc6','Bc4','Nd4','Nxe5','Qg5','Bxf7+','Ke7','O-O','Qxe5','Bxg8','Rxg8','c3','Ne6','d4','Qxe4'],'w'],
 ['fresh queen blunder',null,['e4','e5','Qh5','Nc6','Bc4','Nf6','Qxf7#'],'b'],
 ['fools mate',null,['f3','e5','g4','Qh4#'],'w'],
 ['quiet opening',null,['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6'],'w'],
 ['queen exposed',null,['e4','d5','exd5','Qxd5','Nc3','Qe5+','Be2','Bg4','d4','Bxe2','Ngxe2'],'b'],
 ['rook drop','4k3/8/8/8/8/8/4r3/R3K3 w Q - 0 1',['Kd1','Re1+','Kc2','Rxa1'],'w'],
 ['defender removal','6k1/1b6/8/8/4P3/8/8/4R1K1 w - - 0 1',['Ra1','Bxe4'],'w'],
 ['check response','4k3/8/8/8/8/8/4r3/4K1R1 w - - 0 1',['Kd1','Re1+'],'w'],
 ['black rook error','4k2r/8/8/8/8/8/8/4K2R b Kk - 0 1',['Rh7','Rxh7'],'b'],
 ['mate threat',null,['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#'],'b'],
 ['medium 24 ply',null,['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','b6','cxd5','Nxd5','Bxe7','Qxe7','Nxd5','exd5','Rc1','Be6','Qa4','c5'],'w']
];

(async()=>{
  const report=[];
  let foundLocal=false;

  for(const [name,fen,moves,side] of suite){
    cloudMode='miss';
    el('#pgn').value=makePgn(name,fen,moves);
    el('#startMove').value='1';
    vm.runInContext(`setSide('${side}')`,ctx);

    const begin=Date.now();
    await vm.runInContext('analyzeGame()',ctx);
    const result=vm.runInContext('({issues:state.issues,evals:state.evals,moves:state.moves,positions:state.positions,userColor:state.userColor})',ctx);
    const status=el('#status').textContent;

    assert(!status.startsWith('Анализ не завершён'),name+': '+status);
    assert(result.evals.length===result.positions.length,name+' incomplete');
    assert(result.evals.every(e=>e.source==='local'),name+' source');
    foundLocal=true;

    for(const issue of result.issues){
      assert(issue.move.color===side);
      const g=new Chess(issue.preFen);
      assert(g.move({from:issue.bestmove.from,to:issue.bestmove.to,promotion:issue.bestmove.promotion}),name+' illegal best');
    }

    report.push({
      name,
      moves:result.moves.length,
      issues:result.issues.length,
      ms:Date.now()-begin,
      top:result.issues[0]?.move.san||'-',
      status
    });
    console.log(report.at(-1));

    if(result.issues.length){
      vm.runInContext('setMode("detective"); state.detective.cursor=state.issues[0].i; detectiveGuess()',ctx);
      assert(vm.runInContext('state.detective.guess.issueIndex',ctx)===0);

      vm.runInContext('openDoctorFromDetective(); startRetry(state.issues[0])',ctx);
      assert(vm.runInContext('state.retry.game.fen()===state.issues[0].preFen',ctx));

      if(name==='sample'){
        await vm.runInContext('retryClick(state.issues[0].move.from)',ctx);
        await vm.runInContext('retryClick(state.issues[0].move.to)',ctx);
        assert(el('#card').innerHTML.includes('Ты повторил исходный ход'),'retry original');

        vm.runInContext('startRetry(state.issues[0])',ctx);
        await vm.runInContext('retryClick(state.issues[0].bestmove.from)',ctx);
        await vm.runInContext('retryClick(state.issues[0].bestmove.to)',ctx);
        assert(el('#card').innerHTML.includes('Отлично'),'retry best');

        vm.runInContext('startRetry(state.issues[0])',ctx);
        const alternative=vm.runInContext('state.retry.game.moves({verbose:true}).find(m=>m.from+m.to!==state.issues[0].move.from+state.issues[0].move.to&&m.from+m.to!==state.issues[0].bestmove.from+state.issues[0].bestmove.to)',ctx);
        await vm.runInContext(`retryClick('${alternative.from}')`,ctx);
        await vm.runInContext(`retryClick('${alternative.to}')`,ctx);
        assert(el('#card').innerHTML.includes('Твой новый ход'),'retry alternative');
      }

      if(result.issues.length>1){
        vm.runInContext('setMode("detective");state.detective.cursor=state.issues[1].i;detectiveGuess()',ctx);
        assert(vm.runInContext('state.detective.guess.issueIndex',ctx)===1);
        vm.runInContext('continueDetective();retryDetective()',ctx);
        assert(vm.runInContext('state.detective.guess===null',ctx));
      }
    }
  }

  assert(foundLocal);

  cloudMode='hit';
  vm.runInContext('evaluationService.reset()',ctx);
  el('#pgn').value=makePgn('cloud hit',null,['e4','e5','Nf3','Nc6'],'w');
  await vm.runInContext('analyzeGame()',ctx);
  assert(vm.runInContext('state.evals.every(x=>x.source==="cloud")',ctx));
  assert(vm.runInContext('state.issues.length===0',ctx),'cloud forced mistakes');
  console.log('app cloud hit: pass');

  vm.runInContext("setSide('b')",ctx);
  assert(vm.runInContext('state.evals.length===0&&state.retry===null',ctx));
  vm.runInContext("setSide('w')",ctx);
  vm.runInContext("startRetry({preFen:'4k3/8/8/8/8/8/4r3/4K1R1 w - - 0 1'})",ctx);
  assert(vm.runInContext('state.retry.inCheck&&!state.retry.legalFrom.includes("g1")',ctx),'illegal check responders highlighted');
  vm.runInContext('clearAnalysisState()',ctx);

  cloudMode='network';
  vm.runInContext('evaluationService.reset()',ctx);
  el('#pgn').value=makePgn('network failure',null,['e4','e5','Nf3','Nc6','Bc4','Nd4','Nxe5','Qg5'],'w');
  await vm.runInContext('analyzeGame()',ctx);
  assert(vm.runInContext('state.evals.every(x=>x.source==="local")',ctx));
  console.log('network failure: local fallback pass');

  el('#pgn').value='bad PGN';
  await vm.runInContext('analyzeGame()',ctx);
  assert(el('#status').textContent.includes('Не удалось прочитать'));
  console.log('bad PGN: pass');

  console.log(JSON.stringify(report,null,2));
  vm.runInContext('evaluationService.cancel()',ctx);
})().catch(e=>{
  console.error(e);
  vm.runInContext('evaluationService.cancel()',ctx);
  process.exitCode=1;
});
