const assert=require('assert'),fs=require('fs'),crypto=require('crypto');
const version=process.env.APP_VERSION||'v061';
const {Chess}=require('../'+version+'/vendor/chess.js');const Analysis=require('../'+version+'/analysis-service.js');global.Chess=Chess;
const games=require('../'+version+'/data/grandmaster-games.json'),ids=new Set();
assert(games.length>=24,'24 games required');
for(const g of games){
 assert(/^[a-z0-9-]+$/.test(g.id),g.id);assert(!ids.has(g.id),'duplicate '+g.id);ids.add(g.id);
 for(const key of ['white','black','event','result','pgn','source'])assert(g[key],g.id+' '+key);
 assert(Number.isInteger(g.year));assert(g.tags.length>=1&&g.tags.length<=3);assert(['1-0','0-1','1/2-1/2'].includes(g.result));
 assert(!/[{};$]|\[Annotator|\[Opening|\[%/.test(g.pgn),'embedded commentary');
 const parsed=new Chess();assert(parsed.load_pgn(g.pgn));assert.equal(parsed.header().White,g.white);assert.equal(parsed.header().Black,g.black);assert.equal(parsed.header().Result,g.result);
 const {positions,moves}=Analysis.replay(g.pgn);assert.equal(positions.at(-1),parsed.fen());assert.equal(moves.length,g.provenance.verification.plies);
 const digest=crypto.createHash('sha256').update(moves.map(m=>m.from+m.to+(m.promotion||'')).join(' ')).digest('hex');assert.equal(digest,g.provenance.verification.moveSha256);
 assert(/^\d{4}-\d{2}-\d{2}$/.test(g.provenance.accessDate));assert(g.provenance.sources.length>=2);
 for(const s of g.provenance.sources){assert(new URL(s.url));assert(s.note.length>20);}
 assert(!/[!?]|\([^)]*\)/.test(g.pgn.split('\n\n').at(-1)),'annotation glyphs');
}
for(const player of ['Морфи','Капабланка','Алехин','Ботвинник','Таль','Фишер','Карпов','Каспаров','Ананд','Крамник','Полгар','Карлсен'])assert(games.some(g=>(g.white+' '+g.black).includes(player)),player);
assert.equal(Analysis.plural(1),'1 момент');assert.equal(Analysis.plural(2),'2 момента');assert.equal(Analysis.plural(5),'5 моментов');assert.equal(Analysis.plural(11),'11 моментов');assert.equal(Analysis.plural(21),'21 момент');assert.equal(Analysis.plural(24),'24 момента');
console.log(games.length+' games: unique ids, factual metadata, comment-free PGN, complete legal replay, source manifests and checksums PASS');
