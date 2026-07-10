'use strict';
const { createServer } = require('./src/server');
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || require('path').join(__dirname, 'data', 'polls');
createServer({ dataDir: DATA_DIR }).listen(PORT, () => {
  console.log(`quick-poll listening on http://localhost:${PORT}`);
});
