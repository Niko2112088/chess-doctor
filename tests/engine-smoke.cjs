const fs = require('fs');
const vm = require('vm');
const path = require('path');
const {spawn} = require('child_process');
const app = path.resolve(__dirname, '../'+(process.env.APP_VERSION||'v050'));

class EngineWorker {
  constructor(workerPath) {
    this.child = spawn(process.execPath, [path.resolve(__dirname,"stockfish-runner.cjs"),workerPath], {stdio:['pipe','pipe','pipe']});
    this.buffer='';
    this.child.stdout.on('data', chunk => {
      this.buffer+=chunk.toString();
      let i;
      while ((i=this.buffer.indexOf('\n'))>=0) {
        const line=this.buffer.slice(0,i).trim(); this.buffer=this.buffer.slice(i+1);
        if (line && this.onmessage) this.onmessage({data:line});
      }
    });
    this.child.on('error', e => this.onerror?.(e));
    this.child.on('exit', code => {if(code && this.onerror)this.onerror(new Error('exit '+code))});
  }
  postMessage(s) {this.child.stdin.write(s+'\n')}
  terminate() {this.child.kill('SIGTERM')}
}
const source=fs.readFileSync(path.join(app,'evaluation-service.js'),'utf8');
const ctx=vm.createContext({Worker:EngineWorker,fetch:async()=>({ok:false,status:404}),AbortController,setTimeout,clearTimeout});
vm.runInContext(source+'\nthis.EvaluationService=EvaluationService',ctx);

(async()=>{
  const svc=new ctx.EvaluationService(path.join(app,'vendor/stockfish-19-lite-single.js'));
  for (const fen of [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
    '4k3/8/8/8/8/8/8/4K2Q w - - 0 1',
    '4k3/8/8/8/8/8/8/4K2Q b - - 0 1']) {
    console.log(fen, await svc.evaluate(fen));
  }
  svc.cancel();
})().catch(e=>{console.error(e);process.exitCode=1});
