const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/chess-doctor/')){res.writeHead(404);res.end();return;}
 let file=path.resolve(root,decodeURIComponent(url.pathname.slice('/chess-doctor/'.length)));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(url.pathname.endsWith('/'))file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.wasm')?'application/wasm':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html; charset=utf-8');res.end(data)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],assets=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/v060/'))assets.push({url:r.url(),status:r.status()});});
 await page.route('https://lichess.org/**',route=>route.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}/chess-doctor/v060/`);
 await page.locator('#masters').click();await page.locator('.libraryCard').first().waitFor();assert.equal(await page.locator('.libraryCard').count(),25);
 await page.locator('#playerFilter').selectOption({label:'Михаил Таль'});assert((await page.locator('.libraryCard').count())>=2);
 await page.locator('#playerFilter').selectOption('');await page.locator('#eraFilter').selectOption('modern');assert((await page.locator('.libraryCard').count())>0);await page.locator('#eraFilter').selectOption('');
 await page.locator('.libraryCard').filter({hasText:'Пол Морфи'}).click();assert.equal(await page.locator('#masterBoard .sq').count(),64);
 assert.equal(await page.locator('#masterBoard .coordFile').count(),8);assert.equal(await page.locator('#masterBoard .coordRank').count(),8);
 await page.locator('#masterNext').click();assert((await page.locator('#masterCard').textContent()).includes('пешкой'));
 await page.locator('#masterPrev').click();await page.locator('#masterAnalyze').click();await page.locator('#masterStop').click();assert((await page.locator('#masterStatus').textContent()).includes('остановлен'));
 await page.locator('#masterAnalyze').click();await page.waitForFunction(()=>!masterState.busy&&masterState.moments.length>0,{},{timeout:120000});
 const moment=await page.evaluate(()=>masterState.moments.find(m=>m.label==='Сильный ход')||masterState.moments[0]);
 await page.locator(`[data-moment="${moment.i}"]`).click();await page.locator('#guessMaster').click();
 assert(!(await page.locator('#masterCard').textContent()).includes(moment.move.san));
 const fen=await page.evaluate(()=>masterState.guess.game.fen());
 await page.locator(`#masterBoard [data-sq="${moment.move.from}"]`).click();
 // An illegal destination cannot change the teaching position.
 const illegal=await page.evaluate(()=>{const r=masterState.guess;return [...'abcdefgh'].flatMap(f=>[1,2,3,4,5,6,7,8].map(n=>f+n)).find(s=>!r.targets.includes(s)&&s!==r.from);});
 await page.locator(`#masterBoard [data-sq="${illegal}"]`).click();assert.equal(await page.evaluate(()=>masterState.guess.game.fen()),fen);
 await page.locator(`#masterBoard [data-sq="${moment.move.from}"]`).click();await page.locator(`#masterBoard [data-sq="${moment.move.to}"]`).click();
 if(moment.move.promotion)await page.locator('#promotionChoice button').first().click();
 await page.locator('#guessAgain').waitFor({timeout:60000});assert((await page.locator('#masterCard').textContent()).includes('Ты нашёл ход гроссмейстера'));
 assert(!(await page.locator('#masterCard').textContent()).includes('Гроссмейстер сыграл:'));
 assert(!(await page.locator('#masterCard').textContent()).includes('Можно было'));
 await page.locator('#guessAgain').click();await page.locator('#showMaster').click();assert((await page.locator('#masterStatus').textContent()).includes('раскрыт'));
 await page.locator('#masterFlip').click();assert.equal(await page.locator('#masterBoard .sq').first().getAttribute('data-sq'),'h1');
 await page.locator('#myGame').click();await page.locator('#sideB').click();await page.locator('#analyze').click();await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{},{timeout:60000});
 assert(!(await page.locator('#status').textContent()).includes('не завершён'));assert.equal(await page.locator('#board .sq').first().getAttribute('data-sq'),'h1');
 await page.locator('#modeDetective').click();await page.locator('#sideW').click();assert.equal(await page.locator('#board .sq').count(),0);
 await page.locator('#pgn').fill('bad PGN');await page.locator('#analyze').click();assert((await page.locator('#status').textContent()).includes('Не удалось прочитать'));
 await page.locator('#sample').click();await page.locator('#analyze').click();await page.waitForFunction(()=>!document.querySelector('#analyze').disabled,{},{timeout:60000});
 await page.locator('#pgn').fill('1. d4 d5 2. c4 e6');assert.equal(await page.locator('#board .sq').count(),0);
 await page.locator('#masters').click();await page.locator('.libraryCard').first().waitFor();
 await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile library overflow');
 await page.locator('.libraryCard').first().click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile lesson overflow');
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/mobile-lesson.png'),fullPage:true});
 // Navigating out of an in-flight local search must never paint stale results.
 await page.locator('#masterAnalyze').click();await page.locator('#myGame').click();await page.waitForTimeout(500);assert(await page.locator('#masterFlow').isHidden());
 assert(assets.some(a=>a.url.endsWith('.wasm')&&a.status===200),'WASM not fetched under Pages prefix');assert(assets.every(a=>a.status===200),'failed static asset');assert.deepEqual(errors,[]);
 console.log('Real Chromium desktop + 375px mobile: Pages-prefixed JS/JSON/Worker/WASM, library filters, replay, full local master analysis, stop/restart, legal exact guess, hidden notation, orientation, My Game/Detective replacement and no stale updates PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
