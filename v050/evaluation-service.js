/* Chess Doctor evaluation adapter. Lichess scores and UCI scores are normalized to White's POV. */
class EvaluationService {
  constructor(enginePath) {
    this.enginePath = enginePath;
    this.worker = null;
    this.ready = null;
    this.readyResolve = null;
    this.readyReject = null;
    this.readyTimer = null;
    this.job = null;
    this.localCache = new Map();
    this.cloudCache = new Map();
    this.cloudBlocked = false;
  }
  cancel() {
    clearTimeout(this.readyTimer); this.readyTimer = null;
    if (this.job) {
      clearTimeout(this.job.timer);
      this.job.reject(new Error('Анализ прерван'));
      this.job = null;
    }
    if (this.readyReject) this.readyReject(new Error('Анализ прерван'));
    if (this.worker) this.worker.terminate();
    this.worker = this.ready = this.readyResolve = this.readyReject = null;
  }
  reset() {
    this.cancel();
    this.localCache.clear();
    this.cloudCache.clear();
    this.cloudBlocked = false;
  }
  async cloud(fen) {
    if (this.cloudCache.has(fen)) return this.cloudCache.get(fen);
    if (this.cloudBlocked) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const url = 'https://lichess.org/api/cloud-eval?multiPv=1&variant=standard&fen=' + encodeURIComponent(fen);
      const response = await fetch(url, {headers:{Accept:'application/json'}, signal:controller.signal});
      if (response.status === 429) this.cloudBlocked = true;
      if (!response.ok) return null;
      const data = await response.json(), pv = data.pvs && data.pvs[0];
      if (!pv || !/^[a-h][1-8][a-h][1-8][qrbn]?/.test(pv.moves||'')) return null;
      const cp = Number.isFinite(pv.cp) ? pv.cp :
        Number.isFinite(pv.mate) ? Math.sign(pv.mate) * 100000 : null;
      if (cp === null) return null;
      const result = {cp, source:'cloud', bestmove:(pv.moves||'').split(' ')[0]||null, depth:data.depth||0};
      this.cloudCache.set(fen, result);
      return result;
    } catch (_) { this.cloudBlocked = true; return null; }
    finally { clearTimeout(timeout); }
  }
  async ensureEngine() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve; this.readyReject = reject;
      try {
        this.worker = new Worker(this.enginePath);
        this.readyTimer = setTimeout(() => this.fail(new Error('Локальный анализ не запустился')), 20000);
        this.worker.onmessage = event => {
          for (const line of String(event.data).split(/\r?\n/)) {
            if (line === 'uciok') {
              this.worker.postMessage('setoption name Hash value 16');
              this.worker.postMessage('isready');
            } else if (line === 'readyok' && this.readyResolve) {
              clearTimeout(this.readyTimer); this.readyTimer = null;
              this.readyResolve();
              this.readyResolve = this.readyReject = null;
            } else this.handleLine(line);
          }
        };
        this.worker.onerror = () => this.fail(new Error('Локальный анализ недоступен'));
        this.worker.postMessage('uci');
      } catch (_) { this.fail(new Error('Локальный анализ недоступен')); }
    });
    return this.ready;
  }
  fail(error) {
    clearTimeout(this.readyTimer); this.readyTimer = null;
    if (this.job) {
      clearTimeout(this.job.timer);
      this.job.reject(error); this.job = null;
    }
    if (this.readyReject) this.readyReject(error);
    if (this.worker) this.worker.terminate();
    this.worker = this.ready = this.readyResolve = this.readyReject = null;
  }
  handleLine(line) {
    const job = this.job;
    if (!job) return;
    if (line.startsWith('info ') && /\bscore (cp|mate) -?\d+/.test(line)) {
      const depth = Number(line.match(/\bdepth (\d+)/)?.[1]||0);
      if (depth >= (job.result?.depth||0)) {
        const score = line.match(/\bscore (cp|mate) (-?\d+)/);
        const pov = job.fen.split(' ')[1] === 'w' ? 1 : -1;
        job.result = {
          cp: pov * (score[1] === 'mate' ? Math.sign(Number(score[2])) * 100000 : Number(score[2])),
          source:'local', depth, bestmove:line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1]||null
        };
      }
    } else if (line.startsWith('bestmove ')) {
      clearTimeout(job.timer); this.job = null;
      const best = line.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1];
      if (!job.result) { job.reject(new Error('Нет оценки позиции')); return; }
      job.result.bestmove = best || job.result.bestmove;
      this.localCache.set(job.key, job.result);
      job.resolve(job.result);
    }
  }
  async local(fen, depth=9) {
    const key = depth + '|' + fen;
    if (this.localCache.has(key)) return this.localCache.get(key);
    await this.ensureEngine();
    if (this.job) throw new Error('Анализ уже выполняется');
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => this.fail(new Error('Локальный анализ превысил время ожидания')), depth > 9 ? 15000 : 8000);
      this.job = {fen,key,result:null,timer,resolve,reject};
      this.worker.postMessage('position fen ' + fen);
      this.worker.postMessage('go depth ' + depth);
    });
  }
  async evaluate(fen) {
    return await this.cloud(fen) || await this.local(fen, 9);
  }
}
