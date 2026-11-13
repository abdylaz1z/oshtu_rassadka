import { firebaseConfig } from './config.js';

const $ = id => document.getElementById(id);
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const LBL = {1:'Ректорат',2:'ИМТИ',3:'ИМТИ',4:'ИМТИ',5:'ИМТИ',6:'ИМТИ',7:'ЭФ',8:'ИМТИ',9:'ЭФ',10:'ЭФ',11:'ФЭУ',12:'ФЭУ',13:'ФАИС',14:'ФАИС',15:'ФАИС',16:'ФАИС',17:'Микс',18:'ЖК',19:'ЖК',20:'ЖК',21:'ФТИП',22:'ФТИП',23:'ФТИП',24:'ФТИП',25:'Коллеж',26:'Коллеж',27:'ИМОПИО',28:'ИМОПИО',30:'ИМОПИО'};
const defCap = n => n === 18 ? 14 : n <= 17 ? (n % 2 === 0 ? 14 : 12) : (n % 2 === 0 ? 12 : 14);
// положение стола на схеме: [строка, колонка]
const pos = n => {
  if (n === 1) return [1, 1];
  if (n <= 17) return [1 + Math.floor(n / 2), n % 2 === 0 ? 1 : 2];
  const m = n - 18; return [1 + Math.floor(m / 2), m % 2 === 0 ? 4 : 5];
};

let D = {};          // данные из базы: { t12: {cap, extra, s:{0:true}} }
let cur = null;      // открытый стол
let store;

const get = n => {
  const d = D['t' + n] || {};
  return { id: n, cap: d.cap ?? defCap(n), extra: !!d.extra, s: d.s || {}, label: LBL[n] || '' };
};
const cnt = t => { let c = 0; for (let i = 0; i < t.cap; i++) if (t.s[i] === true) c++; return c; };
const isFull = t => t.cap > 0 && cnt(t) === t.cap;
const ids = () => {
  const a = []; for (let n = 1; n <= 33; n++) a.push(n);
  Object.keys(D).forEach(k => { const n = +k.slice(1); if (n > 33) a.push(n); });
  return a.sort((x, y) => x - y);
};
const status = (t, c = '') => { const e = $('st'); e.textContent = t; e.className = 'st ' + c; };
const run = p => Promise.resolve(p).catch(() => status('Не удалось сохранить. Проверьте правила базы.', 'bad'));

/* ---------- Хранилища ---------- */
async function firebaseStore() {
  const { initializeApp } = await import(FB + 'firebase-app.js');
  const m = await import(FB + 'firebase-database.js');
  const app = initializeApp(firebaseConfig);
  const db = m.getDatabase(app);
  if (firebaseConfig.anonymousAuth) {
    const a = await import(FB + 'firebase-auth.js');
    await a.signInAnonymously(a.getAuth(app));
  }
  const r = p => m.ref(db, p);
  return {
    sub: (cb, err) => m.onValue(r('tables'), s => cb(s.val() || {}), err),
    seat: (id, i, v) => m.set(r(`tables/t${id}/s/${i}`), v ? true : null),
    cap: (id, n, drop) => { const u = { cap: n }; if (drop != null) u['s/' + drop] = null; return m.update(r(`tables/t${id}`), u); },
    fill: (id, cap, v) => { const u = {}; for (let i = 0; i < cap; i++) u[i] = v ? true : null; return m.update(r(`tables/t${id}/s`), u); },
    add: id => m.set(r(`tables/t${id}`), { cap: 12, extra: true }),
    del: id => m.remove(r(`tables/t${id}`)),
  };
}

function localStore() {
  const K = 'students-day-seating-v2';
  let d = {}; try { d = JSON.parse(localStorage.getItem(K)) || {}; } catch {}
  let cb = () => {};
  const save = () => { try { localStorage.setItem(K, JSON.stringify(d)); } catch {} cb(d); };
  addEventListener('storage', e => { if (e.key === K) { try { d = JSON.parse(e.newValue) || {}; } catch {} cb(d); } });
  const t = id => (d['t' + id] ??= { s: {} });
  return {
    sub: f => { cb = f; f(d); },
    seat: (id, i, v) => { const x = t(id); x.s ??= {}; v ? x.s[i] = true : delete x.s[i]; save(); },
    cap: (id, n, drop) => { const x = t(id); x.cap = n; if (drop != null && x.s) delete x.s[drop]; save(); },
    fill: (id, cap, v) => { const x = t(id); x.s = {}; if (v) for (let i = 0; i < cap; i++) x.s[i] = true; save(); },
    add: id => { d['t' + id] = { cap: 12, extra: true, s: {} }; save(); },
    del: id => { delete d['t' + id]; save(); },
  };
}

/* ---------- Схема зала ---------- */
function card(n) {
  const t = get(n), c = cnt(t), b = document.createElement('button');
  b.className = 't' + (isFull(t) ? ' full' : '');
  b.style.setProperty('--p', t.cap ? c / t.cap * 100 : 0);
  b.innerHTML = '<span class="in"><span class="n"></span><span class="c"></span><span class="g"></span></span>';
  b.querySelector('.n').textContent = n;
  b.querySelector('.c').textContent = c + '/' + t.cap;
  b.querySelector('.g').textContent = t.label;
  b.setAttribute('aria-label', `Стол ${n}, сели ${c} из ${t.cap}` + (isFull(t) ? ', заполнен' : ''));
  if (!t.extra) { const p = pos(n); b.style.gridRow = p[0]; b.style.gridColumn = p[1]; }
  b.onclick = () => openT(n, b);
  return b;
}

function render() {
  const map = $('map'), ex = $('extra');
  map.innerHTML = ''; ex.innerHTML = '';
  let seated = 0, total = 0, full = 0, extra = 0;
  const a = ids();
  a.forEach(n => {
    const t = get(n); seated += cnt(t); total += t.cap; if (isFull(t)) full++;
    if (t.extra) { ex.appendChild(card(n)); extra++; } else map.appendChild(card(n));
  });
  $('exw').hidden = !extra;
  $('s1').textContent = seated + '/' + total;
  $('s2').textContent = full + '/' + a.length;
}

/* ---------- Окно стола ---------- */
const chairPos = (i, cap, r) => { const a = 360 / cap * i; return `rotate(${a}deg) translateY(${-r}px) rotate(${-a}deg)`; };

function openT(n, from) {
  cur = n;
  const ov = $('ov'); ov.hidden = false; ov.classList.remove('closing');
  $('orbit').innerHTML = '';
  syncM(true);
  // откуда «вылетает» стол: из центра нажатой карточки
  if (from) {
    const a = from.getBoundingClientRect(), b = $('mid').getBoundingClientRect();
    ov.style.setProperty('--fx', (a.left + a.width / 2 - (b.left + b.width / 2)) + 'px');
    ov.style.setProperty('--fy', (a.top + a.height / 2 - (b.top + b.height / 2)) + 'px');
  }
  // перезапуск анимаций
  ['fit', 'orbit'].forEach(id => { const e = $(id); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; });
  const ring = document.querySelector('.ring'); ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = '';
  $('cl').focus();
}
function closeT() {
  const ov = $('ov'); if (ov.hidden || ov.classList.contains('closing')) return;
  ov.classList.add('closing');
  setTimeout(() => { ov.hidden = true; ov.classList.remove('closing'); cur = null; }, 280);
}

function syncM(first) {
  if (cur === null || $('ov').hidden) return;
  const t = get(cur), c = cnt(t), orbit = $('orbit');
  const r = Math.max(104, Math.round(t.cap * 8.2)), size = 2 * r + 70;
  const mid = $('mid'), avail = Math.min(mid.clientWidth - 16, mid.clientHeight - 8) || size;
  const sc = Math.min(1, avail / size);
  const fit = $('fit'), stage = $('stage');
  fit.style.width = fit.style.height = size * sc + 'px';
  stage.style.width = stage.style.height = size + 'px';
  stage.style.transform = `scale(${sc})`;

  while (orbit.children.length > t.cap) orbit.lastChild.remove();
  while (orbit.children.length < t.cap) {
    const i = orbit.children.length;
    const ch = document.createElement('div'); ch.className = 'ch';
    const ci = document.createElement('div'); ci.className = 'ci';
    const cc = document.createElement('button'); cc.className = 'cc';
    cc.style.setProperty('--d', (first ? 0.25 + i * 0.035 : 0) + 's');
    cc.onclick = () => { const on = get(cur).s[i] === true; run(store.seat(cur, i, !on)); };
    ci.appendChild(cc); ch.appendChild(ci); orbit.appendChild(ch);
  }
  [...orbit.children].forEach((ch, i) => {
    ch.style.transform = chairPos(i, t.cap, r);
    const cc = ch.querySelector('.cc'), on = t.s[i] === true;
    cc.classList.toggle('on', on);
    cc.textContent = on ? '✓' : i + 1;
    cc.setAttribute('aria-pressed', on);
    cc.setAttribute('aria-label', `Стул ${i + 1}` + (on ? ', сел' : ', свободен'));
  });

  $('mt').textContent = 'Стол ' + cur;
  $('mg').textContent = t.label;
  $('tn').textContent = cur;
  $('tc').textContent = c + '/' + t.cap;
  $('tb').classList.toggle('full', isFull(t));
  const b = $('mb'); b.textContent = isFull(t) ? 'Заполнен' : `${c} из ${t.cap}`;
  b.className = 'badge' + (isFull(t) ? ' full' : '');
  $('del').hidden = !t.extra;
}

$('cl').onclick = closeT;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeT(); });
$('mid').onclick = e => { if (e.target === $('mid')) closeT(); };
$('plus').onclick = () => run(store.cap(cur, get(cur).cap + 1));
$('minus').onclick = () => { const c = get(cur).cap; if (c > 1) run(store.cap(cur, c - 1, c - 1)); };
$('all').onclick = () => run(store.fill(cur, get(cur).cap, true));
$('none').onclick = () => run(store.fill(cur, get(cur).cap, false));
$('del').onclick = () => { if (!confirm('Удалить этот стол?')) return; const id = cur; closeT(); run(store.del(id)); };
$('add').onclick = async () => {
  const id = Math.max(...ids()) + 1;
  await run(store.add(id));
  openT(id, $('add'));
};
addEventListener('resize', () => syncM());

/* ---------- Запуск ---------- */
function onData(data) {
  D = data || {};
  render();
  syncM();
}

(async () => {
  render();
  try {
    if (firebaseConfig.databaseURL) {
      store = await firebaseStore();
      const t = setTimeout(() => status('Нет связи с базой. Проверьте интернет и config.js.', 'bad'), 10000);
      store.sub(d => { clearTimeout(t); onData(d); status('● Данные общие и сохраняются', 'good'); },
                () => status('Ошибка чтения базы. Проверьте правила.', 'bad'));
    } else {
      store = localStore();
      store.sub(onData);
      status('Локальный режим: данные только в этом браузере (заполните config.js)', 'bad');
    }
  } catch (e) {
    store = localStore();
    store.sub(onData);
    status('Не удалось подключить базу — локальный режим', 'bad');
  }
})();
