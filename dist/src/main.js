import { Expedition, sectorInfo, availableSpecies, depthBenefits, dist } from './world.js';
import { SPECIES, fishSVG } from './species.js';
import { Renderer } from './render.js';
import { bindGameAction, bindThumbStick, portraitViewport } from './controls.js';
import { AudioEngine } from './audio.js';
import {MILESTONES,RELICS,collectionRank,relicSVG} from './progression.js';
import {readDive,writeDive} from './storage.js';

const $ = id => document.getElementById(id);
const hide = id => $(id).classList.add('hidden');
const show = id => $(id).classList.remove('hidden');
const icon = name => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
const mobile = () => matchMedia('(pointer: coarse)').matches || (innerWidth<=1100&&innerHeight<=650);
const portrait = () => portraitViewport(innerWidth,innerHeight);
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* The game also works when browser storage is unavailable. */ }
};

const renderer = new Renderer($('ocean'));
const audio = new AudioEngine();
let best = read('null-tide-best', 0);
let catalog = read('null-tide-real-catalog-v4', {});
if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') catalog = {};
catalog = Object.fromEntries(SPECIES.filter(f => Number.isSafeInteger(catalog[f.id]) && catalog[f.id] > 0).map(f => [f.id, catalog[f.id]]));
let checkpoint;try{checkpoint=readDive(localStorage);}catch{checkpoint=null;}
let deepest = Math.max(Number(read('null-tide-deepest-v4',read('null-tide-deepest',200)))||200,checkpoint?sectorInfo(checkpoint.maxSector??checkpoint.sector).depth:200);
let game = new Expedition(271828,{...checkpoint,sector:0,known:Object.keys(catalog)});
let mode = 'title';
let previous = 0;
let accumulator = 0;
let hudTime = 0;
let toastTimer = 0;
let catchTimer=0,autosaveTimer=0,needsRender=true,storageWarning=false;
let installPrompt=null,waitingWorker=null,offlineReady=false;
let oldFocus = null;
let modalClose = null;
let keys = new Set();
let touch = { x: 0, y: 0 };
let holding = false;
let netArmed = false;
let thumbStick = null;
let performanceFrames = 0;
let performanceStart = 0;

// The title illustration needs no full sea-floor texture. Build it on departure.
renderer.reduced = read('null-tide-reduced', renderer.reduced);
document.body.classList.toggle('reduce-motion', renderer.reduced);
audio.enabled = read('null-tide-sound', true);
updateSound();
updateBest();

function formatTime(seconds, elapsed = false) {
  const t = Math.max(0, elapsed ? Math.floor(seconds) : Math.ceil(seconds));
  return `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
}

function updateBest() {
  const known=Object.keys(catalog).length;
  text('best-title',`魚図鑑 ${known} / ${SPECIES.length} · 最深 ${deepest.toLocaleString()} m`);
  text('start-label',checkpoint?`つづきから ${sectorInfo(checkpoint.sector).depth.toLocaleString()} m`:'潜りはじめる');
  $('fresh-start').classList.toggle('hidden',!checkpoint);
}

function clearInput() {
  keys.clear();
  touch = { x: 0, y: 0 };
  holding = false;
  netArmed = false;
  thumbStick?.reset();
  setToolsExpanded(false);
}

function setToolsExpanded(expanded) {
  $('hud').classList.toggle('tools-open', expanded);
  $('tools-toggle').setAttribute('aria-expanded', String(expanded));
  $('tools-toggle').setAttribute('aria-label', expanded ? '道具を閉じる' : '道具を開く');
  $('field-tools').inert = mobile() && !expanded;
}

function notify(title, body = '', duration = 4) {
  text('toast-title', title);
  text('toast-body', body);
  show('toast');
  toastTimer = duration;
}

function openModal(html, onClose = null) {
  needsRender=true;
  oldFocus = document.activeElement;
  modalClose = onClose;
  $('modal-content').classList.remove('journal-sheet','chart-view','guide-sheet','intro-guide','logbook-sheet');
  $('modal-content').innerHTML = `${onClose ? '<button class="dialog-close" id="dialog-close" aria-label="閉じる">×</button>' : ''}${html}`;
  if (onClose) $('dialog-close').onclick = onClose;
  show('modal');
  clearInput();
  syncViewport();
  requestAnimationFrame(() => $('modal-content').querySelector('button,a,input,select,textarea')?.focus());
}

function closeModal() {
  const wasOpen = !$('modal').classList.contains('hidden');
  hide('modal');
  modalClose = null;
  syncViewport();
  const focusTarget = oldFocus?.isConnected ? oldFocus : mode === 'title' ? $('start') : $('pause');
  if (wasOpen) focusTarget?.focus({ preventScroll: true });
  clearInput();
}

function setMapExpanded(expanded) {
  $('map-content').classList.toggle('hidden', !expanded);
  $('map-toggle').setAttribute('aria-expanded', String(expanded));
  text('map-symbol', expanded ? '−' : '+');
}

function saveDive(){
  checkpoint=game.snapshot();let stored=false;try{stored=writeDive(localStorage,checkpoint);}catch{}if(!stored&&!storageWarning){storageWarning=true;notify('端末に保存できません','メニューのデータ引継ぎからコードを保存してください。',8);}
  deepest=Math.max(deepest,sectorInfo(game.maxSector).depth);save('null-tide-deepest-v4',deepest);
}
async function enterFullscreen(){
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}
}
function syncViewport(){
  const rotate=portrait();
  document.body.classList.toggle('phone-landscape',mobile()&&!rotate);
  renderer.compact = mobile() && !rotate;
  setToolsExpanded(false);
  for(const id of ['header','title-screen','title-depth','hud','title-footer','catch-card'])$(id).inert=rotate||!$('modal').classList.contains('hidden');
  $('modal').inert=rotate;
  if(rotate)clearInput();
}
function start(fresh=false) {
  audio.init();audio.play('sector');
  if(mobile()&&window.top===window.self)enterFullscreen();
  const source=checkpoint?{...checkpoint,sector:fresh?0:checkpoint.sector}:null;
  game=new Expedition(source?.seed??crypto.getRandomValues(new Uint32Array(1))[0],{...source,known:Object.keys(catalog)});
  renderer.setWorld(game.map);mode='playing';needsRender=true;
  for(const id of ['title-screen','title-depth','title-footer'])hide(id);
  show('hud');show('pause');document.body.classList.add('playing');closeModal();
  setMapExpanded(!mobile());saveDive();updateHUD();
  if(!read('null-tide-rules-v5',false)){help('playing',true);return;}
  notify(`水深 ${sectorInfo(game.sector).depth.toLocaleString()} m から潜航`,mobile()?'捕獲はタップで開始。左のエリアをドラッグして移動しよう。':'F で捕獲を切替、Q で餌。潜降口からさらに深い海へ。',5);
}
function toggleNet(){if(mode!=='playing'||portrait())return;netArmed=!netArmed;updateHUD();}

function input() {
  return {
    x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x,
    y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y,
    interact: keys.has('KeyE') || holding,
    net: netArmed,
  };
}

function pulse() {
  if (mode !== 'playing') return;
  audio.init();
  if (game.pulse()) updateHUD();
}

function dash() {
  if (mode !== 'playing') return;
  const i = input();
  game.dash(i.x, i.y);
  updateHUD();
}

function pause() {
  if (mode !== 'playing') return;
  saveDive();
  mode = 'paused';
  openModal(`
    <div class="micro">一時停止</div>
    <h2 id="modal-title">ひと休み。</h2>
    <p>潜航を止めています。酸素も減らないので、ごゆっくり。</p>
    <div class="modal-actions">
      <button class="primary" id="resume">${icon('play')}潜航を続ける</button>
      <button class="secondary" id="warp-menu">ワープ</button><button class="secondary" id="market-menu">浅瀬の商人</button><button class="secondary" id="transfer-menu">データ引継ぎ</button><button class="secondary" id="logbook-menu">航海記録・収集品</button><button class="secondary" id="install-menu">${offlineReady?'ホーム画面追加 · オフライン準備済み':'ホーム画面に追加'}</button>${waitingWorker?'<button class="secondary" id="update-app">更新版を読み込む</button>':''}<button class="secondary" id="pause-journal">図鑑・海図</button><button class="secondary" id="pause-help">あそびかた</button>
      <button class="secondary" id="pause-fullscreen">全画面</button><button class="secondary" id="pause-sound">サウンド切替</button>
      <button class="text-button" id="abandon">タイトルへ戻る</button>
    </div>`, resume);
  $('resume').onclick = resume;$('logbook-menu').onclick=()=>logbook();$('install-menu').onclick=installGame;if($('update-app'))$('update-app').onclick=()=>{saveDive();waitingWorker.postMessage({type:'ACTIVATE'});};$('warp-menu').onclick=warpMenu;$('market-menu').onclick=market;$('transfer-menu').onclick=()=>transferMenu('playing');
  $('pause-fullscreen').onclick = enterFullscreen;
  $('pause-sound').onclick=()=>{audio.init();audio.toggle();updateSound();save('null-tide-sound',audio.enabled);text('pause-sound',audio.enabled?'サウンド：あり':'サウンド：なし');};
  $('pause-journal').onclick = () => journal('paused');
  $('pause-help').onclick = () => help('paused');
  $('abandon').onclick = () => { closeModal(); toTitle(); };
}

function resume() {
  closeModal();
  mode = 'playing';
}

function toTitle() {
  mode = 'title';
  game = new Expedition(271828,{...checkpoint,sector:0,known:Object.keys(catalog)});
  for (const id of ['title-screen', 'title-depth', 'title-footer']) show(id);
  hide('hud');
  hide('pause');
  hide('toast');hide('catch-card');
  document.body.classList.remove('playing');
  updateBest();
  clearInput();
}

function help(returnTo = mode, first = false) {
  if (mode === 'playing') mode = 'paused';
  const leave = () => { save('null-tide-rules-v5', true); closeModal(); mode = returnTo === 'title' ? 'title' : 'playing'; };
  openModal(`<div class="micro">${first?'出航前の30秒ガイド':'いつでも読める航海ガイド'}</div>
    <h2 id="modal-title">魚を集めて、もっと深い海へ。</h2>
    <div class="guide-tabs" role="tablist" aria-label="あそびかた"><button role="tab" id="guide-flow" aria-selected="true">進め方</button><button role="tab" id="guide-controls" aria-selected="false">操作</button><button role="tab" id="guide-return" aria-selected="false">帰還・強化</button></div>
    <div id="guide-panel" role="tabpanel"></div>
    <div class="guide-footer"><label class="quality-toggle"><input type="checkbox" id="reduce" ${renderer.reduced?'checked':''}> 画面の揺れを抑える</label><button class="primary" id="close-help">${returnTo==='title'?'タイトルへ':first?'わかった、探索を始める':'探索に戻る'}</button></div>`, leave);
  $('modal-content').classList.add('guide-sheet');$('modal-content').classList.toggle('intro-guide',first);
  const pages = {
    flow: `<ol class="guide-steps"><li><b>魚に近づいて「捕獲」を1回タップ。</b><span>網を構えたまま移動できます。円の中に魚を保つと捕獲完了。大きい魚・レアな魚ほど時間がかかります。</span></li><li><b>次へ進むには、潮流鍵を1つ。</b><span>金色の点線をたどって、水色の鍵を回収。3つ全部を探す必要はありません。神殿の謎を解いて開放することもできます。</span></li><li><b>黄色の潜降口で「潜る」をタップ。</b><span>装備を1つ選ぶと、300 m深い海へ。新しい魚と高い査定額が待っています。残りの鍵・神殿は自由に探索できます。</span></li></ol><p class="guide-note">目標は全${SPECIES.length}種の図鑑完成。次の行き先は画面上の「次へ」に表示します。この説明はメニューからいつでも読めます。</p>`,
    controls: `<div class="controls-grid"><div class="control"><b>移動</b><small>${mobile()?'左下をドラッグ。右手で捕獲・加速を同時に使えます。':'WASD / 矢印キー。曲がる前は少し減速しましょう。'}</small></div><div class="control"><b>捕獲 ${mobile()?'':'[F]'}</b><small>1回押して開始、もう1回で解除。1匹捕まえると自動で解除。</small></div><div class="control"><b>加速 ${mobile()?'':'[Shift]'}</b><small>逃げる・速く移動する。加速中は無敵ですが、魚が驚きます。</small></div><div class="control"><b>調べる ${mobile()?'':'[E]'}</b><small>鍵・神殿・潜降口の近くに現れるボタンを1回押します。</small></div><div class="control"><b>道具 ${mobile()?'':'[Q / Space]'}</b><small>餌で魚をおびき寄せ、ソナーで暗い場所を確認。ソナーの音は監視機にも届きます。</small></div><div class="control"><b>図鑑・海図 ${mobile()?'':'[J]'}</b><small>左上の魚マークで図鑑、鍵の表示で海図。メニューで休憩 ${mobile()?'':'[Esc]'}。</small></div></div>`,
    return: `<ol class="guide-steps"><li><b>酸素が減ったら、補給ブイへ。</b><span>出発地点の緑色の基地で酸素・耐久を何度でも回復。失敗しても図鑑・鍵・到達深度は残ります。</span></li><li><b>メニュー → ワープで、開拓済みの海へ。</b><span>一度到達した深度へは無料で移動できます。上昇口から1段ずつ戻ることもできます。</span></li><li><b>浅瀬のゲンさんに売って、潜水艇を強化。</b><span>メニュー → 浅瀬の商人。遠くにいる場合はワープで200 mへ。積み荷を売り、エンジン・タンク・網を購入できます。</span></li></ol><p class="guide-note">進行は自動保存。別端末へ移るときは「データ引継ぎ」で署名付きコードを作って保存してください。</p>`
  };
  let introStep=0;
  const introSteps=[['魚に近づいて、捕獲をタップ。',mobile()?'左下をドラッグして移動。右の「捕獲」を1回押し、魚を円の中に保つと捕まえられます。':'WASD / 矢印で移動。Fで網を構え、近くの魚を円の中に保つと捕獲できます。'],['潜る条件は、潮流鍵を1つ。','金色の点線をたどり、水色の鍵の近くで「回収」をタップ。3つ全部は不要です。神殿の謎解きでも開放できます。'],['黄色い潜降口から、300 m深くへ。','装備を1つ選んで次の海へ。探索済みの深度はメニューから無料ワープ。浅瀬では魚を売って潜水艇を強化できます。']];
  const select = name => { for(const id of ['flow','controls','return'])$('guide-'+id).setAttribute('aria-selected',String(id===name));$('guide-panel').setAttribute('aria-labelledby','guide-'+name);$('guide-panel').innerHTML=first&&name==='flow'?`<p class="intro-count">出航ガイド ${introStep+1} / 3</p><div class="intro-step"><h3>${introSteps[introStep][0]}</h3><p>${introSteps[introStep][1]}</p></div>`:pages[name];$('modal-content').scrollTop=0; };
  for(const id of ['flow','controls','return'])$('guide-'+id).onclick=()=>select(id);
  select('flow');if(first)text('close-help','次へ →');$('close-help').onclick=()=>{if(first&&introStep<2){introStep++;select('flow');text('close-help',introStep===2?'探索を始める':'次へ →');}else leave();};
  $('reduce').onchange=e=>{renderer.reduced=e.target.checked;document.body.classList.toggle('reduce-motion',renderer.reduced);save('null-tide-reduced',renderer.reduced);};
}

function journal(returnTo=mode,showChart=false) {
  if(mode==='playing')mode='paused';
  const leave=()=>{closeModal();mode=returnTo==='title'?'title':'playing';};
  const known=Object.keys(catalog).length,benefit=depthBenefits(game.maxSector);
  openModal(`<div class="micro">海洋調査ノート · 記録は自動保存</div><h2 id="modal-title">世界の魚、${SPECIES.length.toLocaleString()} 種。</h2>
    <p>${sectorInfo(game.sector).name} · 水深 ${sectorInfo(game.sector).depth.toLocaleString()} m · 潮流鍵 ${game.map.cores.filter(k=>k.done).length}/3（1つで開放）<br>開拓ボーナス：酸素 ${benefit.oxygen}秒 / 捕獲速度 ×${benefit.capture.toFixed(2)} / この深度の報酬 ×${depthBenefits(game.sector).reward.toFixed(2)}</p>
    <div class="journal-tabs" role="tablist"><button id="codex-tab" role="tab" aria-selected="true">魚図鑑 ${known.toLocaleString()} / ${SPECIES.length.toLocaleString()}</button><button id="chart-tab" role="tab" aria-selected="false">海図・潮流鍵</button><button id="journal-logbook">航海記録</button></div>
    <div id="codex-panel" role="tabpanel"><div class="catalog-filters"><input id="fish-search" type="search" placeholder="和名・学名・科名で検索" aria-label="魚の名前を検索"><select id="fish-filter" aria-label="図鑑の表示"><option value="all">すべて</option><option value="known">捕獲済み</option><option value="unknown">未捕獲</option><option value="depth">この深度で出会える魚</option></select></div><p id="catalog-results"></p><div id="catalog-grid" class="codex-grid"></div><div class="catalog-pages"><button id="fish-prev" class="secondary">前の24種</button><span id="fish-page"></span><button id="fish-next" class="secondary">次の24種</button></div><p>実在する魚の和名・学名を収録。出現深度・色・大きさはゲーム用の表現です。図鑑の全種類を、魚群を更新しながら捕獲できます。</p><a href="https://www.gbif.org/dataset/6b6b2923-0a10-4708-b170-5b7c611aceef" target="_blank" rel="noreferrer">名称データ：ENA taxonomy / GBIF ↗</a></div>
    <div id="chart-panel" class="hidden" role="tabpanel"><p class="chart-legend">水色：潮流鍵（1つで開放） / 紫：古代神殿 / 黄：潜降 / 青：上昇 / □：補給</p><p class="chart-explanation">鍵1つ、または神殿の謎解きで次へ。上昇は自由です。集めた鍵と海図は再訪しても残ります。補給ブイで魚群を更新すると、未捕獲の魚を優先して探せます。</p><canvas id="large-chart" width="738" height="534" aria-label="潮流鍵と上下の移動口を示す海図"></canvas></div>
    <div class="modal-actions"><button class="primary" id="close-journal">${returnTo==='title'?'タイトルへ':'探索を続ける'}</button></div>`,leave);
  $('modal-content').classList.add('journal-sheet');let page=0;
  const draw=()=>{const q=$('fish-search').value.trim().toLowerCase(),filter=$('fish-filter').value,depth=sectorInfo(game.sector).depth;
    const list=SPECIES.map((f,i)=>({f,i})).filter(({f})=>(!q||`${f.name} ${f.scientific} ${f.family}`.toLowerCase().includes(q))&&(filter!=='known'||catalog[f.id])&&(filter!=='unknown'||!catalog[f.id])&&(filter!=='depth'||(f.minDepth<=depth&&depth<=f.maxDepth)));
    page=Math.max(0,Math.min(page,Math.ceil(list.length/24)-1));text('catalog-results',`${list.length.toLocaleString()} 種 · 捕獲済み ${known.toLocaleString()} 種`);text('fish-page',`${page+1} / ${Math.max(1,Math.ceil(list.length/24))}`);$('fish-prev').disabled=page===0;$('fish-next').disabled=(page+1)*24>=list.length;
    $('catalog-grid').innerHTML=list.slice(page*24,page*24+24).map(({f,i})=>`<article class="specimen ${catalog[f.id]?'known':'unknown'}"><div class="specimen-art">${fishSVG(i)}</div><small>No.${String(i+1).padStart(4,'0')} · ${catalog[f.id]?'捕獲済み':'未捕獲'}</small><h3>${f.name}</h3><p><i>${f.scientific}</i><br>${f.family}<br>${'★'.repeat(f.rank)} ${f.rarity} · ゲーム基準重量 ${f.baseGrams.toLocaleString()} g<br>固有価値 ${f.intrinsic} G/kg${game.records[f.id]?`<br><strong>自己記録 ${game.records[f.id].grams.toLocaleString()} g</strong><br>採集 ${game.records[f.id].count.toLocaleString()} 匹`:''}</p><b>出現深度（ゲーム） ${f.minDepth.toLocaleString()} m〜${Number.isFinite(f.maxDepth)?f.maxDepth.toLocaleString()+' m':''}</b></article>`).join('')||'<p>該当する魚がいません。</p>';
  };
  $('fish-search').oninput=$('fish-filter').onchange=()=>{page=0;draw();};$('fish-prev').onclick=()=>{page--;draw();};$('fish-next').onclick=()=>{page++;draw();};draw();
  const tab=chart=>{$('modal-content').classList.toggle('chart-view',chart);$('codex-panel').classList.toggle('hidden',chart);$('chart-panel').classList.toggle('hidden',!chart);$('codex-tab').setAttribute('aria-selected',String(!chart));$('chart-tab').setAttribute('aria-selected',String(chart));if(chart)renderer.minimap($('large-chart'),game);};
  $('journal-logbook').onclick=()=>logbook(returnTo);$('codex-tab').onclick=()=>tab(false);$('chart-tab').onclick=()=>tab(true);$('close-journal').onclick=leave;tab(showChart);
}

function warpMenu(onArrive=null){
 const leave=()=>{closeModal();mode='playing';};mode='paused';let page=Math.floor(game.sector/24);
 openModal(`<div class="micro">開拓した海へ · 無料</div><h2 id="modal-title">ワープ航路</h2><p>一度到達した深度へ、鍵を集め直さず戻れます。</p><button class="primary" id="warp-home">200 m · 浅瀬のゲンさんへ</button><div id="warp-destinations" class="warp-list"></div><div class="catalog-pages"><button id="warp-prev" class="secondary">前の航路</button><span id="warp-page"></span><button id="warp-next" class="secondary">次の航路</button></div>`,leave);
 const go=level=>{game.warp(level);renderer.setWorld(game.map);leave();saveDive();updateHUD();notify('ワープ完了');if(typeof onArrive==='function'&&level===0)onArrive();};
 const draw=()=>{const pages=Math.ceil((game.maxSector+1)/24);page=Math.max(0,Math.min(page,pages-1));text('warp-page',`${page+1} / ${pages}`);$('warp-prev').disabled=page===0;$('warp-next').disabled=page===pages-1;$('warp-destinations').innerHTML=Array.from({length:Math.min(24,game.maxSector+1-page*24)},(_,n)=>{const i=page*24+n;return `<button class="secondary" data-warp="${i}" ${i===game.sector?'disabled':''}>${sectorInfo(i).depth.toLocaleString()} m</button>`;}).join('');for(const b of document.querySelectorAll('[data-warp]'))b.onclick=()=>go(Number(b.dataset.warp));};
 $('warp-home').onclick=()=>go(0);$('warp-prev').onclick=()=>{page--;draw();};$('warp-next').onclick=()=>{page++;draw();};draw();
}

function market(){
 if(game.sector!==0||dist(game.player,game.map.hub)>120){warpMenu(market);return;}
 mode='paused';const leave=()=>{closeModal();mode='playing';};
 const total=game.bag.reduce((n,v)=>n+v.price,0);
 openModal(`<div class="micro">浅瀬の桟橋 · 船大工ゲンさん</div><div class="merchant-heading"><img src="assets/gen.svg" alt="船大工ゲンさん"><h2 id="modal-title">「いい獲物、揚がったかい？」</h2></div><p>所持金 ${game.coins.toLocaleString()} G · 積み荷 ${game.bag.length}点 · 査定 ${total.toLocaleString()} G<br>重さと固有価値、希少度が高い獲物ほど高く買い取るよ。</p><button class="primary" id="sell-bag" ${total?'':'disabled'}>積み荷をまとめて売る</button><p id="market-status" aria-live="polite"></p><div class="upgrades">${[['engine','エンジン','移動速度 +10%'],['tank','酸素タンク','容量 +30秒'],['net','捕獲ネット','捕獲速度 +15%']].map(([id,name,note])=>`<button class="upgrade" data-buy="${id}" ${(game.shopLevels[id]||0)>=5||game.coins<300*2**(game.shopLevels[id]||0)?'disabled':''}><strong>${name}</strong><p>Lv.${game.shopLevels[id]||0}/5 · ${note}</p><small>${(game.shopLevels[id]||0)>=5?'強化完了':`${(300*2**(game.shopLevels[id]||0)).toLocaleString()} G`}</small></button>`).join('')}</div><p>${game.bag.slice(-8).map(v=>`${v.name} · ${v.grams.toLocaleString()} g · ${v.price.toLocaleString()} G`).join('<br>')||'捕まえた生き物をここへ持ち帰ろう。'}</p>`,leave);
 $('sell-bag').onclick=()=>{const sold=game.sell();saveDive();market();text('market-status',`${sold.toLocaleString()} Gで買い取りました。装備を選んで強化できます。`);};for(const b of document.querySelectorAll('[data-buy]'))b.onclick=()=>{const bought=game.buy(b.dataset.buy);saveDive();market();if(bought)text('market-status','強化が完了しました。次の探索から活躍するよ。');};
}
function ruinPuzzle(){
 mode='paused';holding=false;const leave=()=>{closeModal();mode='playing';};const symbols=['☀ 太陽','☾ 月','≈ 波'],order=game.map.puzzle;
 openModal(`<div class="micro">古代の潮流神殿 · 鍵なしでも開放できる別ルート</div><h2 id="modal-title">三つの紋章を順番に。</h2><p>碑文：「${symbols[order[0]]}は${symbols[order[1]]}より先。${symbols[order[2]]}は${symbols[order[1]]}より後。」<br>正しい順序で3つ押すと潜降口が開きます。間違えてもペナルティはありません。</p><p id="puzzle-input" aria-live="polite">紋章を選んでください。</p><div class="modal-actions">${symbols.map((v,i)=>`<button class="secondary" data-symbol="${i}">${v}</button>`).join('')}<button class="text-button" id="puzzle-hint">ヒントを見る</button></div><p id="puzzle-hint-text"></p>`,leave);
 $('puzzle-hint').onclick=()=>text('puzzle-hint-text',`順番は ${order.map(i=>symbols[i]).join(' → ')}。この順に押してみよう。`);
 let chosen=[];for(const b of document.querySelectorAll('[data-symbol]'))b.onclick=()=>{chosen.push(Number(b.dataset.symbol));text('puzzle-input',chosen.map(i=>symbols[i]).join(' → '));if(chosen.length===3){if(game.solve(chosen)){saveDive();leave();updateHUD();notify('神殿の封印を解除','潜降口が開きました。');}else{chosen=[];text('puzzle-input','もう一度。迷ったら「ヒントを見る」を押そう。');}}};
}

function transferMenu(returnTo=mode){
 if(mode==='playing')mode='paused';const leave=()=>{closeModal();mode=returnTo==='title'?'title':'playing';};
 openModal(`<div class="micro">署名付きセーブコード</div><h2 id="modal-title">別の端末へ引き継ぐ</h2><p>コードを保存し、別の端末のこの画面へ貼り付けます。コードの書き換えはサーバー署名で検出します。コードを知る人は記録を復元できます。</p><textarea id="save-code" aria-label="引継ぎコード" rows="5" spellcheck="false"></textarea><p id="transfer-status"></p><div class="modal-actions"><button class="primary" id="export-save">コードを作る</button><button class="secondary" id="copy-save">コピー</button><button class="secondary" id="import-save">検証して引き継ぐ</button></div>`,leave);
 const call=async body=>{if(!navigator.onLine)throw Error('通信に接続してから引継ぎコードを作成・検証してください。');const r=await fetch('/api/transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'引継ぎに失敗');return d;};
 $('export-save').onclick=async()=>{try{const source=returnTo==='title'?checkpoint:game.snapshot();if(!source)throw Error('先に潜航を始めてください。');const d=await call({action:'export',state:{v:1,dive:source,catalog}});$('save-code').value=d.code;text('transfer-status','コードを作成しました。安全な場所へ保存してください。');}catch(e){text('transfer-status',e.message);}};
 $('copy-save').onclick=async()=>{try{await navigator.clipboard.writeText($('save-code').value);text('transfer-status','コピーしました。');}catch{$('save-code').select();text('transfer-status','コードを選択しました。コピーしてください。');}};
 $('import-save').onclick=async()=>{try{const d=await call({action:'import',code:$('save-code').value.trim()});checkpoint=d.state.dive;catalog=Object.fromEntries(SPECIES.filter(f=>Number.isSafeInteger(d.state.catalog?.[f.id])&&d.state.catalog[f.id]>0).map(f=>[f.id,d.state.catalog[f.id]]));try{writeDive(localStorage,checkpoint);}catch{}save('null-tide-real-catalog-v4',catalog);leave();start();notify('引継ぎが完了しました');}catch(e){text('transfer-status',e.message);}};
}

function catchCard(event,first){
 const f=SPECIES[event.species];
 $('catch-art').innerHTML=fishSVG(event.species);$('catch-card').dataset.rank=f.rank;
 text('catch-kicker',first?'NEW SPECIES · 図鑑に登録':event.record?'PERSONAL BEST · 自己記録':'FIELD NOTES · 採集成功');
 text('catch-name',f.name);text('catch-details',`${'★'.repeat(f.rank)} · ${event.grams.toLocaleString()} g · ${event.price.toLocaleString()} G`);
 show('catch-card');catchTimer=first||f.rank>=4?5:3.5;
 if(first||f.rank>=4)audio.play('discovery');
}

function logbook(returnTo='playing'){
 const source=returnTo==='title'&&checkpoint?new Expedition(checkpoint.seed,{...checkpoint,known:Object.keys(catalog)}):game;
 if(mode==='playing')mode='paused';
 const leave=()=>{closeModal();mode=returnTo==='title'?'title':'playing';};
 const count=Object.keys(catalog).length,next=MILESTONES.find(m=>count<m.count),relicCount=Object.keys(source.relicRecords).length;
 openModal(`<div class="micro">NULL TIDE · 自分だけの航海記録</div><h2 id="modal-title">${collectionRank(count)}</h2>
 <div class="voyage-summary"><div><small>魚図鑑</small><strong>${count}<span> / ${SPECIES.length}</span></strong></div><div><small>最深到達</small><strong>${Math.max(deepest,sectorInfo(source.maxSector).depth).toLocaleString()}<span> m</span></strong></div><div><small>発見品</small><strong>${relicCount}<span> / ${RELICS.length}</span></strong></div></div>
 <div class="collection-track"><i style="width:${count/SPECIES.length*100}%"></i></div><p>${next?`次は${next.count}種で「${next.title}」 · 研究助成金 ${next.coins.toLocaleString()} G`:'全種の記録を達成しました。大洋のその先へ。'}</p>
 <div class="modal-actions"><button class="primary" id="share-record">航海の記録をシェア</button><button class="secondary" id="view-specimens">魚図鑑へ</button></div><p id="share-status" aria-live="polite"></p>
 <h3 class="section-caption">図鑑の達成報酬</h3><div class="milestones">${MILESTONES.map(m=>`<div class="milestone ${count>=m.count?'earned':''}"><span>${count>=m.count?'✓':'○'} ${m.count}種 · ${m.title}</span><b>${m.coins.toLocaleString()} G</b>${count>=m.count&&!source.claimedMilestones.includes(m.count)?`<button class="secondary" data-claim="${m.count}">受け取る</button>`:''}</div>`).join('')}</div>
 <h3 class="section-caption">海が残したもの · 発見品 ${relicCount}/${RELICS.length}</h3><p>沈船・調査地点から回収。売っても発見記録は残ります。深い海で新しい品が見つかります。</p><div class="relic-grid">${RELICS.map((r,i)=>`<article class="relic ${source.relicRecords[r.id]?'found':''}"><div>${relicSVG(r)}</div><small>${'★'.repeat(r.rank)} · ${sectorInfo(Math.floor(i/2)*4).name}</small><h3>${source.relicRecords[r.id]?r.name:'未発見の記憶'}</h3><p>${source.relicRecords[r.id]?r.note:'この海域の沈船や調査地点を探そう。'}</p></article>`).join('')}</div>`,leave);
 $('modal-content').classList.add('logbook-sheet');
 $('view-specimens').onclick=()=>journal(returnTo);
 for(const b of document.querySelectorAll('[data-claim]'))b.onclick=()=>{source.claimCollection(Number(b.dataset.claim));if(returnTo==='title'){checkpoint=source.snapshot();try{writeDive(localStorage,checkpoint);}catch{}}else saveDive();logbook(returnTo);};
 $('share-record').onclick=async()=>{const data={title:'深層の記録 — NULL TIDE',text:`「深層の記録」で魚図鑑 ${count}/${SPECIES.length}種、最深 ${Math.max(deepest,sectorInfo(source.maxSector).depth).toLocaleString()} mへ。${collectionRank(count)}として、次の海を探索中。`,url:'https://knutkning.vercel.app/'};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text}\n${data.url}`);text('share-status','記録とゲームのURLをコピーしました。');}}catch(e){if(e.name!=='AbortError')text('share-status','共有できませんでした。ゲームのURLをコピーして紹介できます。');}};
}

async function installGame(){
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();return;}
 const leave=()=>{closeModal();mode='playing';};
 openModal(`<div class="micro">いつでも、この海へ</div><h2 id="modal-title">ホーム画面から遊ぶ</h2><p>スマホのブラウザーのメニューから「ホーム画面に追加」または「アプリをインストール」を選べます。</p><p>${offlineReady?'オフライン起動の準備が完了しています。通信がなくても探索できます。':window.isSecureContext&&'serviceWorker' in navigator?'オフライン用データを準備しています。通信したまま少し待ち、次の起動からご利用ください。':'このブラウザーではオンラインで遊べます。対応ブラウザーで公開版を開くと、オフライン起動の準備ができます。'}データ引継ぎコードの作成・検証には通信が必要です。保存はこの端末のブラウザー内に残ります。</p><button class="primary" id="close-install">探索に戻る</button>`,leave);
 $('close-install').onclick=leave;
}

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('pagehide',()=>{if(mode!=='title')saveDive();});
if('serviceWorker' in navigator&&window.top===window.self&&!['terminal.local','localhost','127.0.0.1'].includes(location.hostname)){
 navigator.serviceWorker.register('/sw.js').then(reg=>{navigator.serviceWorker.ready.then(()=>{offlineReady=true;});waitingWorker=reg.waiting;reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){waitingWorker=worker;notify('新しい航海の準備ができました','メニューから更新版を読み込めます。',6);}});});}).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(waitingWorker){waitingWorker=null;location.reload();}});
}

function credits() {
  openModal(`
    <div class="micro">制作ノート</div>
    <h2 id="modal-title">この海の、出発点。</h2>
    <p>GitHub の小さな実験作を巡って生まれたゲームです。<br>音で探る遊び、暗闇の緊張感、短い探索の密度に着想をもらいました。</p>
    <div class="source-links">
      <a href="https://github.com/NomanT17/Echo-Pulse" target="_blank" rel="noreferrer">Echo Pulse ↗<small>ソナーで見えた景色が、また闇に消えていく。</small></a>
      <a href="https://github.com/js13kGames/fear-the-dark" target="_blank" rel="noreferrer">Fear the Dark ↗<small>光があること、それがなくなることの緊張感。</small></a>
      <a href="https://github.com/igamerx/DungeonOfCurse_JS13K_24" target="_blank" rel="noreferrer">Dungeon of Curse ↗<small>限られた時間のなかで、どこまで進むか。</small></a>
      <a href="https://github.com/tanuki276/knutKning" target="_blank" rel="noreferrer">NULL TIDE のソースコード ↗<small>実装・描画・音声はこのゲームのために制作しています。</small></a>
    </div>
    <div class="modal-actions"><button class="secondary" id="close-credits">タイトルに戻る</button></div>`, closeModal);
  $('close-credits').onclick = closeModal;
}

const upgrades = [
  { id: 'engine', icon: 'boost', name: '潮流エンジン', label: '移動速度 +12%（最大1.8倍）', description: 'もう少し速く、遠くまで。狭い場所では速度の出しすぎに注意。' },
  { id: 'sonar', icon: 'sonar', name: '広域アンテナ', label: '探知範囲 +15%（最大1.8倍）', description: '遠くの地形も見通せるソナー。音が届く範囲も広がります。' },
  { id: 'oxygen', icon: 'tank', name: '循環式タンク', label: '酸素の消費 −10%（最小40%）', description: '急がず、隅々まで探したいときに。長く潜れるようになります。' },
];

function upgradeScreen() {
  mode='upgrade';const next=sectorInfo(game.sector+1),first=game.sector+1>game.maxSector,benefit=depthBenefits(Math.max(game.maxSector,game.sector+1));
  const newKinds=availableSpecies(game.sector+1).filter(i=>!catalog[SPECIES[i].id]).length;
  openModal(`<div class="micro">さらに深い海へ · 図鑑 ${Object.keys(catalog).length} / ${SPECIES.length}</div>
    <h2 id="modal-title">水深 ${next.depth.toLocaleString()} m へ。</h2>
    <p>${next.name}で出会える未発見の魚：${newKinds} 種。<br>${first?`初到達の報酬 +${1000+(game.sector+1)*300} pt、装備を1つ強化。`:'開放済みの深度へ再訪（装備強化・初到達報酬は一度だけ）。'}<br>最大酸素 ${benefit.oxygen}秒 · 捕獲速度 ×${benefit.capture.toFixed(2)} · 捕獲報酬 ×${depthBenefits(game.sector+1).reward.toFixed(2)}</p>
    <div class="upgrades">${(first?upgrades:[{id:"return",icon:"arrow",name:"この海域へ移動",label:"再訪",description:"以前に集めた鍵と海図を引き継ぎます。"}]).map((u,i)=>`<button class="upgrade" data-upgrade="${u.id}" aria-keyshortcuts="${i+1}">${icon(u.icon)}<small>${u.label}</small><strong>${u.name}</strong><p>${u.description}</p></button>`).join('')}</div>
    <p class="micro">強化上限でも次へ進めます。図鑑完成後も、さらに深く潜れます。</p>`);
  for(const button of document.querySelectorAll('[data-upgrade]'))button.onclick=()=>{
    game.upgrade(button.dataset.upgrade);renderer.setWorld(game.map);closeModal();mode='playing';
    saveDive();audio.play('sector');updateHUD();notify(`水深 ${sectorInfo(game.sector).depth.toLocaleString()} m に到達`,'この深度に棲む、まだ見ぬ魚を探そう。',4);
  };
}
function completionScreen(){
  // A final catch can coincide with entering the descent hatch. Let the player
  // celebrate first and tap the hatch again instead of resuming a frozen upgrade.
  if(game.state==='upgrade'){game.state='playing';game.extraction=0;}
  mode='complete';saveDive();
  const leave=()=>{closeModal();if(game.state==='lost')start();else mode='playing';};
  openModal(`<div class="micro">魚図鑑 ${SPECIES.length} / ${SPECIES.length} · COMPLETE</div><h2 id="modal-title">深海の図鑑、完成！</h2><p>全${SPECIES.length.toLocaleString()}種類の魚に出会いました。<br>図鑑は保存済みです。この先の海にも、潜航は続きます。</p><div class="result-stats"><div><span class="micro">到達した深度</span><strong>${sectorInfo(game.sector).depth.toLocaleString()} m</strong></div><div><span class="micro">今回の捕獲</span><strong>${game.catches.length} 匹</strong></div></div><div class="modal-actions"><button class="primary" id="continue-deep">さらに探検する</button><button class="secondary" id="complete-book">完成した図鑑を見る</button></div>`,leave);
  $('continue-deep').onclick=leave;$('complete-book').onclick=()=>{if(game.state==='lost')start();journal('playing');};
}
function result(_won,reason){
  mode='lost';saveDive();if(game.score>best){best=game.score;save('null-tide-best',best);}
  openModal(`<div class="micro">潜航を中断 · 図鑑と深度は保存済み</div><h2 id="modal-title">基地から、もう一度。</h2><p>${reason}。<br>集めた魚図鑑は失われません。今の深度の基地から再開できます。</p><div class="result-stats"><div><span class="micro">到達深度</span><strong>${sectorInfo(game.sector).depth.toLocaleString()} m</strong></div><div><span class="micro">魚図鑑</span><strong>${Object.keys(catalog).length} / ${SPECIES.length}</strong></div></div><div class="modal-actions"><button class="primary" id="retry">この深度から再開</button><button class="secondary" id="result-title">タイトルへ</button></div>`);
  $('retry').onclick=()=>start();$('result-title').onclick=()=>{closeModal();toTitle();};
}

function processEvents() {
  let completed=false;
  for (const event of game.events.splice(0)) {
    audio.play(event.type);
    if (['shard', 'core', 'air', 'stun'].includes(event.type)) {
      renderer.burst(event.x, event.y, event.type === 'core' ? '#f7d5a0' : '#9ed9c1', event.type === 'core' ? 45 : 12);
    }
    if (event.type === 'core') {
      holding=false;saveDive();notify('潮流鍵を見つけた！','鍵1つで潜降口が開きました。点線をたどって戻ろう。',3);
    }
    if (event.type === 'catch') {
      netArmed=false;
      const species=SPECIES[event.species],first=!catalog[species.id];catalog[species.id]=(Number(catalog[species.id])||0)+1;save('null-tide-real-catalog-v4',catalog);saveDive();
      renderer.burst(event.x,event.y,species.color,25);
      catchCard(event,first);for(const m of MILESTONES)if(game.claimCollection(m.count))saveDive();
    }
    if(event.type==='milestone'){saveDive();notify(`図鑑 ${event.count}種達成 · ${event.title}`,`研究助成金 +${event.coins.toLocaleString()} G。浅瀬で潜水艇を強化しよう。`,6);}
    if(event.type==='research')notify('生態調査の依頼を達成！','+650 pt · 餌+2 · 酸素+40秒',4);
    if(event.type==='collection-complete')completed=true;
    if(event.type==='ruin')ruinPuzzle();
    if(event.type==='ascent'){holding=false;renderer.setWorld(game.map);saveDive();notify(`${sectorInfo(game.sector).depth.toLocaleString()} m へ上昇`,'鍵・海図・捕獲記録はそのままです');}
    if(event.type==='school'){holding=false;notify('新しい魚群を発見','未捕獲の魚を優先して探せます');saveDive();}
    if(event.type==='locked'){holding=false;notify('潜降口は閉じています','潮流鍵を1つ回収、または神殿の謎を解こう。金色の点線が鍵まで案内します。');}
    if(event.type==='site')holding=false;
    if(event.type==='site'&&event.relic){saveDive();const relic=RELICS.find(r=>r.id===event.relic);notify(`発見品：${relic.name}`,'航海記録に登録しました。積み荷は浅瀬で売却できます。',5);}
    if(event.type==='site'&&!event.relic)notify(event.kind==='wreck'?'沈船から物資を回収しました':'生態調査ポイントを記録しました',event.kind==='wreck'?'+350 pt · 餌+2 · 酸素+40秒 · 耐久+1':'+450 pt · 餌+2 · 酸素+40秒 · 周辺の海図を更新',4);
    if(event.type==='discovery')notify(`発見：${event.name}`,'新たな探索地点を海図に記録 · +100 pt',2.5);
    if (event.type === 'air') notify('酸素を補給しました', '+36秒。もう少し探索できます。', 2);
    if (event.type === 'hit') {
      renderer.shake = 12;
      notify('機体が損傷しています', mobile() ? '緊急加速で監視機から離れよう。' : 'Shift の緊急加速で、監視機から離れよう。', 2.5);
    }
    if (event.type === 'upgrade') upgradeScreen();
    if (event.type === 'lost') result(false, event.reason);
    if (event.type === 'won') completionScreen();
  }
  if(completed)completionScreen();
}

function updateHUD() {
  const p = game.player;
  const sector = sectorInfo(game.sector);
  const known=Object.keys(catalog).length;
  const available=availableSpecies(game.sector).filter(i=>!catalog[SPECIES[i].id]).length;
  text('sector-label',`${mobile()?'':'水深 '}${sector.depth.toLocaleString()} m`);text('sector-name',sector.name);
  const objective=`${icon('fish')}<span>魚図鑑</span><b>${known} / ${SPECIES.length}</b>`;
  if($('objective').innerHTML!==objective)$('objective').innerHTML=objective;
  $('objective').setAttribute('aria-label',`魚図鑑 ${known} / ${SPECIES.length} を開く`);
  $('objective').classList.toggle('complete',known===SPECIES.length);
  const health = Array.from({ length: game.maxHp }, (_, i) => `<i class="${i >= p.hp ? 'empty' : ''}"></i>`).join('');
  if ($('health').innerHTML !== health) $('health').innerHTML = health;
  $('health').setAttribute('aria-label', `機体の耐久 ${p.hp} / ${game.maxHp}`);
  text('score', game.score.toLocaleString());
  text('oxygen-value', formatTime(p.oxygen));
  $('oxygen-bar').style.width = `${Math.max(0, p.oxygen / game.maxOxygen * 100)}%`;
  $('oxygen-value').closest('.oxygen').classList.toggle('low', p.oxygen < 40);
  text('depth-label', `水深 ${sector.depth.toLocaleString()} m`);
  text('time', formatTime(game.elapsed, true));
  for (const [id, cooldown, maximum] of [['pulse', p.pulse, 4.8], ['dash', p.dash, 2.4], ['net', game.netCooldown, 1.5], ['bait', game.baitCooldown, 2]]) {
    $(id).disabled = (id!=='net'&&cooldown>0) || (id==='bait'&&game.baitCount===0);
    const status=id==='bait'?`残り ${game.baitCount} 個`:cooldown>0?`${cooldown.toFixed(1)} 秒`:id==='net'?(netArmed?'網を構え中':'タップで開始'):'使用可能';
    text(`${id}-status`, mobile()&&id==='bait'?String(game.baitCount):mobile()&&id==='net'&&netArmed?'ON':status);
    $(id).dataset.cooling=String(cooldown>0);
    if(id!=='net')$(id).setAttribute('aria-label',`${id==='bait'?'餌をまく':id==='pulse'?'ソナー':'緊急加速'} · ${status}`);
    $(`${id}-fill`).style.width = `${(1 - cooldown / maximum) * 100}%`;
  }
  text('survey-progress',available?`この深度の未発見 ${available} 種 · 図鑑を見る`:'この深度は収集済み · さらに深く潜ろう');
  $('net').setAttribute('aria-pressed',String(netArmed));$('net').classList.toggle('armed',netArmed);text('net-label',netArmed?'捕獲中':'捕獲');
  $('net').setAttribute('aria-label',netArmed?'捕獲中 · タップで解除':'魚を捕獲する');
  const fish=game.closestFish();
  if(fish){show('fish-hint');text('fish-hint', `${SPECIES[fish.species].name} · ${fish.alert>.2?'驚いています。餌で落ち着かせよう':netArmed?'静かに近づこう':mobile()?'捕獲をタップ':'F で捕獲を開始'}`);}else hide('fish-hint');
  if(game.catchProgress>0){$('net-fill').style.width=`${game.catchProgress*100}%`;text('net-status',`${mobile()?'':'捕獲中 '}${Math.round(game.catchProgress*100)}%`);}
  const near = game.near();
  text('gate-status',game.unlocked()?'潜降 OK':'鍵 0/1');
  if ((['core','wreck','survey','descent','ascent','ruin'].includes(near?.kind)||(near?.kind==='base'&&game.map.fish.some(f=>f.caught)))) {
    show('interact');
    text('interact-label',near.kind==='ruin'?'古代神殿を調べる':near.kind==='ascent'?`${sectorInfo(game.sector-1).depth.toLocaleString()} m へ上昇`:near.kind==='base'?(game.schoolCooldown>0?'魚群を探索中…':'新しい魚群を探す'):near.kind==='descent'?(game.unlocked()?`${sectorInfo(game.sector+1).depth.toLocaleString()} m へ潜る`:'鍵1つで開放 · 海図を開こう'):holding?'調査中…':near.kind==='core'?'潮流鍵を回収':near.kind==='wreck'?'物資を回収':'周囲を調査');
    $('interact-progress').style.width = `${(['core','wreck','survey'].includes(near.kind)?near.target.progress:near.kind==='descent'?Math.max(0,game.extraction/.3):0) * 100}%`;
  } else {
    hide('interact');
    holding = false;
  }
  renderer.netArmed=netArmed;
  const firstFish=game.discovered.size===0?game.closestFish():null;
  const target=firstFish||game.objectiveTarget();
  const nextLabel=firstFish?'捕獲を押して、最初の1匹':game.unlocked()?'潜降口へ戻ろう':'潮流鍵を1つ探そう';
  const angle=Math.atan2(target.y-p.y,target.x-p.x);
  const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(angle/(Math.PI/4))+8)%8];
  text('route-goal',`${arrow} 次へ：${nextLabel}`);
  text('route-distance',`${Math.round(dist(p,target)/6)} m`);
  $('waypoint').classList.remove('waypoint-needed');
  if(near?.kind==='base'&&(!fish||p.oxygen<game.maxOxygen-5)){show('fish-hint');text('fish-hint','基地で酸素・耐久を補給中');}
  if ($('map-toggle').getAttribute('aria-expanded') === 'true') renderer.minimap($('minimap'), game);
}

function updateSound() {
  $('sound').innerHTML = `${icon(audio.enabled ? 'sound-on' : 'sound-off')}<span>${audio.enabled ? '音あり' : '音なし'}</span>`;
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  $('sound').setAttribute('aria-label', audio.enabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
}

$('start').onclick = () => start();
$('fresh-start').onclick = () => start(true);
$('fullscreen').onclick=enterFullscreen;
$('rotate-fullscreen').onclick=enterFullscreen;
$('journal').onclick = () => journal();
$('survey-progress').onclick = () => journal();
$('title-logbook').onclick=()=>logbook('title');$('catch-card').onclick=()=>{hide('catch-card');journal();};$('title-help').onclick = () => help('title');$('title-transfer').onclick=()=>transferMenu('title');
$('help').onclick = () => { if (['title', 'playing', 'paused'].includes(mode)) help(); };
$('credits').onclick = credits;
$('sound').onclick = () => {
  audio.init();
  audio.toggle();
  updateSound();
  save('null-tide-sound', audio.enabled);
};
$('map-toggle').onclick = () => {
  setMapExpanded($('map-toggle').getAttribute('aria-expanded') !== 'true');
  if (mode === 'playing') updateHUD();
};

const canPlay = () => mode === 'playing' && !portrait();
bindGameAction($('net'), toggleNet, canPlay);
bindGameAction($('dash'), dash, canPlay);
bindGameAction($('pause'), pause, canPlay);
bindGameAction($('objective'), () => journal(), canPlay);
bindGameAction($('route-help'), () => help('playing'), canPlay);
bindGameAction($('gate-status'), () => journal(mode,true), canPlay);
bindGameAction($('pulse'), () => {pulse();setToolsExpanded(false);}, canPlay);
bindGameAction($('bait'), () => {game.bait();updateHUD();setToolsExpanded(false);}, canPlay);
bindGameAction($('interact-button'), () => {holding=true;updateHUD();}, canPlay);
bindGameAction($('tools-toggle'), () => setToolsExpanded($('tools-toggle').getAttribute('aria-expanded')!=='true'), canPlay);
thumbStick = bindThumbStick($('movement-zone'), $('joystick'), $('joystick-knob'), vector => {touch=vector;}, canPlay);

document.addEventListener('keydown', e => {
  if (!$('modal').classList.contains('hidden')) {
    if (e.code === 'Tab') {
      const items = [...$('modal-content').querySelectorAll('button,a,input,select,textarea')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    if (e.code === 'Escape' && modalClose) { e.preventDefault(); modalClose(); }
    if (mode === 'upgrade' && /^Digit[123]$/.test(e.code)) {
      document.querySelectorAll('[data-upgrade]')[Number(e.code.at(-1)) - 1]?.click();
    }
    return;
  }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyF', 'KeyQ', 'KeyJ'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { pause(); return; }
  if(e.code==='KeyJ'&&!e.repeat&&['title','playing'].includes(mode)){journal();return;}
  const focusedControl = document.activeElement?.closest('button,a,input,select,textarea');
  if (mode === 'title' && e.code === 'Enter' && (!focusedControl || focusedControl.id === 'start')) {
    e.preventDefault();
    start();
    return;
  }
  if (mode !== 'playing'||portrait()) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') pulse();
  if(e.code==='KeyQ'){game.bait();updateHUD();}
  if(e.code==='KeyF')toggleNet();
  if(e.code==='KeyE'){holding=true;updateHUD();}
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dash();
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { clearInput(); if (mode === 'playing') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if(mode!=='title')saveDive();clearInput(); if (mode === 'playing') pause(); }
});
window.addEventListener('resize',()=>{needsRender=true;renderer.resize();syncViewport();thumbStick.relayout();});
document.addEventListener('fullscreenchange',()=>{needsRender=true;renderer.resize();syncViewport();});

function frame(ms) {
  const dt = Math.min(0.05, (ms - previous) / 1000 || 0);
  previous = ms;
  performanceFrames++;
  if (ms - performanceStart > 1000) {
    $('ocean').dataset.fps = String(Math.round(performanceFrames * 1000 / (ms - performanceStart)));
    performanceFrames = 0;
    performanceStart = ms;
  }
  if (mode === 'playing'&&!portrait()) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      game.tick(1 / 60, input());
      accumulator -= 1 / 60;
    }
    processEvents();autosaveTimer+=dt;if(autosaveTimer>=15){saveDive();autosaveTimer=0;}
    hudTime += dt;
    if (hudTime > 0.1) { updateHUD(); hudTime = 0; }
  } else accumulator = 0;
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) hide('toast');
  }
  if(catchTimer>0){catchTimer-=dt;if(catchTimer<=0)hide('catch-card');}
  // Menus retain a still frame instead of repainting a full-resolution scene behind blur.
  if(mode==='playing'&&!portrait()||needsRender&&mode!=='title'){renderer.render(game,ms/1000,dt);needsRender=false;}
  requestAnimationFrame(frame);
}
syncViewport();
requestAnimationFrame(frame);
