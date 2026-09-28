// Турнир треков ВК. Запускать в консоли (F12) на странице vk.com/audios (vk.ru/audios...)
(async () => {
  document.getElementById('kh-root')?.remove();

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const log = (...a) => console.log('[KH]', ...a);
  log('версия 14');

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
    #kh-root .top{position:fixed;top:16px;right:20px;z-index:3;display:flex;gap:8px}
    #kh-root .top button{border-radius:50%;width:42px;height:42px;padding:0;font-size:16px}
    #kh-root.mini{inset:auto 16px 16px auto;width:460px;max-width:calc(100vw - 32px);max-height:75vh;border-radius:22px;border:1px solid rgba(255,255,255,.15);box-shadow:0 20px 60px rgba(0,0,0,.6)}
    #kh-root.mini .top{position:absolute;top:10px;right:10px}
    #kh-root.mini .top button{width:32px;height:32px;font-size:13px}
    #kh-root.mini #kh-bg,#kh-root.mini .vs,#kh-root.mini .hint,#kh-root.mini .label,#kh-root.mini .bar,#kh-root.mini .seek,#kh-root.mini .spin{display:none}
    #kh-root.mini #kh-wrap{padding:12px}
    #kh-root.mini h1{font-size:16px;margin:2px 80px 2px 0;text-align:left;align-self:flex-start}
    #kh-root.mini .sub{font-size:12px;margin-bottom:8px;text-align:left;align-self:flex-start}
    #kh-root.mini .pair{flex-direction:column;gap:8px}
    #kh-root.mini .card{flex-direction:row;align-items:center;padding:8px;gap:10px;border-radius:14px;max-width:none}
    #kh-root.mini .card:hover{transform:none}
    #kh-root.mini .card>div:nth-child(2){flex:1;min-width:0}
    #kh-root.mini .cover{width:56px;height:56px;flex:none;border-radius:10px;font-size:22px;aspect-ratio:auto}
    #kh-root.mini .pbtn span{width:28px;height:28px;font-size:12px}
    #kh-root.mini .eq{display:none}
    #kh-root.mini .t{font-size:14px;-webkit-line-clamp:1}
    #kh-root.mini .a{font-size:12px;margin-top:0}
    #kh-root.mini .win{margin-top:0;padding:8px 12px;font-size:13px;flex:none}
    #kh-root.mini kbd{display:none}
    #kh-root.mini ol{display:none}
    #kh-root ol{max-width:640px;width:100%;padding:0;margin:8px 0 24px;list-style:none;counter-reset:n}
    #kh-root li{counter-increment:n;display:flex;gap:14px;align-items:center;padding:10px 14px;border-radius:14px;background:var(--card);margin-bottom:8px}
    #kh-root li::before{content:counter(n);width:28px;text-align:center;font-weight:800;opacity:.5}
    #kh-root li img,#kh-root li .ph{width:44px;height:44px;border-radius:10px;object-fit:cover;background:#2a2440;flex:none}
    #kh-root li .w{margin-left:auto;opacity:.5;font-size:13px;white-space:nowrap}
    #kh-root .spin{width:48px;height:48px;border-radius:50%;border:4px solid rgba(255,255,255,.1);border-top-color:var(--acc);animation:kh-spin 1s linear infinite;margin:40px auto 20px}
    @keyframes kh-spin{to{transform:rotate(360deg)}}
    #kh-root .kh-msg{border:0 !important;background:none !important;padding:0 !important;min-height:20px;color:#ff8a80 !important;text-align:center;margin-top:12px}
    #kh-root .kh-msg:empty{display:none}
    @media (max-width:640px){#kh-root .pair{gap:10px}#kh-root .vs{width:40px;height:40px;font-size:14px;margin:0 -12px}#kh-root .card{padding:10px;border-radius:18px;gap:10px}
      #kh-root .t{font-size:16px}#kh-root .a{font-size:13px}#kh-root .pbtn span{width:56px;height:56px;font-size:22px}#kh-root .win{font-size:14px;padding:12px}#kh-root kbd{display:none}}
  </style><div id="kh-bg"></div><div class="top"><button id="kh-min" title="Свернуть в уголок">–</button><button id="kh-close" title="Закрыть">✕</button></div>
  <div id="kh-wrap"><div id="kh-main"></div><div class="kh-msg" id="kh-msg"></div></div>`;
  document.body.appendChild(root);
  const main = root.querySelector('#kh-main');
  const msg = t => root.querySelector('#kh-msg').textContent = t || '';
  const bgEl = root.querySelector('#kh-bg');
  const onKey = e => window.__khKey?.(e);
  document.removeEventListener('keydown', window.__khKeyL || (() => {}), true);
  window.__khKeyL = onKey;
  document.addEventListener('keydown', onKey, true);
  root.querySelector('#kh-min').onclick = () => {
    const m = root.classList.toggle('mini');
    root.querySelector('#kh-min').textContent = m ? '⤢' : '–';
    root.querySelector('#kh-min').title = m ? 'Развернуть' : 'Свернуть в уголок';
  };
  root.querySelector('#kh-close').onclick = () => { pauseAll(); root.remove(); document.removeEventListener('keydown', onKey, true); };
  // Разметку экрана загрузки создаём один раз и дальше меняем только текст — иначе спиннер пересоздаётся и дёргается
  const status = (h, s = '') => {
    if (!main.querySelector('#kh-st-h')) {
      main.innerHTML = `<div class="spin"></div><div class="label" style="text-align:center">Турнир треков</div><h1 id="kh-st-h"></h1><div class="sub" id="kh-st-s"></div>`;
    }
    main.querySelector('#kh-st-h').textContent = h;
    main.querySelector('#kh-st-s').textContent = s;
  };
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
  let last = -1, stable = 0, stopReq = false;
  const stopBtn = document.createElement('button');
  stopBtn.className = 'win';
  stopBtn.style.cssText = 'margin-top:8px;padding:14px 28px';
  stopBtn.textContent = 'Хватит, играть с этими';
  stopBtn.onclick = () => { stopReq = true; stopBtn.disabled = true; stopBtn.textContent = 'Останавливаю…'; };
  root.querySelector('#kh-wrap').appendChild(stopBtn);
  // Необязательный лимит: window.KH_LIMIT = 10 перед запуском. Действует на один запуск, потом сбрасывается
  const LIMIT = +window.KH_LIMIT || 0;
  delete window.KH_LIMIT;
  while (stable < 20 && !stopReq && !(LIMIT && byId.size >= LIMIT)) {
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
    if (!stopReq) stopBtn.textContent = `Хватит, играть с ${byId.size} треками`;
  }
  stopBtn.remove();
  window.scrollTo(0, 0);
  const tracks = [...byId.values()].slice(0, LIMIT || undefined);
  log(`Собрано треков: ${tracks.length}, высота страницы: ${document.documentElement.scrollHeight}`);
  if (tracks.length < 2) { status('Не нашёл треки 😕', 'Пришли мне скрин консоли.'); main.querySelector('.spin')?.remove(); return; }

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
  // Обложки в списке подписаны ВК на 68x68 — большую берём из Media Session, которую плеер ВК заполняет при воспроизведении
  const grabArtwork = async t => {
    for (let i = 0; i < 20; i++) {
      const md = navigator.mediaSession?.metadata;
      if (md?.artwork?.length && md.title && t.title.includes(md.title.trim().slice(0, 20))) {
        const px = a => parseInt((a.sizes || '').split('x')[0]) || 0;
        const best = [...md.artwork].sort((x, y) => px(y) - px(x))[0]?.src;
        log('artwork', md.artwork);
        if (best && t.cover && best !== t.cover) {
          hiRes.set(t.cover, best);
          document.querySelectorAll(`#kh-root [data-cover="${CSS.escape(t.cover)}"]`).forEach(el => el.style.backgroundImage = `url('${best}')`);
        }
        return;
      }
      await sleep(250);
    }
    log('artwork: нет данных в mediaSession', navigator.mediaSession?.metadata);
  };
  // Строка выгружена из DOM — ищем её прокруткой: сначала вокруг запомненной позиции, потом всё шире, потом по всей странице
  const seekRow = async t => {
    const tryAt = async y => {
      window.scrollTo(0, Math.max(0, y - innerHeight / 2));
      for (let i = 0; i < 4; i++) { await sleep(120); const r = findRow(t); if (r) return r; }
      return null;
    };
    const step = innerHeight * 0.7;
    for (let k = 0; k <= 12; k++) {
      for (const y of k ? [t.y + k * step, t.y - k * step] : [t.y]) {
        const r = await tryAt(y);
        if (r) { t.y = r.getBoundingClientRect().top + scrollY; return r; }
      }
    }
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      const r = await tryAt(y);
      if (r) { t.y = r.getBoundingClientRect().top + scrollY; return r; }
    }
    return null;
  };
  let playing = null;
  const startTrack = async t => {
    let row = findRow(t);
    if (!row) { msg('Ищу трек на странице ВК…'); row = await seekRow(t); msg(''); }
    if (!row) { msg('Не нашёл этот трек на странице ВК'); log('row not found', t); return false; }
    row.scrollIntoView({ block: 'center' });
    await sleep(150);
    const ctrl = row.querySelector('[data-testid="MusicTrackRow_PlaybackControls"]');
    const candidates = [
      ctrl?.querySelector('button'), ctrl, row.querySelector('[data-testid="audiorow-tappable"]'),
      row.querySelector('[data-testid="MusicTrackRow_Title"]'), row,
    ].filter(Boolean);
    pauseAll();
    // Мы ставим на паузу сам <audio>, а ВК об этом не знает и считает, что трек ещё играет.
    // Тогда клик по строке для ВК значит «пауза» — вместо клика просто продолжаем воспроизведение.
    const tap = row.querySelector('[data-testid="audiorow-tappable"]');
    if (/пауз/i.test(tap?.getAttribute('aria-label') || '')) {
      for (const m of allMedia()) if (m.paused && m.currentTime > 0 && !m.ended) { try { await m.play(); } catch {} }
      await sleep(250);
      if (isPlaying()) { log('продолжил текущий трек ВК'); grabArtwork(t); return true; }
    }
    for (const el of candidates) {
      realClick(el);
      for (let i = 0; i < 8; i++) { await sleep(150); if (isPlaying()) { log('играет, клик по', el); grabArtwork(t); return true; } }
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

  // --- Турнир на выбывание: раунд делится на пары, при нечётном числе одна группа — тройка ---
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let groups, gi, roundNo, roundSize, next, eliminated;
  const startRound = list => {
    roundNo++; roundSize = list.length; next = []; gi = 0; groups = [];
    for (let i = 0; i + 1 < list.length; i += 2) groups.push([list[i], list[i + 1]]);
    if (list.length % 2) groups[groups.length - 1].push(list[list.length - 1]); // нечётный — последняя группа из трёх
  };
  const reset = () => {
    tracks.forEach(t => t.wins = 0);
    roundNo = 0; eliminated = [];
    startRound(shuffle(tracks.slice()));
    render();
  };

  let busy = false;
  function pick(side) {
    const g = groups[gi];
    if (busy || !g[side]) return;
    busy = true;
    pauseAll(); playing = null; msg('');
    main.querySelectorAll('.card').forEach((c, i) => c.classList.add(i === side ? 'chosen' : 'lost'));
    setTimeout(() => {
      busy = false;
      const w = g[side];
      w.wins++; next.push(w);
      g.forEach(t => { if (t !== w) { t.outRound = roundNo; eliminated.push(t); } });
      if (++gi >= groups.length) {
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
  const roundName = n => n === 2 ? 'Финал' : n === 3 ? 'Финал · тройка' : n <= 5 ? 'Полуфинал' : n <= 11 ? 'Четвертьфинал' : `Раунд ${roundNo}`;
  const KEYS = { 2: ['←', '→'], 3: ['←', '↓', '→'] };

  const card = (t, side, n) => {
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
      <button class="win" data-win="${side}">Этот лучше<kbd>${KEYS[n][side]}</kbd></button>
    </div>`;
  };

  function render() {
    const g = groups[gi], n = g.length;
    (groups[gi + 1] || []).forEach(probe); // заранее грузим обложки следующей группы
    const bgT = playing || g[0];
    bgEl.style.backgroundImage = bgT.cover ? `url("${hiRes.get(bgT.cover) || bgT.cover}")` : '';
    const out = eliminated.length, total = tracks.length - 1;
    main.innerHTML = `
      <div class="label" style="text-align:center">Турнир треков · ${tracks.length - out} в игре</div>
      <h1>${roundName(roundSize)}</h1>
      <div class="sub">${n === 3 ? 'Тройка' : 'Пара'} ${gi + 1} из ${groups.length} · в раунде ${roundSize} треков · выбыло ${out} из ${total}</div>
      <div class="bar" style="margin-left:auto;margin-right:auto"><div style="width:${out / total * 100}%"></div></div>
      <div class="pair">${g.map((t, i) => card(t, i, n)).join('<div class="vs">VS</div>')}</div>
      <div class="hint">${KEYS[n].join(' / ')} — выбрать · ${n === 3 ? '1 / 2 / 3' : '1 / 2'} — слушать · пробел — пауза</div>`;
    main.querySelectorAll('[data-play]').forEach(el => el.onclick = () => toggle(g[+el.dataset.play]));
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
      if (!document.getElementById('kh-root') || root.classList.contains('mini') || e.target.matches?.('input:not([type=range]), textarea')) return;
      const k = e.key;
      if (k === 'ArrowLeft') pick(0);
      else if (k === 'ArrowRight') pick(n - 1);
      else if (k === 'ArrowDown' && n === 3) pick(1);
      else if (/^[1-3]$/.test(k) && g[k - 1]) toggle(g[k - 1]);
      else if (k === ' ') toggle(playing || g[0]);
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
    bgEl.style.backgroundImage = champ.cover ? `url("${hiRes.get(champ.cover) || champ.cover}")` : '';
    main.innerHTML = `
      <div class="label" style="text-align:center">Турнир окончен</div>
      <h1>🏆 Победитель</h1>
      <div class="sub">из ${tracks.length} треков</div>
      <div class="pair"><div class="card gold">
        <div class="cover" id="kh-champ" style="${coverStyle(champ)}">${champ.cover ? '' : '🎵'}
          <div class="pbtn"><span id="kh-champ-btn">▶</span></div>
          <div class="eq" id="kh-champ-eq" style="display:none"><i></i><i></i><i></i><i></i></div>
        </div>
        <div><div class="t">${esc(champ.title)}</div><div class="a">${esc(champ.artist)}</div></div>
      </div></div>
      <h1 style="margin-top:40px;font-size:22px">Топ-30</h1>
      <ol>${[champ, ...rest].slice(0, 30).map(t => `<li>${t.cover ? `<img src="${esc(t.cover)}">` : '<div class="ph"></div>'}
        <div style="min-width:0"><div style="font-weight:700">${esc(t.title)}</div><div style="opacity:.6;font-size:13px">${esc(t.artist)}</div></div>
        <span class="w">побед: ${t.wins}</span></li>`).join('')}</ol>
      <div style="text-align:center"><button class="win" id="kh-again" style="padding:14px 28px">Сыграть ещё раз</button></div>`;
    main.querySelector('#kh-again').onclick = () => { pauseAll(); playing = null; reset(); };

    // Победитель сразу начинает играть; клик по обложке — пауза / продолжить
    const champUi = () => {
      const on = isPlaying();
      const btn = document.getElementById('kh-champ-btn'), eq = document.getElementById('kh-champ-eq');
      if (!btn) return;
      btn.textContent = on ? '❚❚' : '▶';
      eq.style.display = on ? '' : 'none';
      document.getElementById('kh-champ').closest('.card').classList.toggle('on', on);
    };
    main.querySelector('#kh-champ').onclick = async () => {
      if (isPlaying()) pauseAll();
      else if (active()) await active().play();
      else await startTrack(champ);
      champUi();
    };
    log('Финал: запускаю победителя', champ.title);
    startTrack(champ).then(ok => { log('Победитель играет:', ok); if (ok) playing = champ; champUi(); });

    log('Итог:\n' + [champ, ...rest].map((t, i) => `${i + 1}. ${t.artist} — ${t.title} (${t.wins})`).join('\n'));
  }

  reset();
})();
