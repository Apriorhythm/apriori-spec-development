'use strict';
const fs = require('node:fs');
const path = require('node:path');

// io 仅用于测试的故障注入（缺省 = 真实 fs），见 apriori/changes/vote-dedup/design.md §2。
function createStore(dataDir, io = {}) {
  const writeFileSync = io.writeFileSync || fs.writeFileSync;
  const renameSync = io.renameSync || fs.renameSync;
  const file = path.join(dataDir, 'polls.json');
  let data = load();

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

  function save(snapshot) {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
    renameSync(tmp, file);
  }

  return {
    get(id) {
      return data[id];
    },
    all() {
      return data;
    },
    // 写后提交：先落盘快照，成功后才替换内存引用——落盘抛错时内存保持原样。
    put(poll) {
      const snapshot = { ...data, [poll.id]: poll };
      save(snapshot);
      data = snapshot;
    },
  };
}

module.exports = { createStore };
