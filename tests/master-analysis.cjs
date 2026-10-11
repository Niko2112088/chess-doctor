const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),{spawn}=require('child_process');
const {Chess}=require('../v060/vendor/chess.js');global.Chess=Chess;const Analysis=require('../v060/analysis-service.js');
class Worker{
 constructor(file){this.child=spawn(process.execPath,[path.resolve(__dirname,'stockfish-runner.cjs'),path.resolve(__dirname,'../v060',file)]);let buffer='';this.child.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);if(line)this.onmessage?.({data:line});}});this.child.on('error',e=>this.onerror?.(e));this.child.stderr.on('data',b=>process.stderr.write(b));}
 postMessage(s){this.child.stdin.write(s+'\n')}terminate(){this.child.kill()}
}
const ctx=vm.createContext({Chess,Worker,fetch:async()=>({ok:false,status:404}),AbortController,setTimeout,clearTimeout,console});
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../v060/evaluation-service.js'),'utf8')+'\nthis.Service=EvaluationService;',ctx);
(async()=>{
 const real=new ctx.Service('vendor/stockfish-19-lite-single.js');
 try{
 const fixtures=[['white win','1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0'],['black win','1. f3 e5 2. g4 Qh4# 0-1'],['draw / quiet / no huge blunder','1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1/2-1/2']];
 for(const [name,pgn] of fixtures){const {positions,moves}=Analysis.replay(pgn),result=await Analysis.scan(real,positions,moves,{master:true});assert.equal(result.evals.length,positions.length);for(const m of result.moments){assert(m.confirmed&&m.depth>=14);assert(Analysis.legalMove(m.preFen,m.bestmove.from+m.bestmove.to+(m.bestmove.promotion||'')));}if(name.startsWith('draw'))assert(!result.moments.some(m=>m.label==='Ошибка'));console.log(name,result.moments.map(m=>m.label));}
 // Controlled equal-budget fixtures prove thresholds, no forced count and black POV without engine variance.
 const quiet=Analysis.replay('1. d4 d5 2. Nf3 Nf6 1/2-1/2');let localCalls=0;
 const calm={evaluate:async fen=>({cp:20,source:'cloud',depth:20,bestmove:new Chess(fen).moves({verbose:true})[0].from+new Chess(fen).moves({verbose:true})[0].to}),local:async()=>{localCalls++;throw Error('quiet should not need deep search')}};
 assert.equal((await Analysis.scan(calm,quiet.positions,quiet.moves,{master:true})).moments.length,0);assert.equal(localCalls,0);
 assert.equal(Analysis.loss({cp:-10},{cp:160},'b'),170);assert.equal(Analysis.loss({cp:160},{cp:-10},'w'),170);
 assert.equal(Analysis.legalMove(quiet.positions[0],'e2e5'),null);
 const checkFen='4k3/8/8/8/8/8/4r3/4K1R1 w - - 0 1';assert.equal(Analysis.legalMove(checkFen,'g1g2'),null);
 assert(real.terminal('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3').cp===-100000);
 assert(real.terminal('4k3/8/8/8/8/8/8/4K3 w - - 0 1').cp===0);
 // Actual attempted move is replayed, compared, and returned; all comparisons use depth 12.
 const fen=new Chess().fen(),master=new Chess().move('e4'),attempt={from:'d2',to:'d4'};let scores=[50,45,40],depths=[];
 const fake={local:async(f,d)=>{depths.push(d);return{cp:scores.shift(),bestmove:'e2e4'}}};
 const good=await Analysis.compare(fake,fen,master,attempt);assert.equal(good.kind,'strong');assert.equal(good.actual.san,'d4');assert.deepEqual(depths,[12,12,12]);
 const exact=await Analysis.compare({local:async()=>({cp:20,bestmove:'d2d4'})},fen,master,{from:'e2',to:'e4'});assert.equal(exact.kind,'exact');assert.equal(exact.actual.san,'e4');
 scores=[50,45,-250];const weak=await Analysis.compare({local:async()=>({cp:scores.shift(),bestmove:'e2e4'})},fen,master,attempt);assert.equal(weak.kind,'weak');assert.equal(weak.actual.san,'d4');
 assert.equal(Analysis.verdict(false,80,0).kind,'playable');assert.equal(Analysis.verdict(false,500,600).kind,'weak');
 await assert.rejects(Analysis.compare(real,fen,master,{from:'e2',to:'e5'}),/Так ходить нельзя/);
 // Cancellation during cloud IO must not resurrect a worker. Shared cache survives cancel.
 let resolveCloud;const cancelled=new ctx.Service('vendor/stockfish-19-lite-single.js');const oldFetch=ctx.fetch;
 ctx.fetch=()=>new Promise(resolve=>{resolveCloud=resolve});const pending=cancelled.evaluate(fen);cancelled.cancel();resolveCloud({ok:false,status:404});await assert.rejects(pending,/прерван/);assert.equal(cancelled.worker,null);ctx.fetch=oldFetch;
 const cached=await real.local(fen,12);real.cancel();assert.equal(await real.local(fen,12),cached,'session cache lost');
 let active=true;await assert.rejects(Analysis.scan({evaluate:async()=>{active=false;return {cp:0}}},quiet.positions,quiet.moves,{master:true,active:()=>active}),/прерван/);
 // Real full famous game, not just a move snippet, validates two-pass and terminal mate handling.
 const opera=require('../v060/data/grandmaster-games.json').find(g=>g.white.includes('Морфи'));const replay=Analysis.replay(opera.pgn);const result=await Analysis.scan(real,replay.positions,replay.moves,{master:true});assert(result.moments.length>0);assert.equal(result.evals.at(-1).cp,100000);assert(result.moments.every(m=>m.bestmove&&m.confirmed));console.log('Opera game',replay.moves.length,'plies',result.moments.length,'confirmed moments');
 console.log('master analysis, mate / POV, quiet, legal recommendations, exact/strong/playable/weak guesses, actual move, cache and cancellation PASS');
 }finally{real.cancel()}
})().catch(e=>{console.error(e);process.exitCode=1});
