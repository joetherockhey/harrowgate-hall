const $ = s => document.querySelector(s);
const KEY = CASE.id + '-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let st = Object.assign({ answers: [], wrong: [0,0,0], hints: [0,0,0], read: {}, marks: {}, notes: '', start: 0, end: 0, opened: false }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

const S = [CASE.stage1];           // unlocked stages
let SOL = null;
const SUSPECTS = CASE.stage1.suspects;
const nameOf = id => (SUSPECTS.find(p => p.id === id) || {}).name || id;
const ROMAN = ['I', 'II', 'III'];

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
    latest ? `<div class="memo"><div class="eyebrow">Latest from Constable Barnes · Stage ${ROMAN[S.length - 1]}</div>${latest.intro}</div>` : '')
    + CASE.stage1.briefing;
}

function renderSuspects() {
  const marks = [['unk', '?'], ['sus', 'Suspect'], ['clr', 'Cleared']];
  $('#suspects').innerHTML = `<h2>The household</h2><p class="aside">Six people slept under Edmund Harrow's roof. Mark them as you go. Only you can see the marks.</p><div class="grid">` +
    SUSPECTS.map(p => {
      const m = st.marks[p.id] || 'unk';
      const stm = evidence().filter(e => e.who === p.id);
      return `<article class="person">
        ${m !== 'unk' ? `<span class="stamp-mark ${m}">${m === 'sus' ? 'SUSPECT' : 'CLEARED'}</span>` : ''}
        <header><img class="mono" src="img/${p.id}.jpg" alt="${p.name}" loading="lazy">
          <div><h3>${p.name}</h3><div class="role">${p.role}</div></div></header>
        <div class="facts">Age ${p.age} · Height ${p.height}</div>
        <p>${p.bio}</p>
        <p class="int"><b>Of interest:</b> ${p.interest}</p>
        <div class="stmts">${stm.map(e => `<button class="chip" data-ev="${e.id}">${e.title.replace(/:.*/, '')}</button>`).join('')}</div>
        <div class="marks">${marks.map(([k, l]) => `<button data-mark="${p.id}" data-m="${k}" aria-pressed="${m === k}">${l}</button>`).join('')}</div>
      </article>`;
    }).join('') + '</div>';
}

function renderEvidence() {
  $('#evidence').innerHTML = S.map((s, i) => `
    <div class="stage-h"><h3>Stage ${ROMAN[i]}</h3><span>${s.evidence.length} items</span></div>
    <div class="cards">${s.evidence.map(e => `
      <button class="ev" data-ev="${e.id}">
        ${st.read[e.id] ? '' : '<span class="new">NEW</span>'}
        <span class="kind k-${e.kind}">${e.kind === 'mirror' ? 'exhibit' : e.kind}</span>
        <b>${e.title}</b><small>${e.sub || ''}</small>
      </button>`).join('')}</div>`).join('')
    + (SOL ? '' : `<p class="aside" style="margin-top:28px">More evidence will come in once you solve Stage ${ROMAN[solved()]}.</p>`);
}

let selRoom = null;
function renderMap() {
  $('#tracks').innerHTML = S[1] ? S[1].overlay : '';
  document.querySelectorAll('.map [data-room]').forEach(r => r.classList.toggle('sel', r.dataset.room === selRoom));
  const legend = S[1] && S[1].legend ? '<div class="legend">' + S[1].legend + '</div>' : '';
  if (!selRoom) { $('#room-info').innerHTML = `<p class="aside">Tap any place on the plan to read the notes on it.</p>${legend}`; return; }
  const notes = S.map(s => s.rooms && s.rooms[selRoom]).filter(Boolean);
  $('#room-info').innerHTML = notes.map(n => `<p>${n}</p>`).join('') + legend;
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
      <div class="rating">Your rank: <b>${rank}</b><br>${line}<br><small>Time on the case: ${fmt((st.end || Date.now()) - st.start)} · wrong accusations: ${st.wrong.join(' / ')} · hints: ${st.hints.join(' / ')}</small></div>
      ${SOL.html}`;
    $('#solve').innerHTML = html; return;
  }
  const i = solved(), q = S[i].question;
  let form = '';
  if (q.kind === 'time') form = `<label for="a-time">Time of death</label><input type="text" id="a-time" inputmode="numeric" placeholder="HH:MM" autocomplete="off">`;
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
  const who = e.who ? (SUSPECTS.some(p => p.id === e.who) ? nameOf(e.who) : e.who) : '';
  $('#reader-body').innerHTML = `<div class="kind k-${e.kind}">${e.kind === 'mirror' ? 'exhibit' : e.kind} · stage ${ROMAN[e.stage - 1]}</div>
    <h2>${e.title}</h2>${who ? `<div class="who">${who}</div>` : `<div class="who">${e.sub || ''}</div>`}${e.html}`;
  $('#reader').showModal();
  $('#reader .sheet').scrollTop = 0;
  if (!st.read[id]) { st.read[id] = 1; save(); renderHeader(); renderEvidence(); renderSuspects(); }
}
document.addEventListener('click', e => {
  const ev = e.target.closest('[data-ev]'); if (ev) return openEvidence(ev.dataset.ev);
  const mk = e.target.closest('[data-mark]'); if (mk) { st.marks[mk.dataset.mark] = mk.dataset.m; save(); renderSuspects(); return; }
  if (e.target.closest('.mirror-btn')) { const m = $('#reader .mirrored'); m.classList.toggle('flipped'); e.target.textContent = m.classList.contains('flipped') ? 'Put the mirror down' : 'Hold it to a mirror'; return; }
  const rm = e.target.closest('.map [data-room]'); if (rm) { selRoom = rm.dataset.room; renderMap(); if (innerWidth < 820) $('#room-info').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
  if (e.target.id === 'hint') { st.hints[solved()]++; save(); renderSolve(); return; }
});
$('#reader').addEventListener('click', e => { if (e.target === $('#reader')) $('#reader').close(); });

const WRONG = ["That doesn't hold up. Look again.", "The evidence won't carry that. Try again.", "The Superintendent shakes his head slowly.",
  "Not quite, detectives.", "The Superintendent would send that back."];
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

(async () => {
  for (let i = 0; i < st.answers.length; i++) if (!(await applyAnswer(i, st.answers[i]))) { st.answers.length = i; break; }
  if (st.opened) $('#cover').hidden = true;
  renderAll();
  let t = 'brief'; try { t = sessionStorage.getItem(CASE.id + '-tab') || 'brief'; } catch {}
  showTab(t);
})();
