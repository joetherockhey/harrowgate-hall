# The Daily Corpse

A trail of ten-minute murder mysteries to solve alone or with friends, on a phone. Solve one to open the next. Each case has three stages and a hands-on
puzzle (torn letters, Morse, spot the difference, cipher wheels, locks, timelines).

**Play:** https://joetherockhey.github.io/harrowgate-hall/ (the landing page; the case board is board.html)

Start with the five-minute warm-up (a short cut of The Harrowgate Hall Affair), then Case 1, Death on Gull Rock.
The original long [Harrowgate Hall Affair](https://joetherockhey.github.io/harrowgate-hall/test1.html) is off the board for now.

Later stages are encrypted with the previous answer, so there are no spoilers in the source.

## Adding a case
Write `src/cases/<id>.mjs` (see `src/CASE-GUIDE.md`, kept locally), build it with `node src/build.mjs cases/<id>.mjs cases/<id>.js`,
check it with `node src/check.mjs <id>`, and add a line to `levels.js` (order = play order). `index.html?all` opens every case.
