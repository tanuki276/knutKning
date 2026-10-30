import { Expedition, SECTORS, dist } from './world.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const hide = id => $(id).classList.add('hidden');
const show = id => $(id).classList.remove('hidden');
const icon = name => `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
const mobile = () => matchMedia('(max-width: 600px)').matches;
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
let game = new Expedition(271828);
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
  text('best-title', best ? `自己ベスト ${best.toLocaleString()} pt` : '');
}

function clearInput() {
  keys.clear();
  touch = { x: 0, y: 0 };
  holding = false;
  $('joystick-knob').style.transform = '';
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
  $('modal-content').innerHTML = `${onClose ? '<button class="dialog-close" id="dialog-close" aria-label="閉じる">×</button>' : ''}${html}`;
  if (onClose) $('dialog-close').onclick = onClose;
  show('modal');
  clearInput();
  for (const id of ['header', 'title-screen', 'hud', 'title-footer']) $(id).inert = true;
  requestAnimationFrame(() => $('modal-content').querySelector('button,a,input')?.focus());
}

function closeModal() {
  hide('modal');
  modalClose = null;
  for (const id of ['header', 'title-screen', 'hud', 'title-footer']) $(id).inert = false;
  const focusTarget = oldFocus?.isConnected ? oldFocus : mode === 'title' ? $('start') : $('pause');
  focusTarget?.focus({ preventScroll: true });
  clearInput();
}

function setMapExpanded(expanded) {
  $('map-content').classList.toggle('hidden', !expanded);
  $('map-toggle').setAttribute('aria-expanded', String(expanded));
  text('map-symbol', expanded ? '−' : '+');
}

function start() {
  audio.init();
  audio.play('sector');
  game = new Expedition(crypto.getRandomValues(new Uint32Array(1))[0]);
  renderer.setWorld(game.map);
  mode = 'playing';
  for (const id of ['title-screen', 'title-depth', 'title-footer']) hide(id);
  show('hud');
  show('pause');
  document.body.classList.add('playing');
  closeModal();
  setMapExpanded(!mobile());
  updateHUD();
  notify('まずは、3つの記録を探そう', mobile()
    ? '左のスティックで移動。ソナーで周囲を照らせます。'
    : 'WASD で移動、Space でソナー。回収後は中央の帰還点へ。', 5);
}

function input() {
  return {
    x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x,
    y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y,
    interact: keys.has('KeyE') || holding,
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
}

function pause() {
  if (mode !== 'playing') return;
  mode = 'paused';
  openModal(`
    <div class="micro">一時停止</div>
    <h2 id="modal-title">ひと休み。</h2>
    <p>潜航を止めています。酸素も減らないので、ごゆっくり。</p>
    <div class="modal-actions">
      <button class="primary" id="resume">${icon('play')}潜航を続ける</button>
      <button class="secondary" id="pause-help">あそびかた</button>
      <button class="text-button" id="abandon">タイトルへ戻る</button>
    </div>`, resume);
  $('resume').onclick = resume;
  $('pause-help').onclick = () => help('paused');
  $('abandon').onclick = () => { closeModal(); toTitle(); };
}

function resume() {
  closeModal();
  mode = 'playing';
}

function toTitle() {
  mode = 'title';
  game = new Expedition(271828);
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
    <h2 id="modal-title">探して、集めて、持ち帰る。</h2>
    <p>海底にある<b>3つの記録</b>を集めたら、中央の帰還点へ。<br>全3海域を探索して、沈んだ街の記憶を持ち帰ろう。</p>
    <div class="controls-grid">
      <div class="control"><kbd>W A S D</kbd><kbd>↑ ← ↓ →</kbd> 移動<small>機体には少し慣性があります。曲がる手前でゆっくりと。</small></div>
      <div class="control"><kbd>Space</kbd> ソナー<small>暗闇が一時的に見えるように。ただし、その音を聞いた監視機も近づいてきます。</small></div>
      <div class="control"><kbd>Shift</kbd> 緊急加速<small>加速中は無敵。ぶつかった監視機をしばらく止められます。</small></div>
      <div class="control"><kbd>E</kbd> 長押しで回収・帰還<small>記録の近くで長押し。3つそろったら、中央の帰還点でも同じ操作を。</small></div>
      <div class="control"><kbd>Esc</kbd> 休憩<small>いつでも一時停止できます。画面を離れたときも自動で停止。</small></div>
      <div class="control">スマホで遊ぶとき<small>左のスティックで移動、右のボタンでソナー・加速。記録の回収ボタンは長押しです。</small></div>
    </div>
    <p class="manual-tip">かけらを拾うと +75 pt、酸素 +3秒。補給装置は酸素 +36秒。<br>次の海域では機体と酸素が全回復し、強化をひとつ選べます。</p>
    <label class="quality-toggle"><input type="checkbox" id="reduce" ${renderer.reduced ? 'checked' : ''}> 画面の揺れ・環境の動きを抑える</label>
    <div class="modal-actions"><button class="primary" id="close-help">${icon('arrow')}${returnTo === 'title' ? 'タイトルに戻る' : '潜航を続ける'}</button></div>`, leave);
  $('reduce').onchange = e => {
    renderer.reduced = e.target.checked;
    document.body.classList.toggle('reduce-motion', renderer.reduced);
    save('null-tide-reduced', renderer.reduced);
  };
  $('close-help').onclick = leave;
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
  { id: 'engine', icon: 'boost', name: '潮流エンジン', label: '移動速度 +18%', description: 'もう少し速く、遠くまで。狭い場所では速度の出しすぎに注意。' },
  { id: 'sonar', icon: 'sonar', name: '広域アンテナ', label: '探知範囲 +25%', description: '遠くの地形も見通せるソナー。音が届く範囲も広がります。' },
  { id: 'oxygen', icon: 'tank', name: '循環式タンク', label: '酸素の消費 −24%', description: '急がず、隅々まで探したいときに。長く潜れるようになります。' },
];

function upgradeScreen() {
  mode = 'upgrade';
  const sector = SECTORS[game.sector];
  const next = SECTORS[game.sector + 1];
  openModal(`
    <div class="micro">海域 ${game.sector + 1} / 3 · 記録をすべて回収</div>
    <h2 id="modal-title">${sector.name}の記憶</h2>
    <p class="lead">${sector.log}</p>
    <p>機体と酸素が全回復しました。<br>次の海域へ向かう前に、装備をひとつ選ぼう。</p>
    <div class="upgrades">${upgrades.map((u, i) => `
      <button class="upgrade" data-upgrade="${u.id}" aria-keyshortcuts="${i + 1}">
        ${icon(u.icon)}<small>${u.label}</small><strong>${u.name}</strong><p>${u.description}</p>
      </button>`).join('')}</div>
    <p class="micro">次の海域：${next.name} · 水深 ${next.depth.toLocaleString()} m</p>`);
  for (const button of document.querySelectorAll('[data-upgrade]')) {
    button.onclick = () => {
      game.upgrade(button.dataset.upgrade);
      renderer.setWorld(game.map);
      closeModal();
      mode = 'playing';
      audio.play('sector');
      updateHUD();
      notify(`次の海域 — ${SECTORS[game.sector].name}`, '監視機が増えています。加速を使って、うまくかわそう。', 4);
    };
  }
}

function result(won, reason) {
  mode = won ? 'won' : 'lost';
  const isBest = game.score > best;
  if (isBest) {
    best = game.score;
    save('null-tide-best', best);
  }
  const rank = won ? game.hits === 0 ? 'S' : game.hits < 5 ? 'A' : 'B' : '—';
  openModal(`
    <div class="micro">${won ? '全3海域 · 探索完了' : '潜航終了'}</div>
    <h2 id="modal-title">${won ? 'おかえりなさい。' : '通信が途絶えました。'}</h2>
    <p class="lead">${won ? SECTORS[2].log : `${reason}。\n記録は、また次の潜航で。`}</p>
    <div class="result-stats">
      <div><span class="micro">スコア</span><strong>${game.score.toLocaleString()}</strong></div>
      <div><span class="micro">回収した記録</span><strong>${game.recovered} / 9</strong></div>
      <div><span class="micro">潜航時間</span><strong>${formatTime(game.elapsed, true)}</strong></div>
      <div><span class="micro">評価</span><strong>${rank}</strong></div>
    </div>
    <p>${isBest ? '自己ベストを更新！' : `自己ベスト ${best.toLocaleString()} pt`}<br>ソナー ${game.pings} 回 · 被弾 ${game.hits} 回</p>
    <div class="modal-actions">
      <button class="primary" id="retry">${icon('play')}もう一度、潜る</button>
      <button class="secondary" id="result-title">タイトルに戻る</button>
    </div>`);
  $('retry').onclick = start;
  $('result-title').onclick = () => { closeModal(); toTitle(); };
}

function processEvents() {
  for (const event of game.events.splice(0)) {
    audio.play(event.type);
    if (['shard', 'core', 'air', 'stun'].includes(event.type)) {
      renderer.burst(event.x, event.y, event.type === 'core' ? '#f7d5a0' : '#9ed9c1', event.type === 'core' ? 45 : 12);
    }
    if (event.type === 'core') {
      const all = game.map.cores.every(core => core.done);
      notify(all ? '3つの記録がそろいました！' : '記録を回収しました', all
        ? mobile() ? '中央の帰還点へ。帰還ボタンを長押ししよう。' : '中央の帰還点へ戻り、E を長押ししよう。'
        : '+500 pt · 酸素 +15秒', 4);
    }
    if (event.type === 'air') notify('酸素を補給しました', '+36秒。もう少し探索できます。', 2);
    if (event.type === 'hit') {
      renderer.shake = 12;
      notify('機体が損傷しています', mobile() ? '緊急加速で監視機から離れよう。' : 'Shift の緊急加速で、監視機から離れよう。', 2.5);
    }
    if (event.type === 'upgrade') upgradeScreen();
    if (event.type === 'lost') result(false, event.reason);
    if (event.type === 'won') result(true);
  }
}

function updateHUD() {
  const p = game.player;
  const sector = SECTORS[game.sector];
  const count = game.map.cores.filter(core => core.done).length;
  text('sector-label', `海域 ${game.sector + 1} / 3`);
  text('sector-name', sector.name);
  const objective = count === 3 ? '帰還点へ戻る <b>□</b>' : `記録を集める <b>${count} / 3</b>`;
  if ($('objective').innerHTML !== objective) $('objective').innerHTML = objective;
  $('objective').classList.toggle('complete', count === 3);
  const health = Array.from({ length: game.maxHp }, (_, i) => `<i class="${i >= p.hp ? 'empty' : ''}"></i>`).join('');
  if ($('health').innerHTML !== health) $('health').innerHTML = health;
  $('health').setAttribute('aria-label', `機体の耐久 ${p.hp} / ${game.maxHp}`);
  text('score', game.score.toLocaleString());
  text('oxygen-value', formatTime(p.oxygen));
  $('oxygen-bar').style.width = `${Math.max(0, p.oxygen / 210 * 100)}%`;
  $('oxygen-value').closest('.oxygen').classList.toggle('low', p.oxygen < 40);
  text('depth-label', `水深 ${sector.depth.toLocaleString()} m`);
  text('time', formatTime(game.elapsed, true));
  for (const [id, cooldown, maximum] of [['pulse', p.pulse, 4.8], ['dash', p.dash, 2.4]]) {
    $(id).disabled = cooldown > 0;
    text(`${id}-status`, cooldown > 0 ? `${cooldown.toFixed(1)} 秒` : '使用可能');
    $(`${id}-fill`).style.width = `${(1 - cooldown / maximum) * 100}%`;
  }
  const near = game.near();
  if (near?.kind === 'core' || (near?.kind === 'exit' && count === 3)) {
    show('interact');
    text('interact-label', near.kind === 'core' ? '長押しで記録を回収' : '長押しで帰還する');
    $('interact-progress').style.width = `${(near.kind === 'core' ? near.target.progress : game.extraction / 1.2) * 100}%`;
  } else {
    hide('interact');
    holding = false;
  }
  const target = count === 3 ? game.map.hub : game.map.cores
    .filter(core => !core.done).sort((a, b) => dist(a, p) - dist(b, p))[0];
  if (target) {
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    const arrow = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    $('waypoint').innerHTML = `<span class="direction">${arrow}</span>${count === 3 ? '帰還点' : '記録の信号'}<b>${Math.round(dist(p, target) / 6)} m</b>`;
  }
  if ($('map-toggle').getAttribute('aria-expanded') === 'true') renderer.minimap($('minimap'), game);
}

function updateSound() {
  $('sound').innerHTML = `${icon(audio.enabled ? 'sound-on' : 'sound-off')}<span>${audio.enabled ? '音あり' : '音なし'}</span>`;
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  $('sound').setAttribute('aria-label', audio.enabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
}

$('start').onclick = start;
$('title-help').onclick = () => help('title');
$('pulse').onclick = pulse;
$('dash').onclick = dash;
$('pause').onclick = pause;
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

$('interact-button').addEventListener('pointerdown', e => {
  if (mode !== 'playing') return;
  e.preventDefault();
  holding = true;
  e.currentTarget.setPointerCapture(e.pointerId);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  $('interact-button').addEventListener(type, () => { holding = false; });
}

let stickId = null;
let stickCenter = null;
const stick = $('joystick');
function moveStick(e) {
  if (e.pointerId !== stickId) return;
  const dx = e.clientX - stickCenter.x;
  const dy = e.clientY - stickCenter.y;
  const length = Math.hypot(dx, dy);
  const radius = 36;
  touch = { x: length < 5 ? 0 : dx / Math.max(radius, length), y: length < 5 ? 0 : dy / Math.max(radius, length) };
  $('joystick-knob').style.transform = `translate(${touch.x * radius}px, ${touch.y * radius}px)`;
}
stick.addEventListener('pointerdown', e => {
  if (mode !== 'playing') return;
  e.preventDefault();
  stickId = e.pointerId;
  const rect = stick.getBoundingClientRect();
  stickCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener('pointermove', moveStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  stick.addEventListener(type, () => {
    stickId = null;
    touch = { x: 0, y: 0 };
    $('joystick-knob').style.transform = '';
  });
}

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
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { pause(); return; }
  const focusedControl = document.activeElement?.closest('button,a,input');
  if (mode === 'title' && e.code === 'Enter' && (!focusedControl || focusedControl.id === 'start')) {
    e.preventDefault();
    start();
    return;
  }
  if (mode !== 'playing') return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') pulse();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dash();
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { clearInput(); if (mode === 'playing') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInput(); if (mode === 'playing') pause(); }
});
window.addEventListener('resize', () => renderer.resize());

function frame(ms) {
  const dt = Math.min(0.05, (ms - previous) / 1000 || 0);
  previous = ms;
  performanceFrames++;
  if (ms - performanceStart > 1000) {
    $('ocean').dataset.fps = String(Math.round(performanceFrames * 1000 / (ms - performanceStart)));
    performanceFrames = 0;
    performanceStart = ms;
  }
  if (mode === 'playing') {
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
requestAnimationFrame(frame);
