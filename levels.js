// The case series, in order. pic = the scene photo in img/<id>/ used on the case board (or photo = a full path); href = a case with its own page. Each case opens once the one before it is solved. Add a line here and a cases/<id>.js file to add a case.
window.SITE = 'The Daily Corpse';
// An optional five-minute warm-up sits at the foot of the board. It never locks anything.
window.WARMUP = { id: 'd-warmup', photo: 'img/aerial-harrowgate.jpg', title: 'The Harrowgate Hall Affair', tagline: 'Yorkshire moors, 1930. A warm-up: two clocks, one lie, five minutes.' };
window.LEVELS = [
  { id: 'gullrock', href: 'test2.html', photo: 'img/aerial-gullrock.jpg', title: 'Death on Gull Rock', tagline: 'Cornish lighthouse, 1978. Everyone says he fell.' },
  { id: 'd-sleeper', pic: 'tunnel',  title: 'The Simplon Sleeper',       tagline: 'Alpine express, 1927. A torn letter in the dining car.' },
  { id: 'd-bluenote', pic: 'bar', title: 'Last Set at the Blue Lamp', tagline: 'Soho jazz cellar, 1962. A setlist in code.' },
  { id: 'd-icehut', pic: 'porch',   title: 'Silence at Station Nine',   tagline: 'Antarctic hut, 1957. The radio is still tapping.' },
  { id: 'd-circus', pic: 'tent',   title: 'The Fortune Teller’s Tent', tagline: 'Travelling circus, 1894. Something is missing from the photograph.' },
  { id: 'd-studio', pic: 'camera',   title: 'Dead Air',                  tagline: 'Live TV studio, 1985. Put the tapes in order.' },
  { id: 'd-palazzo', pic: 'ballroom',  title: 'Masks at the Palazzo',      tagline: 'Venice carnival, 1761. A portrait torn to pieces.' },
  { id: 'd-tomb', pic: 'chamber',     title: 'The Seventh Chamber',       tagline: 'Valley of the Kings, 1923. The strongbox has a code.' },
];
// The long Harrowgate Hall Affair (test1.html) is off the board for now; the warm-up is its short version.
window.TESTS = [];
// Progress lives in each case's own save (<id>-v1). ?all opens every case (for testing).
// ponytail: locking is in the browser only; anyone reading cases/ can peek at stage I early.
window.caseSave = id => { try { return JSON.parse(localStorage.getItem(id + '-v1')) || {}; } catch { return {}; } };
window.solvedCase = id => caseSave(id).answers?.length === 3;
window.caseStars = id => { const s = caseSave(id); return solvedCase(id) ? Math.max(1, [0, 1, 2].filter(i => !s.wrong?.[i] && !s.hints?.[i]).length) : 0; };
window.levelOpen = i => /[?&]all\b/.test(location.search) || i === 0 || solvedCase(LEVELS[i - 1].id);
