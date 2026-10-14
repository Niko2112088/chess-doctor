/* UI adapter: uses the same EvaluationService, Analysis and board renderer as My Game. */
let masterLibrary=[],masterLoad=null,masterToken=0,productMode='my';
let masterState=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const resultWord=r=>r==='1-0'?'Победили белые':r==='0-1'?'Победили чёрные':'Ничья';
const russianCount=(n,one,few,many)=>{const a=n%10,b=n%100;return n+' '+(a===1&&b!==11?one:a>=2&&a<=4&&(b<12||b>14)?few:many);};
const fullMoveCount=moves=>Math.ceil((moves?.length||0)/2);
const masterProgressText=cursor=>cursor===0?'Начало партии':`После ${Math.ceil(cursor/2)}-го хода ${cursor%2?'белых':'чёрных'}`;
$('#myGame').onclick=()=>setProductMode('my');
$('#masters').onclick=()=>setProductMode('masters');
async function setProductMode(mode) {
  masterToken++;evaluationService.cancel();clearAnalysisState();masterState=null;productMode=mode;
  $('#myGameFlow').hidden=mode!=='my';$('#masterFlow').hidden=mode!=='masters';
  $('#myGame').classList.toggle('active',mode==='my');$('#masters').classList.toggle('active',mode==='masters');
  $('#myGame').setAttribute('aria-pressed',String(mode==='my'));$('#masters').setAttribute('aria-pressed',String(mode==='masters'));
  if(mode==='my') {setStatus('Выбери сторону и запусти анализ.');return;}
  $('#masterFlow').innerHTML='<h1>Учиться у гроссмейстеров</h1><p role="status">Загружаю библиотеку…</p>';
  try {
    if(!masterLoad)masterLoad=fetch('data/grandmaster-games.json').then(r=>{if(!r.ok)throw Error('Нет данных библиотеки');return r.json();}).catch(e=>{masterLoad=null;throw e;});
    masterLibrary=await masterLoad;
    if(productMode==='masters'&&!masterState)renderLibrary();
  }catch(e){if(productMode==='masters'){ $('#masterFlow').innerHTML='<p role="alert">Библиотека не загрузилась. Проверь соединение.</p><button class="ghost" id="reloadLibrary">Повторить</button>';$('#reloadLibrary').onclick=()=>setProductMode('masters');}}
}
function renderLibrary() {
  $('#masterFlow').innerHTML=`<h1>Учиться у гроссмейстеров</h1><p class="masterIntro">Выбери партию. Листай ходы на доске, разбирай ключевые моменты и пробуй найти сильный ход.</p>
  <div class="libraryFilters"><label>Игрок<select id="playerFilter"><option value="">Все игроки</option>${[...new Set(masterLibrary.flatMap(g=>[g.white,g.black]))].sort().map(p=>`<option>${esc(p)}</option>`).join('')}</select></label>
  <label>Тема<select id="tagFilter"><option value="">Все темы</option>${[...new Set(masterLibrary.flatMap(g=>g.tags))].sort().map(p=>`<option>${esc(p)}</option>`).join('')}</select></label>
  <label>Эпоха<select id="eraFilter"><option value="">Все годы</option><option value="old">До 1945</option><option value="classic">1945–1999</option><option value="modern">С 2000</option></select></label></div>
  <p id="libraryCount" role="status"></p><div id="libraryCards" class="libraryCards"></div>`;
  for(const id of ['playerFilter','tagFilter','eraFilter'])$('#'+id).onchange=filterLibrary;
  filterLibrary();
}
function filterLibrary() {
  const player=$('#playerFilter').value,tag=$('#tagFilter').value,era=$('#eraFilter').value;
  const games=masterLibrary.filter(g=>(!player||[g.white,g.black].includes(player))&&(!tag||g.tags.includes(tag))&&(!era||(era==='old'?g.year<1945:era==='classic'?g.year>=1945&&g.year<2000:g.year>=2000)));
  $('#libraryCount').textContent=Analysis.plural(games.length,'партия','партии','партий');$('#libraryCards').innerHTML='';
  for(const game of games) {
    const button=document.createElement('button');button.className='libraryCard';button.type='button';button.dataset.gameId=game.id;
    button.innerHTML=`<strong>${esc(game.white)}<br><span class="muted">против</span> ${esc(game.black)}</strong><span>${game.year} · ${esc(game.event)}</span><span>${resultWord(game.result)}</span><span class="tags">${game.tags.map(esc).join(' · ')}</span>`;
    button.onclick=()=>openMaster(game);$('#libraryCards').appendChild(button);
  }
  if(!games.length)$('#libraryCards').textContent='Подходящих партий нет. Попробуй другие фильтры.';
}
function stopMaster(message='Анализ остановлен. Можно продолжать листать партию.') {
  masterToken++;evaluationService.cancel();if(masterState){masterState.busy=false;masterState.guess=null;masterState.status=message;renderMaster();}
}
function openMaster(game) {
  stopMaster();
  try {masterState={game,...Analysis.replay(game.pgn),cursor:0,moments:[],status:'Партию можно листать сразу. Найдём моменты для урока?',busy:false,guess:null};}
  catch(e){$('#masterFlow').textContent=e.message;return;}
  renderMaster();
}
function masterStep(delta) {
  if(!masterState)return;
  // Changing position invalidates an outstanding attempt, never its feedback into another game.
  if(masterState.guess)stopMaster('Угадывание завершено.');
  masterState.cursor=Math.max(0,Math.min(masterState.moves.length,masterState.cursor+delta));masterState.guess=null;renderMaster();
}
async function analyzeMaster() {
  const lesson=masterState,token=++masterToken;evaluationService.cancel();lesson.busy=true;lesson.guess=null;renderMaster();
  try {
    const result=await Analysis.scan(evaluationService,lesson.positions,lesson.moves,{master:true,active:()=>masterToken===token&&masterState===lesson,
      progress:(text,pct)=>{if(masterToken===token){$('#masterStatus').textContent=text;$('#masterProgress').value=pct;}}});
    if(masterToken!==token||masterState!==lesson)return;
    lesson.moments=result.moments;lesson.evals=result.evals;lesson.busy=false;
    lesson.status=result.moments.length?`Готово: ${Analysis.plural(result.moments.length)} для урока.`:'Крупных подтверждённых моментов не найдено. Позиционные нюансы требуют более тонкого разбора.';
    renderMaster();
  }catch(e){if(masterToken===token&&masterState===lesson){lesson.busy=false;lesson.status='Анализ не завершён: '+e.message+'. Можно повторить.';renderMaster();}}
}
function masterExplanation(x) {
  if(!x)return '';
  const board=new Chess(x.postFen),move=x.move;
  if(board.in_checkmate())return 'Этот ход ставит мат: король под шахом, и легального ответа нет.';
  if(x.loss>=120) {
    const rd=removedDefenderInfo(x);
    if(rd)return `Фигура с ${rd.defenderFrom} защищала поле ${rd.victimSq}. Этот ход убрал именно эту защиту. ${x.reply?'В партии затем: '+humanMove(x.reply,'side'):''}`;
    if(pieceImmediatelyCapturable(x))return `Фигура на ${move.to} осталась без защиты, и соперник может взять её легальным ходом. Это проверено на доске.`;
    return 'Оценка заметно изменилась после этого хода. Позиция тонкая: простую причину нельзя надёжно подтвердить, поэтому не будем придумывать тактическую историю.';
  }
  if(move.promotion)return 'Пешка превратилась в новую фигуру. Этот ход сохраняет преимущество по повторной проверке.';
  if(move.captured)return `Этот ход забирает ${PIECE_NAME_ACC[move.captured]} соперника и сохраняет оценку позиции. Взятие само по себе не доказывает выигрыш материала: учитывай возможный ответ.`;
  if(board.in_check())return 'Этот ход создаёт шах. Сопернику приходится отвечать на угрозу королю; на доске доступны только легальные ответы.';
  return 'Один из сильнейших вариантов. Позиция тонкая: надёжной простой причины пока нет.';
}
function masterLessonKind(moment){return moment?.label==='Сильный ход'?'strong':'improve';}
function masterTarget(moment){return masterLessonKind(moment)==='strong'?moment.move:moment.bestmove;}
function masterChallengeTitle(moment){return masterLessonKind(moment)==='strong'?'Попробуй найти сильный ход':'Найди более сильный ход';}
function masterRevealLabel(moment){return masterLessonKind(moment)==='strong'?'Показать ход из партии':'Показать более сильный вариант';}
function masterActor(moment){return moment.move.color==='w'?masterState.game.white:masterState.game.black;}
function renderMaster() {
  const l=masterState;if(!l)return;
  const mv=l.moves[l.cursor-1],moment=l.moments.find(m=>m.i+1===l.cursor),g=l.game;
  $('#masterFlow').innerHTML=`<button class="ghost" id="backLibrary">← Библиотека</button><h1 class="lessonTitle">${esc(g.white)} — ${esc(g.black)}</h1><p class="muted">Белые: ${esc(g.white)} · Чёрные: ${esc(g.black)}<br>${g.year} · ${esc(g.event)} · ${resultWord(g.result)} · ${russianCount(fullMoveCount(l.moves),'ход','хода','ходов')}</p>
  <div class="row"><button class="primary" id="masterAnalyze" ${l.busy?'disabled':''}>${l.moments.length?'Проверить ещё раз':'Найти ключевые моменты'}</button><button class="ghost" id="masterStop" ${l.busy?'':'hidden'}>Остановить</button></div>
  <p id="masterStatus" role="status" aria-live="polite">${esc(l.status)}</p><progress id="masterProgress" max="100" value="0" ${l.busy?'':'hidden'}></progress>
  <div class="masterMoments">${l.moments.map(m=>`<button class="ghost" data-moment="${m.i}" aria-label="${m.label}, ход ${Math.floor(m.i/2)+1}">${m.label} · ход ${Math.floor(m.i/2)+1}</button>`).join('')}</div>
  <div class="boardWrap"><div class="board" id="masterBoard"></div></div>
  <p id="masterTurn">${l.cursor===l.moves.length?`Партия закончилась: ${resultWord(g.result).toLowerCase()} · ${russianCount(fullMoveCount(l.moves),'ход','хода','ходов')}.`:`${masterProgressText(l.cursor)}. Сейчас ходят ${sideWord(l.positions[l.cursor].split(' ')[1])}.`}</p>
  <div class="detectiveNav"><button id="masterPrev" ${l.cursor===0?'disabled':''}>← Предыдущий ход</button><button id="masterNext" ${l.cursor===l.moves.length?'disabled':''}>Следующий ход →</button></div>
  <div class="card" id="masterCard"><h2>${moment?moment.label:'Ход партии'}</h2><p>${mv?humanMove(mv,'side'):'Белые начинают. Нажми «Следующий ход».'}</p>${moment?`<p>${masterExplanation(moment)}</p><button class="primary" id="guessMaster" ${l.busy?'disabled':''}>${masterChallengeTitle(moment)}</button>`:''}
  <details class="notation"><summary>Технические детали</summary><code>${mv?esc(mv.san):'Начальная позиция'}${moment?` · глубина проверки ${moment.depth}`:''}</code><pre>${esc(g.pgn)}</pre></details></div>
  <button class="ghost" id="masterFlip">Повернуть доску</button>`;
  renderMasterBoard(l.positions[l.cursor],false,mv?{playedFrom:mv.from,playedTo:mv.to}:null);
  $('#backLibrary').onclick=()=>{stopMaster();masterState=null;renderLibrary();};$('#masterAnalyze').onclick=analyzeMaster;$('#masterStop').onclick=()=>stopMaster();
  $('#masterPrev').onclick=()=>masterStep(-1);$('#masterNext').onclick=()=>masterStep(1);
  $('#masterFlip').onclick=()=>{l.orientation=l.orientation==='b'?'w':'b';if(l.guess)renderGuessBoard();else renderMasterBoard(l.positions[l.cursor],false,null);};
  document.querySelectorAll('[data-moment]').forEach(button=>button.onclick=()=>{if(l.guess)stopMaster();l.cursor=Number(button.dataset.moment)+1;l.guess=null;renderMaster();});
  if(moment)$('#guessMaster').onclick=()=>startMasterGuess(moment);
}
function renderMasterBoard(fen,interactive,marks) {
  // Share SVGs, coordinates, orientation and legal target rendering with Doctor.
  const original=state.retry,color=state.userColor;
  state.retry=interactive?masterState.guess:null;state.userColor=masterState.orientation||'w';
  renderBoard(fen,interactive,marks,'#masterBoard',masterGuessClick);
  state.retry=original;state.userColor=color;
}
function renderGuessBoard(){const r=masterState.guess;renderMasterBoard(r.game.fen(),!r.pending,null);}
function finishMasterGuess(l,r,fen,marks,html,status) {
  if(masterState!==l||l.guess!==r)return;
  renderMasterBoard(fen,false,marks);
  l.guess=null;
  $('#masterPrev').disabled=l.cursor===0;$('#masterNext').disabled=l.cursor===l.moves.length;
  $('#masterCard').innerHTML=html;
  $('#masterStatus').textContent=status;
  const back=$('#returnLesson');if(back)back.onclick=renderMaster;
}
function revealMasterTarget(l,r) {
  const game=new Chess(r.moment.preFen),mv=game.move(r.targetMove);
  if(!mv)return;
  const actor=esc(masterActor(r.moment)),kind=r.lessonType;
  const historical=kind==='improve'?`<p>В партии было сыграно: ${humanMove(r.moment.move,'side')}</p>`:'';
  finishMasterGuess(l,r,game.fen(),{playedFrom:mv.from,playedTo:mv.to},
    `<h2>${kind==='strong'?'Сильный ход из партии':'Более сильный вариант'}</h2><p>${humanMove(mv,'side')}</p>${historical}<button class="ghost" id="returnLesson">Вернуться к партии</button>`,
    kind==='strong'?'Ход из партии раскрыт.':'Более сильный вариант раскрыт.');
}
function startMasterGuess(moment) {
  const l=masterState,game=new Chess(moment.preFen),legal=game.moves({verbose:true}),targetMove=masterTarget(moment);
  if(!targetMove)return;
  const lessonType=masterLessonKind(moment);
  l.guess={moment,targetMove,lessonType,game,from:null,targets:[],legalFrom:[...new Set(legal.map(m=>m.from))],inCheck:game.in_check(),pending:false,showLegalSources:false};l.orientation=game.turn();
  $('#masterPrev').disabled=$('#masterNext').disabled=true;
  $('#masterTurn').textContent=`До ключевого решения. Сейчас ходят ${sideWord(game.turn())}.`;
  $('#masterCard').innerHTML=`<h2>${masterChallengeTitle(moment)}</h2><p id="masterGuessStatus" role="status">Выбери любую свою фигуру. Подсказки появятся только после выбора: мы не будем заранее показывать, какой фигурой искать ход.</p><div id="promotionChoice"></div><button class="ghost" id="showMaster">${masterRevealLabel(moment)}</button>`;
  $('#showMaster').onclick=()=>revealMasterTarget(l,l.guess);renderGuessBoard();
}
async function masterGuessClick(sq,promotion) {
  const l=masterState,r=l?.guess;if(!r||r.pending)return;
  if(!r.from) {
    const piece=r.game.get(sq),moves=r.game.moves({square:sq,verbose:true});
    if(!moves.length){
      $('#masterGuessStatus').textContent=piece&&piece.color!==r.game.turn()
        ? 'Это фигура соперника. Выбери свою.'
        : piece
          ? (r.inCheck?'Сейчас шах. Эта фигура не может убрать шах — выбери другую.':'Этой фигурой сейчас сходить нельзя. Выбери другую.')
          : 'Выбери свою фигуру.';
      return;
    }
    r.from=sq;r.targets=moves.map(m=>m.to);$('#masterGuessStatus').textContent='Теперь выбери подсвеченное поле. Можно также выбрать другую свою фигуру.';renderGuessBoard();return;
  }
  if(sq===r.from){r.from=null;r.targets=[];$('#masterGuessStatus').textContent='Выбор снят. Выбери любую свою фигуру.';renderGuessBoard();return;}
  const switchMoves=r.game.moves({square:sq,verbose:true});
  if(switchMoves.length){r.from=sq;r.targets=switchMoves.map(m=>m.to);$('#masterGuessStatus').textContent='Фигура выбрана. Теперь выбери подсвеченное поле.';renderGuessBoard();return;}
  const options=r.game.moves({square:r.from,verbose:true}).filter(m=>m.to===sq);
  if(options.some(m=>m.promotion)&&!promotion) {
    $('#promotionChoice').innerHTML='Превратить пешку в: ';
    for(const type of ['q','r','b','n']){const b=document.createElement('button');b.className='ghost';b.textContent=pieceNom(type);b.onclick=()=>masterGuessClick(sq,type);$('#promotionChoice').appendChild(b);}return;
  }
  const attempt={from:r.from,to:sq,promotion};
  if(!new Chess(r.moment.preFen).move(attempt)){r.from=null;r.targets=[];$('#masterGuessStatus').textContent='Так ходить нельзя. Выбери фигуру ещё раз.';renderGuessBoard();return;}
  r.pending=true;const token=masterToken;$('#masterGuessStatus').textContent='Сравниваю твой ход с сильными вариантами…';
  $('#promotionChoice').innerHTML='';renderGuessBoard();
  try {
    const feedback=await Analysis.compare(evaluationService,r.moment.preFen,r.moment.move,attempt,{
      targetMove:r.targetMove,referenceBestmove:r.moment.bestmove,depth:r.moment.depth||14,lessonType:r.lessonType,
      active:()=>masterState===l&&masterToken===token&&l.guess===r
    });
    if(masterState!==l||masterToken!==token||l.guess!==r)return;
    const actualIssue={...r.moment,move:feedback.actual,postFen:feedback.fen,reply:null,loss:feedback.attemptLoss};
    const explanation=masterExplanation(actualIssue),actor=esc(masterActor(r.moment));
    const sameHistorical=Analysis.sameMove(feedback.actual,r.moment.move);
    let historyLine='';
    if(r.lessonType==='improve')historyLine=sameHistorical
      ? '<p>Ты повторил ход из партии — именно его мы сейчас разбираем.</p>'
      : `<p>В партии было сыграно: ${humanMove(r.moment.move,'side')}</p>`;
    else if(!sameHistorical)historyLine=`<p>В партии было сыграно: ${humanMove(r.moment.move,'side')}</p>`;
    const showRecommendation=r.lessonType==='improve'&&['weak','playable','repeat'].includes(feedback.kind)&&!Analysis.sameMove(feedback.actual,r.targetMove);
    const recommendation=showRecommendation?`<p>${humanSuggestion(r.targetMove)}</p>`:'';
    const html=`<h2>${feedback.text}</h2><p>${humanMove(feedback.actual,'Ты')}</p><p>${explanation}</p>${historyLine}${recommendation}
    <button class="primary" id="guessAgain">Попробовать снова</button><button class="ghost" id="returnLesson">Вернуться к партии</button>`;
    finishMasterGuess(l,r,feedback.fen,{playedFrom:feedback.actual.from,playedTo:feedback.actual.to},html,'Попытка проверена.');
    $('#guessAgain').onclick=()=>startMasterGuess(r.moment);
  }catch(e){if(masterState===l&&masterToken===token&&l.guess===r){r.pending=false;$('#masterGuessStatus').textContent='Не удалось сравнить: '+e.message+'. Попробуй ещё раз.';r.from=null;r.targets=[];renderGuessBoard();}}
}
