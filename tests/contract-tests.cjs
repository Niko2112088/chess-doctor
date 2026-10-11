const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const app=path.resolve(__dirname,'../'+(process.env.APP_VERSION||'v050'));
const code=fs.readFileSync(path.join(app,'evaluation-service.js'),'utf8')+'\nthis.EvaluationService=EvaluationService';
(async()=>{
 let created=0;
 class FakeWorker {constructor(){created++;queueMicrotask(()=>this.onmessage({data:'uciok'}))}postMessage(s){if(s==='isready')queueMicrotask(()=>this.onmessage({data:'readyok'}));if(s.startsWith('go '))queueMicrotask(()=>{this.onmessage({data:'info depth 9 score cp 88 pv e7e5'});this.onmessage({data:'bestmove e7e5'})})}terminate(){}}
 let response={ok:true,status:200,json:async()=>({depth:22,pvs:[{cp:41,moves:'e2e4 e7e5'}]})};
 const c=vm.createContext({Worker:FakeWorker,fetch:async()=>response,AbortController,setTimeout,clearTimeout,queueMicrotask});vm.runInContext(code,c);
 const svc=new c.EvaluationService('unused');const start='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 assert.equal((await svc.evaluate(start)).source,'cloud');assert.equal(created,0,'cloud hit launched worker');
 svc.reset();response={ok:true,status:200,json:async()=>({depth:22,pvs:[{cp:41}]})};assert.equal((await svc.evaluate(start)).source,'local','incomplete cloud result');
 svc.reset();
 response={ok:false,status:404};const black='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';const local=await svc.evaluate(black);assert.equal(local.source,'local');assert.equal(local.cp,-88,'black POV normalization');assert.equal(local.bestmove,'e7e5');
 svc.reset();response={ok:true,status:200,json:async()=>({pvs:[{mate:-2,moves:'e2e4'}]})};assert.equal((await svc.cloud(start)).cp,-100000,'mate normalization');
 svc.reset();let calls=0;c.fetch=async()=>{calls++;throw Error('offline')};await svc.cloud(start);await svc.cloud(black);assert.equal(calls,1,'repeat network timeout');
 svc.cancel();
 const broken=vm.createContext({Worker:class{constructor(){throw Error('blocked')}},fetch:async()=>({status:404,ok:false}),AbortController,setTimeout,clearTimeout});vm.runInContext(code,broken);
 await assert.rejects(new broken.EvaluationService('unused').evaluate(start),/Локальный анализ недоступен/);
 console.log('cloud hit, miss, black sign, mate, network, worker error: pass');
})().catch(e=>{console.error(e);process.exitCode=1});
