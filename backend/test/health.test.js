const test = require('node:test');
const assert = require('node:assert/strict');
test('application has a health route', async () => {
  const app = require('../src/server');
  assert.equal(typeof app, 'function');
});
