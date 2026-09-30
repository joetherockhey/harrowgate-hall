const $ = s => document.querySelector(s);
const KEY = CASE.id + '-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let st = Object.assign({ answers: [], wrong: [0,0,0], hints: [0,0,0], read: {}, marks: {}, puzzles: {}, pz: {}, notes: '', start: 0, end: 0, opened: false }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

const S = [CASE.stage1];           // unlocked stages
let SOL = null;
const SUSPECTS = CASE.stage1.suspects;
const nameOf = id => (SUSPECTS.find(p => p.id === id) || {}).name || id;
const ROMAN = ['I', 'II', 'III'];

// Daily cases carry their own cover, title and map; the two test pages have theirs in the HTML.
const M = CASE.meta;
if (M) {
  document.title = M.title + (window.SITE ? ' · ' + SITE : '');
  $('#cover .folder').innerHTML = `<span class="conf">${window.LEVEL ? 'Case No. ' + LEVEL.n : 'Case file'}</span><h1>${M.title}</h1><p>${M.cover}</p>
    <p style="font-size:16px">Solo or with friends · three stages · about ten minutes</p><button class="btn" id="open-file">Open the file</button>`;
  $('#eyebrow').innerHTML = M.eyebrow;
  $('#title').innerHTML = M.titleHtml || M.title;
  $('.map-wrap').insertAdjacentHTML('afterbegin', CASE.stage1.map);
  if (M.aerial) $('#map').insertAdjacentHTML('afterbegin', `<figure class="aerial"><img src="${M.aerial}" alt="" loading="lazy"><figcaption>${M.aerialCaption || 'For the look of the place only: go by the plan below.'}</figcaption></figure>`);
}
if (window.LEVELS) document.body.insertAdjacentHTML('beforeend', '<a class="corner" href="index.html">🗺 Case map</a>');
const NEXT = window.LEVEL && LEVELS[LEVEL.n];

async function openSeal(b64, answer) {
  try {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CASE.id + '|' + answer));
    const key = await crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch { return null; }
}
const SEALS = ['s2', 's3', 'sol'];
async function applyAnswer(i, answer) {
  const obj = await openSeal(CASE.locked[SEALS[i]], answer);
  if (!obj) return false;
  if (i < 2) S.push(obj); else SOL = obj;
  return true;
}

/* ---------- rendering ---------- */
const evidence = () => S.flatMap((s, i) => s.evidence.map(e => ({ ...e, stage: i + 1 })));
const solved = () => st.answers.length;

function renderHeader() {
  $('#pips').innerHTML = [0,1,2].map(i => `<span class="pip ${i < solved() ? 'on' : i === solved() ? 'now' : ''}"></span>`).join('');
  $('#stage-label').textContent = SOL ? 'Case closed' : `Stage ${ROMAN[solved()]} of III`;
  const unread = evidence().some(e => !st.read[e.id]);
  document.querySelector('[data-tab=evidence]').innerHTML = 'Evidence' + (unread ? '<span class="dot" title="Unread evidence"></span>' : '');
}

function renderBrief() {
  const latest = S.length > 1 ? S[S.length - 1] : null;
  $('#brief').innerHTML = (SOL ? `<div class="memo"><div class="eyebrow">Case closed</div><p>You've solved it. The full account is on the <b>Solve</b> tab.</p></div>` :
    latest ? `<div class="memo"><div class="eyebrow">Latest from ${CASE.stage1.officer || 'Constable Barnes'} · Stage ${ROMAN[S.length - 1]}</div>${latest.intro}</div>` : '')
    + CASE.stage1.briefing
    + (SOL ? '' : `<p class="aside" style="margin-top:24px"><b>How it works:</b> the case comes in three stages. Each time you answer a stage correctly on the <b>Solve</b> tab, more evidence is revealed: new statements, exhibits and clues on the map.</p>`);
}

function renderSuspects() {
  const marks = [['unk', '?'], ['sus', 'Suspect'], ['clr', 'Cleared']];
  $('#suspects').innerHTML = `<h2>${CASE.stage1.suspectsTitle || 'The household'}</h2><p class="aside">${CASE.stage1.suspectsIntro || "Six people slept under Edmund Harrow's roof."} Mark them as you go. Only you can see the marks.</p><div class="grid">` +
    SUSPECTS.map(p => {
      const m = st.marks[p.id] || 'unk';
      const stm = evidence().filter(e => e.who === p.id);
      return `<article class="person">
        ${m !== 'unk' ? `<span class="stamp-mark ${m}">${m === 'sus' ? 'SUSPECT' : 'CLEARED'}</span>` : ''}
        <header><img class="mono" src="${CASE.imgdir || 'img/'}${p.id}.jpg" alt="${p.name}" loading="lazy">
          <div><h3>${p.name}</h3><div class="role">${p.role}</div></div></header>
        <div class="facts">Age ${p.age} · Height ${p.height}</div>
        <p>${p.bio}</p>
        <p class="int"><b>Of interest:</b> ${p.interest}</p>
        <div class="stmts">${stm.map(e => `<button class="chip" data-ev="${e.id}">${e.title.replace(/:.*/, '')}</button>`).join('')}</div>
        <div class="marks">${marks.map(([k, l]) => `<button data-mark="${p.id}" data-m="${k}" aria-pressed="${m === k}">${l}</button>`).join('')}</div>
      </article>`;
    }).join('') + '</div>';
}

// Corner badge on evidence cards: the speaker's photo on a suspect's statement, otherwise an icon for the kind.
const ICON = {
  puzzle: 'M19.44 7.85c-.05.32.06.65.29.88l1.57 1.57a2.4 2.4 0 0 1 0 3.4l-1.61 1.62a.98.98 0 0 1-.84.27c-.47-.07-.8-.48-.97-.92a2.5 2.5 0 1 0-3.21 3.21c.45.17.86.5.93.97a.98.98 0 0 1-.28.84l-1.61 1.6a2.4 2.4 0 0 1-3.4 0l-1.57-1.56a1.03 1.03 0 0 0-.88-.29c-.49.07-.84.5-1.02.97a2.5 2.5 0 1 1-3.24-3.24c.47-.18.9-.53.97-1.02a1.03 1.03 0 0 0-.29-.88L2.7 13.7a2.4 2.4 0 0 1 0-3.4l1.53-1.53c.24-.24.58-.35.92-.3.51.08.88.53 1.07 1.01a2.5 2.5 0 1 0 3.26-3.26c-.48-.2-.93-.56-1.01-1.07-.05-.34.06-.68.3-.92L10.3 2.7a2.4 2.4 0 0 1 3.4 0l1.57 1.57c.23.23.56.34.88.29.49-.07.84-.5 1.02-.97a2.5 2.5 0 1 1 3.24 3.24c-.47.18-.9.53-.97 1.02Z',
  document: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
  report: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM9 12h6M9 16h6',
  telegram: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7',
  mirror: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3',
  statement: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
};
const badge = e => e.kind === 'statement' && SUSPECTS.some(p => p.id === e.who)
  ? `<img class="ev-ico ev-face" src="${CASE.imgdir || 'img/'}${e.who}.jpg" alt="" loading="lazy">`
  : ICON[e.kind] ? `<svg class="ev-ico k-${e.kind}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[e.kind]}"/></svg>` : '';
function renderEvidence() {
  $('#evidence').innerHTML = S.map((s, i) => `
    <div class="stage-h"><h3>Stage ${ROMAN[i]}</h3><span>${s.evidence.length} items</span></div>
    <div class="cards">${s.evidence.map(e => `
      <button class="ev" data-ev="${e.id}">
        ${st.read[e.id] ? '' : '<span class="new">NEW</span>'}
        ${badge(e)}
        <span class="kind k-${e.kind}">${e.kind === 'mirror' ? 'exhibit' : e.kind}${e.kind === 'puzzle' && st.puzzles[e.id] ? ' · solved' : ''}</span>
        <b>${e.title}</b><small>${e.sub || ''}</small>
      </button>`).join('')}</div>`).join('')
    + (SOL ? '' : `<p class="aside" style="margin-top:28px">More evidence will come in once you solve Stage ${ROMAN[solved()]}.</p>`);
}

let selRoom = null, showPins = false;
// stage1.pins: { label, people: [{ id, name?, x, y }] } - photos on the plan, behind a toggle.
const pinSvg = p => `<g class="pin" transform="translate(${p.x} ${p.y})"><clipPath id="pc-${p.id}"><circle r="25"/></clipPath>
  <circle r="28" class="pin-ring"/><image href="${CASE.imgdir || 'img/'}${p.id}.jpg" x="-25" y="-25" width="50" height="50" clip-path="url(#pc-${p.id})" preserveAspectRatio="xMidYMin slice"/>
  <text y="45" class="pin-n">${p.name || nameOf(p.id).split(' ')[0]}</text></g>`;
function renderMap() {
  $('#tracks').innerHTML = S[1] ? S[1].overlay : '';
  const P = CASE.stage1.pins, pins = $('#pins');
  if (pins) pins.innerHTML = P && showPins ? P.people.map(pinSvg).join('') : '';
  const btn = P ? `<button type="button" class="pins-btn" data-pins aria-pressed="${showPins}">${showPins ? 'Hide the people' : P.label}</button>` : '';
  document.querySelectorAll('.map [data-room]').forEach(r => r.classList.toggle('sel', r.dataset.room === selRoom));
  const legend = S[1] && S[1].legend ? '<div class="legend">' + S[1].legend + '</div>' : '';
  if (!selRoom) { $('#room-info').innerHTML = `${btn}<p class="aside">Tap any place on the plan to read the notes on it.</p>${legend}`; return; }
  const notes = S.map(s => s.rooms && s.rooms[selRoom]).filter(Boolean);
  $('#room-info').innerHTML = btn + notes.map(n => `<p>${n}</p>`).join('') + legend;
}

function renderSolve() {
  const facts = S.slice(1).map(s => s.fact);
  let html = `<h2>${SOL ? 'Case closed' : 'Make your deductions'}</h2>`;
  if (facts.length) html += `<h3>Established</h3><ul class="facts-list">${facts.map(f => `<li>${f}</li>`).join('')}</ul>`;
  if (SOL) {
    const pen = st.wrong.reduce((a, b) => a + b, 0) + st.hints.reduce((a, b) => a + b, 0);
    const [rank, line] = pen === 0 ? ['Chief Inspector', 'No hints and no wrong guesses. Scotland Yard will be writing to you.'] :
      pen <= 2 ? ['Detective Inspector', 'Sharp work. The Chief Constable is lucky to have you.'] :
      pen <= 5 ? ['Detective Sergeant', 'You got there. The Superintendent noticed the detours.'] :
      ['Honorary Constable', 'The local constable would be proud of you. He is easily pleased.'];
    html += `<div class="solved-stamp">SOLVED</div>
      <div class="rating">Your rank: <b>${rank}</b><br>${line}<br><small>Time on the case: ${fmt((st.end || Date.now()) - st.start)} · wrong accusations: ${st.wrong.join(' / ')} · hints: ${st.hints.join(' / ')}</small>
        <div class="row" style="margin-top:12px"><button class="btn share" type="button" id="share">Share result</button>${NEXT ? `<a class="btn" href="case.html?c=${NEXT.id}">Next case →</a>` : ''}${window.LEVELS ? '<a class="btn ghost-l" href="index.html">Case map</a>' : ''}</div></div>
      ${SOL.html}`;
    $('#solve').innerHTML = html; return;
  }
  const i = solved(), q = S[i].question;
  let form = '';
  if (q.kind === 'time') form = `<label for="a-time">${q.label || 'Time of death'}</label><input type="text" id="a-time" inputmode="numeric" placeholder="HH:MM" autocomplete="off">`;
  if (q.kind === 'pick2') form = `<div class="picks">${SUSPECTS.map(p => `<label><input type="checkbox" name="pick" value="${p.id}"> ${p.name}</label>`).join('')}</div>`;
  if (q.kind === 'final') form = q.fields.map(f => `<label for="f-${f.id}">${f.label}</label><select id="f-${f.id}"><option value="">Choose…</option>${
      (f.options === 'suspects' ? SUSPECTS.map(p => [p.id, p.name]) : f.options).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`).join('');
  const shown = q.hints.slice(0, st.hints[i]);
  html += `<form class="q" id="qform">
      <div class="eyebrow" style="color:var(--red)">Stage ${ROMAN[i]}</div>
      <h3>${q.prompt}</h3><p class="aside">${q.help}</p>
      ${form}
      <div class="row"><button class="btn" type="submit">${i === 2 ? 'Accuse' : 'Submit'}</button>
        ${st.hints[i] < q.hints.length ? `<button class="btn ghost" type="button" id="hint">Hint (${q.hints.length - st.hints[i]} left)</button>` : ''}
        <span class="aside">Wrong so far: ${st.wrong[i]}</span></div>
      <div class="verdict" id="verdict" role="status"></div>
      ${shown.length ? `<ol class="hints">${shown.map(h => `<li>${h}</li>`).join('')}</ol>` : ''}
    </form>`;
  $('#solve').innerHTML = html;
}

function renderAll() { renderHeader(); renderBrief(); renderSuspects(); renderEvidence(); renderMap(); renderSolve(); }

/* ---------- interaction ---------- */
function showTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== t);
  try { sessionStorage.setItem(CASE.id + '-tab', t); } catch {}
}
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) showTab(b.dataset.tab); };

function openEvidence(id) {
  const e = evidence().find(x => x.id === id); if (!e) return;
  const sus = SUSPECTS.some(p => p.id === e.who);
  const who = e.who ? (sus ? `<img class="mono" src="${CASE.imgdir || 'img/'}${e.who}.jpg" alt="">${nameOf(e.who)}` : e.who) : '';
  $('#reader-body').innerHTML = `<div class="kind k-${e.kind}">${e.kind === 'mirror' ? 'exhibit' : e.kind} · stage ${ROMAN[e.stage - 1]}</div>
    <h2>${e.title}</h2>${who ? `<div class="who">${who}</div>` : `<div class="who">${e.sub || ''}</div>`}${e.html || ''}`;
  if (e.kind === 'puzzle') renderPuzzle(e);
  $('#reader').showModal();
  $('#reader .sheet').scrollTop = 0;
  if (!st.read[id]) { st.read[id] = 1; save(); renderHeader(); renderEvidence(); renderSuspects(); }
}
document.addEventListener('click', e => {
  const ev = e.target.closest('[data-ev]'); if (ev) return openEvidence(ev.dataset.ev);
  const mk = e.target.closest('[data-mark]'); if (mk) { st.marks[mk.dataset.mark] = mk.dataset.m; save(); renderSuspects(); return; }
  if (e.target.closest('.mirror-btn')) { const m = $('#reader .mirrored'); m.classList.toggle('flipped'); e.target.textContent = m.classList.contains('flipped') ? 'Put the mirror down' : 'Hold it to a mirror'; return; }
  if (e.target.closest('[data-pins]')) { showPins = !showPins; renderMap(); return; }
  const rm = e.target.closest('.map [data-room]'); if (rm) { selRoom = rm.dataset.room; renderMap(); if (innerWidth < 820) $('#room-info').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  if (e.target.id === 'hint') { st.hints[solved()]++; save(); renderSolve(); return; }
  if (e.target.id === 'share') return share();
});
$('#reader').addEventListener('click', e => { if (e.target === $('#reader')) $('#reader').close(); });

const WRONG = ["That doesn't hold up. Look again.", "The evidence won't carry that. Try again.", "The Superintendent shakes his head slowly.",
  "Not quite, detective.", "The Superintendent would send that back."];
document.addEventListener('submit', async e => {
  if (e.target.id !== 'qform') return;
  e.preventDefault();
  const i = solved(), q = S[i].question, v = $('#verdict');
  let ans = null;
  if (q.kind === 'time') {
    let d = $('#a-time').value.replace(/\D/g, '');
    if (d.length === 3) d = '0' + d;
    if (d.length !== 4) { v.textContent = 'Give the time as HH:MM.'; return; }
    let h = +d.slice(0, 2); if (h > 12) h -= 12;
    ans = String(h).padStart(2, '0') + d.slice(2);
  }
  if (q.kind === 'pick2') {
    const p = [...document.querySelectorAll('[name=pick]:checked')].map(x => x.value).sort();
    if (p.length !== 2) { v.textContent = 'Choose exactly two.'; return; }
    ans = p.join(',');
  }
  if (q.kind === 'final') {
    const f = q.fields.map(x => $('#f-' + x.id).value);
    if (f.some(x => !x)) { v.textContent = 'Answer every question.'; return; }
    ans = f.join('|');
  }
  if (await applyAnswer(i, ans)) {
    st.answers.push(ans);
    if (SOL) st.end = Date.now();
    save(); renderAll();
    toast(SOL ? 'Case closed. Read the full account.' : `Stage ${ROMAN[i + 1]} unlocked. New evidence has come in.`);
    showTab(SOL ? 'solve' : 'brief'); scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    st.wrong[i]++; save();
    renderSolve();
    $('#verdict').textContent = WRONG[st.wrong[i] % WRONG.length];
    $('#qform').classList.add('shake');
  }
});

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), 4200);
}
const fmt = ms => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
setInterval(() => { if (st.start) $('#clock').textContent = '⏱ ' + fmt((st.end || Date.now()) - st.start); }, 1000);

$('#notebook').value = st.notes;
$('#notebook').oninput = e => { st.notes = e.target.value; save(); };
$('#reset').onclick = () => { if (confirm('Wipe all progress, notes and marks, and start the case again?')) { try { localStorage.removeItem(KEY); } catch {} location.reload(); } };
$('#open-file').onclick = () => { st.opened = true; if (!st.start) st.start = Date.now(); save(); $('#cover').hidden = true; };

/* ---------- mini-puzzles: evidence with kind 'puzzle'; solving one shows its `after` html ---------- */
const norm = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const seeded = (arr, seed) => {           // same shuffle every time for a given puzzle, never already solved
  const a = arr.slice(); let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.every((x, i) => x === arr[i])) [a[0], a[1]] = [a[1], a[0]];
  return a;
};
function renderPuzzle(e) {
  $('#reader-body').insertAdjacentHTML('beforeend', `<div class="pz" id="pz"></div><div class="pz-after"></div>`);
  const box = $('#pz'), solvedAlready = !!st.puzzles[e.id];
  const done = () => {
    if (!st.puzzles[e.id]) { st.puzzles[e.id] = 1; save(); renderEvidence(); toast('Puzzle solved.'); }
    box.classList.add('done');
    $('.pz-after').innerHTML = e.after || '';
  };
  PZ[e.type](e.data, box, done, solvedAlready, e.id);
  if (solvedAlready) done();
}
function answerRow(box, ok, done) {
  box.insertAdjacentHTML('beforeend', `<form class="pz-ans"><input type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Your answer" placeholder="Your answer"><button class="btn">Check</button><div class="verdict" role="status"></div></form>`);
  const f = box.querySelector('.pz-ans');
  f.onsubmit = ev => { ev.preventDefault(); if (ok(f.querySelector('input').value)) { f.remove(); done(); } else f.querySelector('.verdict').textContent = 'Not that. Try again.'; };
}
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
const caesar = (t, k) => t.replace(/[A-Z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + k + 26 * 9) % 26 + b); });

const PZ = {
  // data: { img, crop?: 0.92 } or { text: "line\nline" }, grid?: 3. Tap two pieces to swap them.
  async jigsaw(d, box, done, solved, id) {
    const n = d.grid || 3, c = document.createElement('canvas'), g = c.getContext('2d');
    if (d.img) {
      const im = new Image(); await new Promise((ok, bad) => { im.onload = ok; im.onerror = bad; im.src = d.img; });
      c.width = im.naturalWidth; c.height = Math.round(im.naturalHeight * (d.crop || 1));
      g.drawImage(im, 0, 0, c.width, c.height, 0, 0, c.width, c.height);
    } else {
      await document.fonts.load('44px Caveat');
      const lines = d.text.split('\n'); c.width = 900; c.height = Math.max(600, 110 + lines.length * 62);
      g.fillStyle = '#fbf3df'; g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = '#cdbd9b88'; for (let y = 104; y < c.height; y += 62) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke(); }
      g.fillStyle = '#1e2f55'; g.font = '44px Caveat'; lines.forEach((l, i) => g.fillText(l, 50, 96 + i * 62));
    }
    const src = c.toDataURL('image/jpeg', .9), pos = (i, n) => (i / (n - 1)) * 100;
    let order = st.pz[id] || (solved ? [...Array(n * n).keys()] : seeded([...Array(n * n).keys()], id)), sel = null;
    box.insertAdjacentHTML('beforeend', `<p class="aside">${solved ? 'Pieced together.' : 'Tap two pieces to swap them.'}</p><div class="jig" style="aspect-ratio:${c.width}/${c.height};grid-template-columns:repeat(${n},1fr)"></div>`);
    const grid = box.querySelector('.jig');
    const draw = () => grid.innerHTML = order.map((p, i) => `<button type="button" data-i="${i}" aria-label="Piece ${i + 1}" class="${sel === i ? 'sel' : ''}"
      style="background-image:url(${src});background-size:${n * 100}% ${n * 100}%;background-position:${pos(p % n, n)}% ${pos(Math.floor(p / n), n)}%"></button>`).join('');
    draw();
    if (solved) return;
    grid.onclick = ev => {
      const b = ev.target.closest('[data-i]'); if (!b) return;
      const i = +b.dataset.i;
      if (sel === null) sel = i; else { [order[sel], order[i]] = [order[i], order[sel]]; sel = null; st.pz[id] = order; save(); }
      draw();
      if (order.every((p, i) => p === i)) { grid.onclick = null; grid.classList.add('whole'); done(); }
    };
  },

  // data: { text: 'MEET AT NINE' }. Shown as dots and dashes, playable as sound, answered by typing it.
  morse(d, box, done, solved) {
    const words = d.text.toUpperCase().split(/\s+/);
    const shown = words.map(w => [...w].map(ch => (MORSE[ch] || '').replace(/\./g, '·').replace(/-/g, '–')).join('   ')).join('   /   ');
    box.insertAdjacentHTML('beforeend', `<div class="morse">${shown}</div>
      <button class="btn ghost" type="button" id="beep">▶ Play the signal</button>
      <details class="mkey"><summary>Morse key</summary><div>${Object.entries(MORSE).map(([k, v]) => `<span><b>${k}</b> ${v.replace(/\./g, '·').replace(/-/g, '–')}</span>`).join('')}</div></details>
      ${solved ? `<p class="morse-plain">${d.text.toUpperCase()}</p>` : ''}`);
    box.querySelector('#beep').onclick = () => {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), u = .09; let t = ac.currentTime + .1;
      for (const w of words) { for (const ch of w) { for (const s of MORSE[ch] || '') {
        const o = ac.createOscillator(), v = ac.createGain(); o.frequency.value = 640; o.connect(v); v.connect(ac.destination);
        const len = s === '.' ? u : 3 * u; v.gain.setValueAtTime(.25, t); v.gain.setValueAtTime(0, t + len); o.start(t); o.stop(t + len + .02); t += len + u;
      } t += 2 * u; } t += 4 * u; }
    };
    if (!solved) answerRow(box, v => norm(v) === norm(d.text), () => { box.insertAdjacentHTML('beforeend', `<p class="morse-plain">${d.text.toUpperCase()}</p>`); done(); });
  },

  // data: { img?, w, h, items: [{ x, y, e, s? }], gone: [i...], changed?: { i: 'emoji' }, labels?: ['Before', 'After'] }
  // Photo A shows every item; photo B drops `gone` and swaps `changed`. Tap each difference on photo A.
  spot(d, box, done, solved) {
    const diffs = [...(d.gone || []), ...Object.keys(d.changed || {}).map(Number)], found = new Set(solved ? diffs : []);
    const [la, lb] = d.labels || ['Photo A', 'Photo B'];
    const pic = b => `<figure><figcaption>${b ? lb : la}</figcaption><svg viewBox="0 0 ${d.w} ${d.h}" class="spot" ${b ? '' : 'id="spot-a"'}>
      ${d.img ? `<image href="${d.img}" width="${d.w}" height="${d.h}" preserveAspectRatio="xMidYMin slice"/>` : `<rect width="${d.w}" height="${d.h}" fill="#efe6cf"/>`}
      ${d.items.map((it, i) => b && (d.gone || []).includes(i) ? '' : `<text x="${it.x}" y="${it.y}" font-size="${it.s || 60}" text-anchor="middle" dominant-baseline="central">${b && d.changed && d.changed[i] || it.e}</text>`).join('')}
      <g class="rings"></g></svg></figure>`;
    box.insertAdjacentHTML('beforeend', `<p class="aside">${diffs.length} difference${diffs.length > 1 ? 's' : ''}. Tap each one on ${la}. <span id="spot-n"></span></p><div class="spots">${pic(0)}${pic(1)}</div><div class="verdict" id="spot-v"></div>`);
    const a = box.querySelector('#spot-a');
    const ring = () => { a.querySelector('.rings').innerHTML = [...found].map(i => `<circle cx="${d.items[i].x}" cy="${d.items[i].y}" r="${(d.items[i].s || 60) * .75}"/>`).join(''); box.querySelector('#spot-n').textContent = `Found ${found.size} of ${diffs.length}.`; };
    ring();
    if (solved) return;
    a.onclick = ev => {
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(a.getScreenCTM().inverse());
      const hit = diffs.find(i => Math.hypot(d.items[i].x - p.x, d.items[i].y - p.y) < Math.max(d.items[i].s || 60, d.w / 14));
      box.querySelector('#spot-v').textContent = hit === undefined ? 'Nothing different there.' : '';
      if (hit !== undefined) { found.add(hit); ring(); if (found.size === diffs.length) { a.onclick = null; done(); } }
    };
  },

  // data: { key: { E4: 'M', ... }, lines: ['E4 G4 B4', 'E4 C5 | F4 G5 C5'], text: 'MIDNIGHT MY KEY' }.
  // Notes on a treble staff, C4 (ledger below) to A5 (ledger above); | is a bar line between words. Translate with the key, type the message.
  staff(d, box, done, solved) {
    const P = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'], gap = 12, top = 34, w = 44;
    const y = n => top + 4 * gap - (P.indexOf(n) - 2) * gap / 2;          // E4 sits on the bottom line
    const note = (n, x, label) => { const k = P.indexOf(n), yy = y(n), up = k < 6;
      return (k === 0 || k === 12 ? `<line x1="${x - 13}" x2="${x + 13}" y1="${yy}" y2="${yy}" class="st-l"/>` : '')
        + `<ellipse cx="${x}" cy="${yy}" rx="7.5" ry="5.5" transform="rotate(-20 ${x} ${yy})"/>`
        + `<line x1="${up ? x + 6.5 : x - 6.5}" x2="${up ? x + 6.5 : x - 6.5}" y1="${yy}" y2="${up ? yy - 34 : yy + 34}" class="st-s"/>`
        + (label ? `<text x="${x}" y="${top + 4 * gap + 44}" text-anchor="middle">${label}</text>` : ''); };
    const staffSvg = (items, cls) => { const W = 30 + items.length * w;
      return `<svg class="staff ${cls}" style="width:${W}px" viewBox="0 0 ${W} ${top + 4 * gap + 56}">${[0, 1, 2, 3, 4].map(i => `<line x1="4" x2="${W - 4}" y1="${top + i * gap}" y2="${top + i * gap}" class="st-l"/>`).join('')}
        ${items.map((it, i) => it.bar ? `<line x1="${30 + i * w}" x2="${30 + i * w}" y1="${top}" y2="${top + 4 * gap}" class="st-l"/>` : note(it.n, 30 + i * w, it.label)).join('')}</svg>`; };
    box.insertAdjacentHTML('beforeend', `<p class="aside">The key:</p>${[P.slice(0, 7), P.slice(7)].map(r => staffSvg(r.map(n => ({ n, label: d.key[n] })), 'st-msg')).join('')}
      <p class="aside" style="margin-top:14px">The message:</p>${d.lines.map(l => staffSvg(l.split(' ').map(t => t === '|' ? { bar: 1 } : { n: t, label: solved ? d.key[t] : '' }), 'st-msg')).join('')}
      ${solved ? `<p class="morse-plain">${d.text}</p>` : ''}`);
    if (!solved) answerRow(box, v => norm(v) === norm(d.text), () => { box.insertAdjacentHTML('beforeend', `<p class="morse-plain">${d.text}</p>`); done(); });
  },

  // data: { text: 'PLAIN TEXT', shift: 3 }. Shown shifted; turn the wheel until it reads.
  cipher(d, box, done, solved) {
    const enc = caesar(d.text.toUpperCase(), d.shift);
    box.insertAdjacentHTML('beforeend', `<div class="morse" id="ciph">${solved ? d.text.toUpperCase() : enc}</div>
      <label class="wheel">Turn the wheel: <b id="ciph-k">${solved ? d.shift : 0}</b><input type="range" min="0" max="25" value="${solved ? d.shift : 0}" ${solved ? 'disabled' : ''} aria-label="Cipher shift"></label>`);
    if (solved) return;
    const r = box.querySelector('input');
    r.oninput = () => { box.querySelector('#ciph').textContent = caesar(enc, -r.value); box.querySelector('#ciph-k').textContent = r.value;
      if (+r.value === d.shift % 26) { r.disabled = true; done(); } };
  },

  // data: { code: '1914', symbols?: '0123456789' }. Dials with up/down.
  lock(d, box, done, solved) {
    const sym = d.symbols || '0123456789', v = [...d.code].map(ch => solved ? sym.indexOf(ch) : 0);
    box.insertAdjacentHTML('beforeend', `<div class="lock">${v.map((_, i) => `<div class="dial"><button type="button" data-u="${i}" aria-label="Up">▲</button><b></b><button type="button" data-dn="${i}" aria-label="Down">▼</button></div>`).join('')}</div>
      ${solved ? '<p class="aside">The lock is open.</p>' : '<button class="btn" type="button" id="try">Try the lock</button><div class="verdict" id="lock-v"></div>'}`);
    const draw = () => box.querySelectorAll('.dial b').forEach((b, i) => b.textContent = sym[v[i]]);
    draw();
    if (solved) return;
    box.querySelector('.lock').onclick = ev => { const u = ev.target.dataset.u, dn = ev.target.dataset.dn;
      if (u !== undefined) v[u] = (v[u] + 1) % sym.length; if (dn !== undefined) v[dn] = (v[dn] + sym.length - 1) % sym.length; draw(); };
    box.querySelector('#try').onclick = () => { if (v.map(i => sym[i]).join('') === d.code) { box.querySelector('#try').remove(); done(); } else box.querySelector('#lock-v').textContent = 'It won\'t budge.'; };
  },

  // data: { items: ['first', 'second', ...] } in the right order. Tap them in order.
  order(d, box, done, solved, id) {
    let picked = solved ? d.items.map((_, i) => i) : [];
    const pool = seeded(d.items.map((_, i) => i), id);
    box.insertAdjacentHTML('beforeend', `<ol class="ord-picked"></ol><div class="ord-pool"></div><div class="row"><button class="btn ghost" type="button" id="ord-undo">Undo</button></div><div class="verdict" id="ord-v"></div>`);
    const draw = () => {
      box.querySelector('.ord-picked').innerHTML = picked.map(i => `<li>${d.items[i]}</li>`).join('');
      box.querySelector('.ord-pool').innerHTML = pool.filter(i => !picked.includes(i)).map(i => `<button type="button" class="chip" data-o="${i}">${d.items[i]}</button>`).join('');
    };
    draw();
    if (solved) { box.querySelector('.row').remove(); return; }
    box.querySelector('.ord-pool').onclick = ev => {
      const b = ev.target.closest('[data-o]'); if (!b) return;
      picked.push(+b.dataset.o); draw();
      if (picked.length < d.items.length) return;
      if (picked.every((p, i) => p === i)) { box.querySelector('.row').remove(); done(); }
      else { box.querySelector('#ord-v').textContent = 'That order doesn\'t fit the facts. Try again.'; picked = []; setTimeout(draw, 900); }
    };
    box.querySelector('#ord-undo').onclick = () => { picked.pop(); draw(); };
  },
};

/* ---------- sharing ---------- */
async function share() {
  const face = i => st.wrong[i] ? '🟥' : st.hints[i] ? '🟨' : '🟩';
  const name = M ? M.title : document.title, n = (a, w) => `${a} ${w}${a === 1 ? '' : 's'}`;
  const hints = st.hints.reduce((a, b) => a + b, 0), wrong = st.wrong.reduce((a, b) => a + b, 0);
  const head = window.LEVEL ? `${SITE} · Case #${LEVEL.n}\n` : '';
  const text = `${head}${name}\n${[0, 1, 2].map(face).join('')}\n⏱ ${fmt(st.end - st.start)} · 🔍 ${n(hints, 'hint')} · ❌ ${n(wrong, 'wrong accusation')}`;
  try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Result copied. Paste it to your fellow detective.'); } }
  catch {}
}

(async () => {
  for (let i = 0; i < st.answers.length; i++) if (!(await applyAnswer(i, st.answers[i]))) { st.answers.length = i; break; }
  if (st.opened) $('#cover').hidden = true;
  renderAll();
  let t = 'brief'; try { t = sessionStorage.getItem(CASE.id + '-tab') || 'brief'; } catch {}
  showTab(t);
})();
