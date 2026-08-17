'use strict';
// Windows runners may refuse symlink creation (it needs a privilege the account may not hold).
// The repo's existing tests already probe rather than assume; this centralises the probe so the
// cases that NEED a symlink skip cleanly instead of failing for a reason unrelated to the code
// under test. Probed once: both a file link and a dir link, since Windows treats them differently.
const fs = require('fs');
const os = require('os');
const path = require('path');

let cached = null;
function canSymlink() {
  if (cached !== null) return cached;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-symprobe-'));
  try {
    fs.writeFileSync(path.join(d, 'f'), 'x');
    fs.mkdirSync(path.join(d, 'dir'));
    fs.symlinkSync(path.join(d, 'f'), path.join(d, 'flink'));
    fs.symlinkSync(path.join(d, 'dir'), path.join(d, 'dlink'));
    cached = true;
  } catch { cached = false; }
  try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ }
  return cached;
}
module.exports = { canSymlink };
