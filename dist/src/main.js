import { Expedition, sectorInfo, availableSpecies, dist } from './world.js';
import { SPECIES, fishSVG } from './species.js';
import { Renderer } from './render.js';
import { bindGameAction, bindThumbStick, portraitViewport } from './controls.js';
import { AudioEngine } from './audio.js';

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
let catalog = read('null-tide-catalog', {});
if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') catalog = {};
catalog = Object.fromEntries(SPECIES.filter(f => Number.isSafeInteger(catalog[f.id]) && catalog[f.id] > 0).map(f => [f.id, catalog[f.id]]));
let checkpoint = read('null-tide-dive-v3', null);
if(!checkpoint||checkpoint.version!==3||!Number.isSafeInteger(checkpoint.seed)||!Number.isSafeInteger(checkpoint.sector)||checkpoint.sector<0||checkpoint.sector>1000000)checkpoint=null;
let deepest = Number(read('null-tide-deepest',200))||200;
let game = new Expedition(271828,{known:Object.keys(catalog)});
let mode = 'title';
let previous = 0;
let accumulator = 0;
let hudTime = 0;
let toastTimer = 0;
let oldFocus = null;
let modalClose = null;
let keys = new Set();
let touch = { x: 0, y: 0 };
let holding = false;
let netArmed = false;
let thumbStick = null;
let performanceFrames = 0;
let performanceStart = 0;

renderer.setWorld(game.map);
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
  oldFocus = document.activeElement;
  modalClose = onClose;
  $('modal-content').classList.remove('journal-sheet');
  $('modal-content').innerHTML = `${onClose ? '<button class="dialog-close" id="dialog-close" aria-label="閉じる">×</button>' : ''}${html}`;
  if (onClose) $('dialog-close').onclick = onClose;
  show('modal');
  clearInput();
  syncViewport();
  requestAnimationFrame(() => $('modal-content').querySelector('button,a,input')?.focus());
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
  checkpoint=game.snapshot();save('null-tide-dive-v3',checkpoint);
  deepest=Math.max(deepest,sectorInfo(game.sector).depth);save('null-tide-deepest',deepest);
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
  for(const id of ['header','title-screen','title-depth','hud','title-footer'])$(id).inert=rotate||!$('modal').classList.contains('hidden');
  $('modal').inert=rotate;
  if(rotate)clearInput();
}
function start(fresh=false) {
  audio.init();audio.play('sector');
  if(mobile()&&window.top===window.self)enterFullscreen();
  const source=!fresh&&checkpoint?checkpoint:null;
  game=new Expedition(source?.seed??crypto.getRandomValues(new Uint32Array(1))[0],{...source,known:Object.keys(catalog)});
  renderer.setWorld(game.map);mode='playing';
  for(const id of ['title-screen','title-depth','title-footer'])hide(id);
  show('hud');show('pause');document.body.classList.add('playing');closeModal();
  setMapExpanded(!mobile());saveDive();updateHUD();
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
      <button class="secondary" id="pause-journal">図鑑・海図</button><button class="secondary" id="pause-help">あそびかた</button>
      <button class="secondary" id="pause-fullscreen">全画面</button><button class="secondary" id="pause-sound">サウンド切替</button>
      <button class="text-button" id="abandon">タイトルへ戻る</button>
    </div>`, resume);
  $('resume').onclick = resume;
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
  game = new Expedition(271828,{known:Object.keys(catalog)});
  renderer.setWorld(game.map);
  for (const id of ['title-screen', 'title-depth', 'title-footer']) show(id);
  hide('hud');
  hide('pause');
  hide('toast');
  document.body.classList.remove('playing');
  updateBest();
  clearInput();
}

function help(returnTo = mode) {
  if (mode === 'playing') mode = 'paused';
  const leave = () => { closeModal(); mode = returnTo === 'title' ? 'title' : 'playing'; };
  openModal(`
    <div class="micro">あそびかた</div>
    <h2 id="modal-title">深く潜って、魚図鑑を完成させる。</h2>
    <p>浅瀬から深淵まで、全<b>24種類</b>の生きものを集めよう。<br>潜降口から300mずつ深く潜れます。記録回収は任意の寄り道です。</p>
    <div class="controls-grid">
      <div class="control"><kbd>W A S D</kbd><kbd>↑ ← ↓ →</kbd> 移動<small>機体には少し慣性があります。曲がる手前でゆっくりと。</small></div>
      <div class="control"><kbd>Space</kbd> ソナー<small>暗闇が一時的に見えるように。ただし、その音を聞いた監視機も近づいてきます。</small></div>
      <div class="control"><kbd>Shift</kbd> 緊急加速<small>加速中は無敵。ぶつかった監視機をしばらく止められます。</small></div>
      <div class="control"><kbd>E</kbd> 調べる・さらに深く潜る<small>潜降口や沈船の近くで1回押すだけ。スマホは画面下に現れるボタンをタップ。</small></div>
      <div class="control"><kbd>F</kbd> 捕獲のオン・オフ<small>1回タップすると網を構え、近くの魚を自動で捕獲。1匹捕まえると解除されます。長押しは不要です。</small></div>
      <div class="control"><kbd>Q</kbd> 餌をまく<small>周囲の魚を14秒間おびき寄せます。沈船や調査点で餌を補充できます。</small></div>
      <div class="control"><kbd>J</kbd> 図鑑・大きな海図<small>捕まえた生きものは潜航を終えても図鑑に残ります。海図はソナーと移動で埋まります。</small></div>
      <div class="control"><kbd>Esc</kbd> 休憩<small>いつでも一時停止できます。画面を離れたときも自動で停止。</small></div>
      <div class="control">スマホで遊ぶとき<small>横向きで遊びます。左下をドラッグしたまま、右指で捕獲・加速をタップできます。餌・ソナーは「道具」から。左上の魚マークで図鑑、右上のメニューで休憩・設定。</small></div>
    </div>
    <p class="manual-tip">中央の調査基地は酸素と耐久を何度でも回復できます。<br>1海域で魚を3匹捕まえると調査依頼達成：+650 pt、餌+2、酸素+40秒。<br>潜降口では装備を強化して次の深度へ。図鑑と到達した深度は自動保存され、基地から続けられます。</p>
    <label class="quality-toggle"><input type="checkbox" id="reduce" ${renderer.reduced ? 'checked' : ''}> 画面の揺れ・環境の動きを抑える</label>
    <div class="modal-actions"><button class="primary" id="close-help">${icon('arrow')}${returnTo === 'title' ? 'タイトルに戻る' : '潜航を続ける'}</button></div>`, leave);
  $('reduce').onchange = e => {
    renderer.reduced = e.target.checked;
    document.body.classList.toggle('reduce-motion', renderer.reduced);
    save('null-tide-reduced', renderer.reduced);
  };
  $('close-help').onclick = leave;
}

function journal(returnTo = mode) {
  if (mode === 'playing') mode = 'paused';
  const leave = () => { closeModal(); mode = returnTo === 'title' ? 'title' : 'playing'; };
  const known = SPECIES.filter(f => catalog[f.id] > 0).length;
  openModal(`
    <div class="micro">${returnTo==='title'?'調査ノート · 記録は自動保存':'調査ノート · 潜航は一時停止中'}</div>
    <h2 id="modal-title">この海で、出会ったもの。</h2>
    <p>${sectorInfo(game.sector).name} · 水深 ${sectorInfo(game.sector).depth.toLocaleString()} m<br>この深度にいる未発見の生きもの：${availableSpecies(game.sector).filter(i=>!catalog[SPECIES[i].id]).length} 種</p>
    <div class="journal-tabs" role="tablist"><button id="codex-tab" role="tab" aria-selected="true">魚図鑑 ${known} / ${SPECIES.length}</button><button id="chart-tab" role="tab" aria-selected="false">海図・探索</button></div>
    <div id="codex-panel" role="tabpanel" aria-labelledby="codex-tab"><p>この海だけに棲む生きものたち。捕獲した記録は、次の潜航にも残ります。</p><div class="codex-grid">${SPECIES.map((f,i) => `<article class="specimen ${catalog[f.id]?'known':'unknown'}"><div class="specimen-art">${fishSVG(i)}</div><small>${catalog[f.id]?f.rarity:'未発見'} · No.${String(i+1).padStart(2,'0')}</small><h3>${catalog[f.id]?f.name:'？？？'}</h3><p>${catalog[f.id]?f.note:`水深 ${f.minDepth.toLocaleString()} m から出会えます。深く潜って探そう。`}</p><b>${catalog[f.id]?`${catalog[f.id]} 匹を記録`:`生息深度 ${f.minDepth.toLocaleString()} m〜`}</b></article>`).join('')}</div></div>
    <div id="chart-panel" class="hidden" role="tabpanel" aria-labelledby="chart-tab"><p>${sectorInfo(game.sector).name} · 探索 ${game.exploration()}% · ${game.map.rooms.filter(r=>r.visited).length} / ${game.map.rooms.length} 地点<br>黄：次の深度への潜降口 / 紫：沈船・調査点 / □：補給基地</p><canvas id="large-chart" width="738" height="534" aria-label="現在の海域の大きな海図"></canvas><p>暗い場所は未探索です。ソナーを使うと周囲の地形が海図に残ります。<br>今回の潜航：捕獲 ${game.catches.length} 匹 · サルベージ・調査 ${game.salvaged} 箇所</p></div>
    <div class="modal-actions"><button class="primary" id="close-journal">${icon('arrow')}${returnTo==='title'?'タイトルへ':'潜航を続ける'}</button></div>`, leave);
  $('modal-content').classList.add('journal-sheet');
  const tab = chart => {
    $('codex-panel').classList.toggle('hidden', chart); $('chart-panel').classList.toggle('hidden', !chart);
    $('codex-tab').setAttribute('aria-selected', String(!chart)); $('chart-tab').setAttribute('aria-selected', String(chart));
    if(chart) renderer.minimap($('large-chart'),game);
  };
  for(const id of ['codex-tab','chart-tab'])$(id).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const chart=e.key==='End'||(e.key!=='Home'&&id==='codex-tab');tab(chart);$(chart?'chart-tab':'codex-tab').focus();}};
  $('codex-tab').onclick=()=>tab(false); $('chart-tab').onclick=()=>tab(true); $('close-journal').onclick=leave;
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
  mode='upgrade';const next=sectorInfo(game.sector+1);
  const newKinds=availableSpecies(game.sector+1).filter(i=>!catalog[SPECIES[i].id]).length;
  openModal(`<div class="micro">さらに深い海へ · 図鑑 ${Object.keys(catalog).length} / ${SPECIES.length}</div>
    <h2 id="modal-title">水深 ${next.depth.toLocaleString()} m へ。</h2>
    <p>${next.name}で出会える未発見の魚：${newKinds} 種。<br>装備を選ぶと潜降します。酸素・耐久・餌は補給されます。</p>
    <div class="upgrades">${upgrades.map((u,i)=>`<button class="upgrade" data-upgrade="${u.id}" aria-keyshortcuts="${i+1}">${icon(u.icon)}<small>${u.label}</small><strong>${u.name}</strong><p>${u.description}</p></button>`).join('')}</div>
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
  openModal(`<div class="micro">魚図鑑 ${SPECIES.length} / ${SPECIES.length} · COMPLETE</div><h2 id="modal-title">深海の図鑑、完成！</h2><p>全24種類の生きものに出会いました。<br>図鑑は保存済みです。この先の海にも、潜航は続きます。</p><div class="result-stats"><div><span class="micro">到達した深度</span><strong>${sectorInfo(game.sector).depth.toLocaleString()} m</strong></div><div><span class="micro">今回の捕獲</span><strong>${game.catches.length} 匹</strong></div></div><div class="modal-actions"><button class="primary" id="continue-deep">さらに探検する</button><button class="secondary" id="complete-book">完成した図鑑を見る</button></div>`,leave);
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
      holding=false;notify('遺跡の記録を回収しました','寄り道の報酬 +500 pt · 酸素+15秒',3);
    }
    if (event.type === 'catch') {
      netArmed=false;
      const species=SPECIES[event.species],first=!catalog[species.id];catalog[species.id]=(Number(catalog[species.id])||0)+1;save('null-tide-catalog',catalog);saveDive();
      renderer.burst(event.x,event.y,species.color,25);
      notify(`${first?'新種を図鑑に登録！ ':''}${species.name}を捕獲`, `+${species.value} pt · この海域の捕獲 ${game.fishCount} 匹`,3);
    }
    if(event.type==='research')notify('生態調査の依頼を達成！','+650 pt · 餌+2 · 酸素+40秒',4);
    if(event.type==='collection-complete')completed=true;
    if(event.type==='site')holding=false;
    if(event.type==='site')notify(event.kind==='wreck'?'沈船から物資を回収しました':'生態調査ポイントを記録しました',event.kind==='wreck'?'+350 pt · 餌+2 · 酸素+40秒 · 耐久+1':'+450 pt · 餌+2 · 酸素+40秒 · 周辺の海図を更新',4);
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
  if (['core','wreck','survey','descent'].includes(near?.kind)) {
    show('interact');
    text('interact-label', near.kind==='descent'?(mobile()?`${sectorInfo(game.sector+1).depth.toLocaleString()} m へ潜る`:`さらに深く潜る（${sectorInfo(game.sector+1).depth.toLocaleString()} m）`):holding?'調査中…':near.kind==='wreck'?'物資を回収する':near.kind==='survey'?'周囲を調査する':'遺跡を調べる');
    $('interact-progress').style.width = `${(near.kind!=='descent'?near.target.progress:game.extraction/.3) * 100}%`;
  } else {
    hide('interact');
    holding = false;
  }
  const target=game.map.descent;
  $('waypoint').classList.toggle('waypoint-needed',dist(p,target)>450);
  const angle=Math.atan2(target.y-p.y,target.x-p.x);
  const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(angle/(Math.PI/4))+8)%8];
  $('waypoint').innerHTML=`<span class="direction">${arrow}</span>潜降口<b>${Math.round(dist(p,target)/6)} m</b>`;
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
$('title-help').onclick = () => help('title');
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
bindGameAction($('pulse'), () => {pulse();setToolsExpanded(false);}, canPlay);
bindGameAction($('bait'), () => {game.bait();updateHUD();setToolsExpanded(false);}, canPlay);
bindGameAction($('interact-button'), () => {holding=true;updateHUD();}, canPlay);
bindGameAction($('tools-toggle'), () => setToolsExpanded($('tools-toggle').getAttribute('aria-expanded')!=='true'), canPlay);
thumbStick = bindThumbStick($('movement-zone'), $('joystick'), $('joystick-knob'), vector => {touch=vector;}, canPlay);

document.addEventListener('keydown', e => {
  if (!$('modal').classList.contains('hidden')) {
    if (e.code === 'Tab') {
      const items = [...$('modal-content').querySelectorAll('button,a,input')];
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
  const focusedControl = document.activeElement?.closest('button,a,input');
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
  if (document.hidden) { clearInput(); if (mode === 'playing') pause(); }
});
window.addEventListener('resize',()=>{renderer.resize();syncViewport();thumbStick.relayout();});
document.addEventListener('fullscreenchange',()=>{renderer.resize();syncViewport();});

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
    processEvents();
    hudTime += dt;
    if (hudTime > 0.1) { updateHUD(); hudTime = 0; }
  } else accumulator = 0;
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) hide('toast');
  }
  // The title uses its own illustrated cover; don't repaint an obscured world.
  if (mode !== 'title') renderer.render(game, ms / 1000, dt);
  requestAnimationFrame(frame);
}
syncViewport();
requestAnimationFrame(frame);
