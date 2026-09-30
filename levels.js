// The case series, in order. Each case opens once the one before it is solved. Add a line here and a cases/<id>.js file to add a case.
window.SITE = 'The Daily Corpse';
window.LEVELS = [
  { id: 'd-sleeper',  title: 'The Simplon Sleeper',       tagline: 'Alpine express, 1927. A torn letter in the dining car.' },
  { id: 'd-bluenote', title: 'Last Set at the Blue Lamp', tagline: 'Soho jazz cellar, 1962. A setlist in code.' },
  { id: 'd-icehut',   title: 'Silence at Station Nine',   tagline: 'Antarctic hut, 1957. The radio is still tapping.' },
  { id: 'd-circus',   title: 'The Fortune Teller’s Tent', tagline: 'Travelling circus, 1894. Something is missing from the photograph.' },
  { id: 'd-studio',   title: 'Dead Air',                  tagline: 'Live TV studio, 1985. Put the tapes in order.' },
  { id: 'd-palazzo',  title: 'Masks at the Palazzo',      tagline: 'Venice carnival, 1761. A portrait torn to pieces.' },
  { id: 'd-tomb',     title: 'The Seventh Chamber',       tagline: 'Valley of the Kings, 1923. The strongbox has a code.' },
];
window.TESTS = [
  { n: 1, id: 'harrowgate', href: 'test1.html', title: 'The Harrowgate Hall Affair', tagline: 'The long one. About half an hour.' },
  { n: 2, id: 'gullrock',   href: 'test2.html', title: 'Death on Gull Rock',         tagline: 'The first short case.' },
];
// Progress lives in each case's own save (<id>-v1). ?all opens every case (for testing).
// ponytail: locking is in the browser only; anyone reading cases/ can peek at stage I early.
window.caseSave = id => { try { return JSON.parse(localStorage.getItem(id + '-v1')) || {}; } catch { return {}; } };
window.solvedCase = id => caseSave(id).answers?.length === 3;
window.caseStars = id => { const s = caseSave(id); return solvedCase(id) ? Math.max(1, [0, 1, 2].filter(i => !s.wrong?.[i] && !s.hints?.[i]).length) : 0; };
window.levelOpen = i => /[?&]all\b/.test(location.search) || i === 0 || solvedCase(LEVELS[i - 1].id);
