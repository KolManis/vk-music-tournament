// Турнир треков ВК. Запускать в консоли (F12) на странице vk.com/audios (vk.ru/audios...)
(async () => {
  document.getElementById('kh-root')?.remove();

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const log = (...a) => console.log('[KH]', ...a);

  // Отслеживаем медиа-элементы плеера ВК, чтобы знать, играет ли звук, и уметь ставить на паузу
  const media = window.__khMedia || (window.__khMedia = new Set());
  if (!window.__khPatched) {
    window.__khPatched = true;
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__khMedia.add(this); return orig.apply(this, arguments); };
  }
  const allMedia = () => [...media, ...document.querySelectorAll('audio, video')];
  const isPlaying = () => allMedia().some(m => !m.paused && !m.ended);
  const active = () => allMedia().find(m => !m.paused && !m.ended) || allMedia().find(m => m.currentTime > 0 && !m.ended);
  const fmt = x => isFinite(x) ? `${x / 60 | 0}:${String(x % 60 | 0).padStart(2, '0')}` : '0:00';
  const pauseAll = () => allMedia().forEach(m => { try { m.pause(); } catch {} });

  // --- UI ---
  const root = document.createElement('div');
  root.id = 'kh-root';
  root.innerHTML = `<style>
    #kh-root{--acc:#7c5cff;--acc2:#ff4d8d;--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);
      position:fixed;inset:0;z-index:2147483000;background:#0b0b12;color:#fff;font:15px/1.4 Inter,-apple-system,Segoe UI,Roboto,sans-serif;overflow:auto}
    #kh-root *{box-sizing:border-box}
    #kh-root,#kh-root h1,#kh-root div,#kh-root span,#kh-root li,#kh-root b,#kh-root kbd{color:#fff !important}
    #kh-root .pbtn span{color:#111 !important}
    #kh-bg{position:fixed;inset:-60px;background:center/cover no-repeat;filter:blur(60px) saturate(1.4) brightness(.45);transition:background-image .6s;z-index:0}
    #kh-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(124,92,255,.25),transparent 60%),linear-gradient(180deg,rgba(11,11,18,.3),#0b0b12 95%)}
    #kh-wrap{position:relative;z-index:1;min-height:100%;display:flex;flex-direction:column;align-items:center;padding:28px 24px 32px}
    #kh-main{width:100%;display:flex;flex-direction:column;align-items:center}
    #kh-root .label{font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.55;font-weight:600}
    #kh-root h1{font-size:30px;margin:6px 0 4px;text-align:center;font-weight:800;letter-spacing:-.01em}
    #kh-root .sub{opacity:.6;margin-bottom:14px;text-align:center}
    #kh-root .bar{width:100%;max-width:1100px;height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:28px;overflow:hidden}
    #kh-root .bar>div{height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:2px;transition:width .3s}
    #kh-root .pair{display:flex;gap:28px;align-items:stretch;justify-content:center;width:100%;max-width:1100px;position:relative}
    #kh-root .vs{align-self:center;flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:20px;font-style:italic;
      background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 0 40px rgba(255,77,141,.45);margin:0 -14px;z-index:2}
    #kh-root .card{flex:1 1 0;min-width:0;max-width:500px;background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--line);border-radius:28px;padding:20px;
      display:flex;flex-direction:column;gap:16px;transition:transform .25s,box-shadow .25s,border-color .25s,opacity .25s}
    #kh-root .card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.5)}
    #kh-root .card.on{border-color:rgba(124,92,255,.8);box-shadow:0 0 0 1px rgba(124,92,255,.5),0 20px 70px rgba(124,92,255,.35)}
    #kh-root .card.chosen{transform:scale(1.04);border-color:#3ddc97;box-shadow:0 0 60px rgba(61,220,151,.5)}
    #kh-root .card.lost{opacity:.25;transform:scale(.94)}
    #kh-root .card.gold{border-color:#f5c542;box-shadow:0 0 80px rgba(245,197,66,.35);max-width:440px}
    #kh-root .cover{position:relative;width:100%;aspect-ratio:1;max-height:52vh;border-radius:20px;background:linear-gradient(135deg,#2a2440,#1a2238) center/cover no-repeat;
      display:grid;place-items:center;font-size:90px;cursor:pointer;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.45)}
    #kh-root .pbtn{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.35);opacity:0;transition:opacity .2s}
    #kh-root .cover:hover .pbtn,#kh-root .card.on .pbtn{opacity:1}
    #kh-root .card.on .pbtn{background:rgba(0,0,0,.2)}
    #kh-root .pbtn span{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;font-size:32px;background:rgba(255,255,255,.92);color:#111;
      box-shadow:0 10px 30px rgba(0,0,0,.4);transition:transform .15s}
    #kh-root .cover:hover .pbtn span{transform:scale(1.08)}
    #kh-root .eq{position:absolute;left:14px;bottom:14px;display:flex;gap:3px;align-items:flex-end;height:22px}
    #kh-root .eq i{width:4px;background:#fff;border-radius:2px;animation:kh-eq .9s ease-in-out infinite}
    #kh-root .eq i:nth-child(2){animation-delay:-.3s}#kh-root .eq i:nth-child(3){animation-delay:-.6s}#kh-root .eq i:nth-child(4){animation-delay:-.15s}
    @keyframes kh-eq{0%,100%{height:5px}50%{height:22px}}
    #kh-root .t{font-weight:800;font-size:24px;line-height:1.2;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    #kh-root .a{opacity:.65;font-size:16px;margin-top:4px;overflow-wrap:anywhere}
    #kh-root .seek{display:flex;align-items:center;gap:10px;font-size:12px;font-variant-numeric:tabular-nums;opacity:.9}
    #kh-root .seek input{flex:1;min-width:0;accent-color:var(--acc);height:4px;cursor:pointer}
    #kh-root button{border:0;border-radius:14px;padding:12px 16px;font:inherit;cursor:pointer;color:#fff;background:rgba(255,255,255,.1);transition:filter .15s,transform .1s}
    #kh-root button:hover{filter:brightness(1.25)}
    #kh-root button:active{transform:scale(.97)}
    #kh-root .seek button{padding:6px 10px;font-size:12px;border-radius:10px}
    #kh-root .win{margin-top:auto;padding:16px;font-size:17px;font-weight:700;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 10px 30px rgba(124,92,255,.35)}
    #kh-root kbd{font:600 12px/1 inherit;padding:3px 7px;border-radius:6px;background:rgba(255,255,255,.2);margin-left:8px}
    #kh-root .hint{margin-top:22px;opacity:.45;font-size:13px;text-align:center}
    #kh-root .top{position:fixed;top:16px;right:20px;z-index:3;border-radius:50%;width:42px;height:42px;padding:0}
    #kh-root ol{max-width:640px;width:100%;padding:0;margin:8px 0 24px;list-style:none;counter-reset:n}
    #kh-root li{counter-increment:n;display:flex;gap:14px;align-items:center;padding:10px 14px;border-radius:14px;background:var(--card);margin-bottom:8px}
    #kh-root li::before{content:counter(n);width:28px;text-align:center;font-weight:800;opacity:.5}
    #kh-root li img,#kh-root li .ph{width:44px;height:44px;border-radius:10px;object-fit:cover;background:#2a2440;flex:none}
    #kh-root li .w{margin-left:auto;opacity:.5;font-size:13px;white-space:nowrap}
    #kh-root .spin{width:48px;height:48px;border-radius:50%;border:4px solid rgba(255,255,255,.1);border-top-color:var(--acc);animation:kh-spin 1s linear infinite;margin:40px auto 20px}
    @keyframes kh-spin{to{transform:rotate(360deg)}}
    #kh-root .msg{min-height:20px;color:#ff8a80 !important;text-align:center;margin-top:12px}
    @media (max-width:640px){#kh-root .pair{gap:10px}#kh-root .vs{width:40px;height:40px;font-size:14px;margin:0 -12px}#kh-root .card{padding:10px;border-radius:18px;gap:10px}
      #kh-root .t{font-size:16px}#kh-root .a{font-size:13px}#kh-root .pbtn span{width:56px;height:56px;font-size:22px}#kh-root .win{font-size:14px;padding:12px}#kh-root kbd{display:none}}
  </style><div id="kh-bg"></div><button class="top" id="kh-close" title="Закрыть">✕</button>
  <div id="kh-wrap"><div id="kh-main"></div><div class="msg" id="kh-msg"></div></div>`;
  document.body.appendChild(root);
  const main = root.querySelector('#kh-main');
  const msg = t => root.querySelector('#kh-msg').textContent = t || '';
  const bgEl = root.querySelector('#kh-bg');
  const onKey = e => window.__khKey?.(e);
  document.removeEventListener('keydown', window.__khKeyL || (() => {}), true);
  window.__khKeyL = onKey;
  document.addEventListener('keydown', onKey, true);
  root.querySelector('#kh-close').onclick = () => { pauseAll(); root.remove(); document.removeEventListener('keydown', onKey, true); };
  const status = (h, s = '') => main.innerHTML = `<div class="spin"></div><div class="label" style="text-align:center">Турнир треков</div><h1>${h}</h1><div class="sub">${s}</div>`;
  const big = u => (u || '').replace(/([?&](?:size|cs)=)\d+x\d+/g, '$1600x600');

  // --- Сбор треков (список виртуальный — собираем по ходу прокрутки) ---
  const ROW = '[data-testid="MusicTrackRow"]';
  const byId = new Map();
  const bgUrl = el => (el?.style.backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1] || '';
  const rowInfo = row => ({
    title: row.querySelector('[data-testid="MusicTrackRow_Title"]')?.textContent.trim() || '',
    artist: row.querySelector('[data-testid="MusicTrackRow_Authors"]')?.textContent.trim() || '',
  });
  // Обложки: пропускаем размытые заглушки ленивой загрузки (data:, blob:), из srcset берём самый большой вариант
  const sizeOf = u => +((u || '').match(/[?&](?:size|cs)=(\d+)x/) || [])[1] || 0;
  const coverScore = u => !u ? 0 : /^(data|blob):/.test(u) ? 1 : 2 + sizeOf(u);
  const bestImg = row => {
    const urls = [];
    for (const img of row.querySelectorAll('img')) {
      for (const part of (img.srcset || '').split(',')) {
        const [u, w] = part.trim().split(/\s+/);
        if (u) urls.push({ u, w: parseFloat(w) || 0 });
      }
      if (img.currentSrc) urls.push({ u: img.currentSrc, w: img.naturalWidth });
      if (img.src) urls.push({ u: img.src, w: img.naturalWidth });
    }
    for (const el of row.querySelectorAll('[style*="background-image"]')) urls.push({ u: bgUrl(el), w: 0 });
    const ok = urls.filter(x => x.u && !/^(data|blob):/.test(x.u));
    ok.sort((a, b) => (b.w || sizeOf(b.u)) - (a.w || sizeOf(a.u)));
    return ok[0]?.u || urls[0]?.u || '';
  };
  // Проверяем, отдаёт ли ВК обложку в 600x600; если нет — берём исходную
  const hiRes = new Map();
  const probe = t => {
    if (!t.cover || hiRes.has(t.cover)) return;
    const u = big(t.cover);
    hiRes.set(t.cover, t.cover);
    if (u === t.cover) return;
    const im = new Image();
    im.onload = () => {
      if (im.naturalWidth >= 200) {
        hiRes.set(t.cover, u);
        document.querySelectorAll(`#kh-root [data-cover="${CSS.escape(t.cover)}"]`).forEach(el => el.style.backgroundImage = `url('${u}')`);
      }
    };
    im.src = u;
  };
  const harvest = () => {
    for (const row of document.querySelectorAll(ROW)) {
      if (row.closest('.vkuiHorizontalScroll__host')) continue; // блоки рекомендаций
      const { title, artist } = rowInfo(row);
      if (!title) continue;
      const idEl = row.closest('[data-audio-id]') || row.querySelector('[data-audio-id]');
      const id = idEl?.getAttribute('data-audio-id') || `${artist}—${title}`.toLowerCase();
      const cover = bestImg(row);
      const old = byId.get(id);
      if (old) { if (cover && coverScore(cover) > coverScore(old.cover)) old.cover = cover; continue; }
      byId.set(id, { id, title, artist, cover, y: row.getBoundingClientRect().top + scrollY, wins: 0 });
    }
  };
  status('Собираю треки…', 'Прокручиваю список до конца. Не трогай страницу и не переключай вкладку.');
  let last = -1, stable = 0;
  while (stable < 20) {
    harvest();
    window.scrollBy(0, innerHeight * 0.8);
    await sleep(500);
    harvest();
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 10;
    if (atBottom && byId.size === last) {
      // подгрузка срабатывает, когда низ списка появляется на экране — дёргаем прокрутку вверх-вниз
      stable++;
      window.scrollBy(0, -innerHeight * 1.5);
      await sleep(400);
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(900 + stable * 100);
      harvest();
      if (byId.size !== last) stable = 0;
    } else if (byId.size !== last) { stable = 0; }
    last = byId.size;
    status('Собираю треки…', `Найдено: ${byId.size}${stable ? ` · жду подгрузку (${stable}/20)…` : ''}`);
  }
  window.scrollTo(0, 0);
  const tracks = [...byId.values()];
  log(`Собрано треков: ${tracks.length}, высота страницы: ${document.documentElement.scrollHeight}`);
  if (tracks.length < 2) { status('Не нашёл треки 😕', 'Пришли мне скрин консоли.'); return; }

  // --- Воспроизведение через плеер ВК ---
  const findRow = t => {
    const holder = t.id.includes('_') && document.querySelector(`[data-audio-id="${CSS.escape(t.id)}"]`);
    if (holder) {
      const r = holder.matches(ROW) ? holder : holder.querySelector(ROW) || holder.closest(ROW);
      if (r) return r;
    }
    return [...document.querySelectorAll(ROW)].find(r => {
      const i = rowInfo(r);
      return i.title === t.title && i.artist === t.artist && !r.closest('.vkuiHorizontalScroll__host');
    });
  };
  const realClick = el => {
    const { left, top, width, height } = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, view: window, clientX: left + width / 2, clientY: top + height / 2, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerover', o));
    el.dispatchEvent(new MouseEvent('mouseover', o));
    el.dispatchEvent(new PointerEvent('pointerdown', { ...o, pointerId: 1, isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', { ...o, pointerId: 1, isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  };
  let playing = null;
  const startTrack = async t => {
    let row = findRow(t);
    if (!row) { // строка выгружена из DOM — прокручиваем к ней под оверлеем
      window.scrollTo(0, Math.max(0, t.y - innerHeight / 2));
      for (let i = 0; i < 25 && !(row = findRow(t)); i++) await sleep(150);
    }
    if (!row) { msg('Не нашёл этот трек на странице ВК'); log('row not found', t); return false; }
    row.scrollIntoView({ block: 'center' });
    await sleep(150);
    const ctrl = row.querySelector('[data-testid="MusicTrackRow_PlaybackControls"]');
    const candidates = [
      ctrl?.querySelector('button'), ctrl, row.querySelector('[data-testid="audiorow-tappable"]'),
      row.querySelector('[data-testid="MusicTrackRow_Title"]'), row,
    ].filter(Boolean);
    pauseAll();
    for (const el of candidates) {
      realClick(el);
      for (let i = 0; i < 8; i++) { await sleep(150); if (isPlaying()) { log('играет, клик по', el); return true; } }
    }
    log('не запустилось. Кандидаты:', candidates, 'Строка:', row.outerHTML.slice(0, 2500));
    msg('Звук не запустился 😕 Пришли мне то, что в консоли после [KH].');
    return false;
  };
  const toggle = async t => {
    msg('');
    if (playing === t && isPlaying()) { pauseAll(); playing = null; }
    else if (await startTrack(t)) playing = t;
    render();
  };

  // --- Турнир на выбывание: раунд = все пары, победители идут дальше ---
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let round, roundNo, next, idx, eliminated, done, totalMatches;
  const startRound = list => {
    round = list; next = []; idx = 0; roundNo++;
    if (round.length % 2) next.push(round.pop()); // нечётный — проходит без боя
  };
  const reset = () => {
    tracks.forEach(t => t.wins = 0);
    roundNo = 0; eliminated = []; done = 0; totalMatches = tracks.length - 1;
    startRound(shuffle(tracks.slice()));
    render();
  };

  let busy = false;
  function pick(side) {
    if (busy) return;
    busy = true;
    pauseAll(); playing = null; msg('');
    const cards = main.querySelectorAll('.card');
    cards[side]?.classList.add('chosen');
    cards[1 - side]?.classList.add('lost');
    setTimeout(() => {
      busy = false;
      const a = round[idx], b = round[idx + 1];
      const [w, l] = side === 0 ? [a, b] : [b, a];
      w.wins++; l.outRound = roundNo;
      next.push(w); eliminated.push(l); done++; idx += 2;
      if (idx >= round.length) {
        if (next.length === 1) return finish(next[0]);
        startRound(shuffle(next));
      }
      render();
    }, 380);
  }

  const coverStyle = t => {
    if (!t.cover) return '';
    probe(t);
    return `background-image:url('${esc(hiRes.get(t.cover) || t.cover)}')" data-cover="${esc(t.cover)}`;
  };
  const roundName = n => n === 2 ? 'Финал' : n === 4 ? 'Полуфинал' : n === 8 ? 'Четвертьфинал' : `Раунд ${roundNo}`;

  const card = (t, side) => {
    const on = playing === t && isPlaying();
    return `
    <div class="card ${playing === t ? 'on' : ''}">
      <div class="cover" data-play="${side}" style="${coverStyle(t)}">${t.cover ? '' : '🎵'}
        <div class="pbtn"><span>${on ? '❚❚' : '▶'}</span></div>
        ${on ? '<div class="eq"><i></i><i></i><i></i><i></i></div>' : ''}
      </div>
      <div><div class="t" title="${esc(t.title)}">${esc(t.title)}</div><div class="a">${esc(t.artist) || '&nbsp;'}</div></div>
      ${playing === t ? `<div class="seek"><button data-skip="-15">−15</button><span id="kh-cur">0:00</span>
        <input id="kh-range" type="range" min="0" max="1000" value="0"><span id="kh-dur">0:00</span><button data-skip="15">+15</button></div>` : ''}
      <button class="win" data-win="${side}">Этот лучше<kbd>${side ? '→' : '←'}</kbd></button>
    </div>`;
  };

  function render() {
    const pairs = round.length / 2, pairNo = idx / 2 + 1;
    const a = round[idx], b = round[idx + 1];
    [round[idx + 2], round[idx + 3]].forEach(t => t && probe(t)); // заранее грузим обложки следующей пары
    const bgT = playing || a;
    bgEl.style.backgroundImage = bgT.cover ? `url('${esc(bgT.cover)}')` : '';
    main.innerHTML = `
      <div class="label" style="text-align:center">Турнир треков · ${round.length + next.length - idx / 2} в игре</div>
      <h1>${roundName(round.length)}</h1>
      <div class="sub">Пара ${pairNo} из ${pairs} · всего выбрано ${done} из ${totalMatches}</div>
      <div class="bar" style="margin-left:auto;margin-right:auto"><div style="width:${done / totalMatches * 100}%"></div></div>
      <div class="pair">${card(a, 0)}<div class="vs">VS</div>${card(b, 1)}</div>
      <div class="hint">← / → — выбрать · 1 / 2 — слушать · пробел — пауза</div>`;
    main.querySelectorAll('[data-play]').forEach(el => el.onclick = () => toggle(el.dataset.play === '0' ? a : b));
    main.querySelectorAll('[data-win]').forEach(el => el.onclick = () => pick(+el.dataset.win));
    main.querySelectorAll('[data-skip]').forEach(el => el.onclick = () => {
      const m = active(); if (m) m.currentTime = Math.max(0, Math.min((m.duration || 1e9) - 1, m.currentTime + +el.dataset.skip));
    });
    const r = main.querySelector('#kh-range');
    if (r) {
      r.oninput = () => { r.dragging = true; };
      r.onchange = () => { const m = active(); if (m && isFinite(m.duration)) m.currentTime = r.value / 1000 * m.duration; r.dragging = false; };
    }
    window.__khKey = e => {
      if (!document.getElementById('kh-root') || e.target.matches?.('input:not([type=range]), textarea')) return;
      const k = e.key;
      if (k === 'ArrowLeft') pick(0);
      else if (k === 'ArrowRight') pick(1);
      else if (k === '1') toggle(a);
      else if (k === '2') toggle(b);
      else if (k === ' ') { if (playing) toggle(playing); else toggle(a); }
      else return;
      e.preventDefault(); e.stopPropagation();
    };
  }
  clearInterval(window.__khTimer);
  window.__khTimer = setInterval(() => {
    const r = document.getElementById('kh-range'), m = active();
    if (!r || !m) return;
    if (!r.dragging && isFinite(m.duration)) r.value = m.currentTime / m.duration * 1000;
    document.getElementById('kh-cur').textContent = fmt(m.currentTime);
    document.getElementById('kh-dur').textContent = fmt(m.duration);
  }, 400);

  function finish(champ) {
    window.__khKey = null;
    const rest = eliminated.slice().sort((x, y) => y.outRound - x.outRound || y.wins - x.wins);
    bgEl.style.backgroundImage = champ.cover ? `url('${esc(champ.cover)}')` : '';
    main.innerHTML = `
      <div class="label" style="text-align:center">Турнир окончен</div>
      <h1>🏆 Победитель</h1>
      <div class="sub">из ${tracks.length} треков</div>
      <div class="pair"><div class="card gold">
        <div class="cover" style="${coverStyle(champ)}">${champ.cover ? '' : '🎵'}</div>
        <div><div class="t">${esc(champ.title)}</div><div class="a">${esc(champ.artist)}</div></div>
      </div></div>
      <h1 style="margin-top:40px;font-size:22px">Топ-30</h1>
      <ol>${[champ, ...rest].slice(0, 30).map(t => `<li>${t.cover ? `<img src="${esc(t.cover)}">` : '<div class="ph"></div>'}
        <div style="min-width:0"><div style="font-weight:700">${esc(t.title)}</div><div style="opacity:.6;font-size:13px">${esc(t.artist)}</div></div>
        <span class="w">побед: ${t.wins}</span></li>`).join('')}</ol>
      <div style="text-align:center"><button class="win" id="kh-again" style="padding:14px 28px">Сыграть ещё раз</button></div>`;
    main.querySelector('#kh-again').onclick = reset;
    log('Итог:\n' + [champ, ...rest].map((t, i) => `${i + 1}. ${t.artist} — ${t.title} (${t.wins})`).join('\n'));
  }

  reset();
})();
