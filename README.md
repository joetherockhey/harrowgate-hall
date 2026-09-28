# The Daily Corpse

A new ten-minute murder mystery every day, for two detectives, on a phone. Each case has three stages and a hands-on
puzzle (torn letters, Morse, spot the difference, cipher wheels, locks, timelines).

**Play today's case:** https://joetherockhey.github.io/harrowgate-hall/  (📅 Calendar for the rest of the week)

Test cases: [Test 1: The Harrowgate Hall Affair](https://joetherockhey.github.io/harrowgate-hall/test1.html) (the long one) ·
[Test 2: Death on Gull Rock](https://joetherockhey.github.io/harrowgate-hall/test2.html)

Later stages are encrypted with the previous answer, so there are no spoilers in the source.

## Adding a day
Write `src/cases/<id>.mjs` (see `src/CASE-GUIDE.md`, kept locally), build it with `node src/build.mjs cases/<id>.mjs cases/<id>.js`,
check it with `node src/check.mjs <id>`, and add a line to `days.js`. `index.html?all` previews days that haven't opened yet.
