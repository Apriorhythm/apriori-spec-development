'use strict';
const fs = require('node:fs');
const path = require('node:path');

function createStore(dataDir) {
  const file = path.join(dataDir, 'polls.json');
  const data = load();

  function load() {
    if (!fs.existsSync(file)) return {};
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      const backup = `${file}.bak-${Date.now()}`;
      fs.renameSync(file, backup);
      console.error(`polls.json 损坏，已备份为 ${backup}，从空数据开始`);
      return {};
    }
  }

  function save() {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  }

  return {
    get(id) {
      return data[id];
    },
    all() {
      return data;
    },
    put(poll) {
      data[poll.id] = poll;
      save();
    },
  };
}

module.exports = { createStore };
