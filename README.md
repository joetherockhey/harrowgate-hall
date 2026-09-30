# The Daily Corpse

A trail of ten-minute murder mysteries to solve alone or with friends, on a phone. Solve one to open the next. Each case has three stages and a hands-on
puzzle (torn letters, Morse, spot the difference, cipher wheels, locks, timelines).

**Play:** https://joetherockhey.github.io/harrowgate-hall/

Test cases: [Test 1: The Harrowgate Hall Affair](https://joetherockhey.github.io/harrowgate-hall/test1.html) (the long one) ·
[Test 2: Death on Gull Rock](https://joetherockhey.github.io/harrowgate-hall/test2.html)

Later stages are encrypted with the previous answer, so there are no spoilers in the source.

## Adding a case
Write `src/cases/<id>.mjs` (see `src/CASE-GUIDE.md`, kept locally), build it with `node src/build.mjs cases/<id>.mjs cases/<id>.js`,
check it with `node src/check.mjs <id>`, and add a line to `levels.js` (order = play order). `index.html?all` opens every case.
