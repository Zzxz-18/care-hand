const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadStore() {
  const values = new Map();
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const window = { localStorage };
  vm.runInNewContext(fs.readFileSync(path.join(root, "storage.js"), "utf8"), { window, Date, JSON, String });
  return { store: window.CareStore, localStorage };
}

test("Demo data includes a family, members, care records, tasks and empty handoff history", () => {
  const { store } = loadStore();
  const state = store.read();
  assert.equal(state.family.demo, true);
  assert.ok(state.members.length >= 2);
  assert.ok(state.records.length > 0);
  assert.ok(state.tasks.length > 0);
  assert.deepEqual(Array.from(state.handoffs), []);
  assert.ok(state.records.every((record) => record.date === store.localDay()));
});

test("writes persist records, task changes and handoff confirmations", () => {
  const { store } = loadStore();
  const state = store.read();
  state.records.push({ id: "record-test", content: "測試紀錄" });
  state.tasks[0].status = "done";
  state.handoffs.push({ id: "handoff-test", confirmedBy: state.members[0].id, confirmedAt: new Date().toISOString() });
  assert.equal(store.write(state), "localStorage");
  const reloaded = store.read();
  assert.ok(reloaded.records.some((record) => record.id === "record-test"));
  assert.equal(reloaded.tasks[0].status, "done");
  assert.equal(reloaded.handoffs[0].id, "handoff-test");
});

test("reset restores the demo starting state", () => {
  const { store } = loadStore();
  const state = store.read();
  state.records = [];
  state.tasks = [];
  state.handoffs = [{ id: "handoff-test" }];
  store.write(state);
  const reset = store.reset();
  assert.ok(reset.records.length > 0);
  assert.ok(reset.tasks.length > 0);
  assert.deepEqual(Array.from(reset.handoffs), []);
});

test("the interface exposes all requested MVP views and native form validation", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const view of ["home", "records", "tasks", "handoff", "history", "members"]) {
    assert.match(html, new RegExp(`id="view-${view}"`));
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
  assert.match(html, /id="confirm-handoff"/);
  assert.match(fs.readFileSync(path.join(root, "app.js"), "utf8"), /reportValidity\(\)/);
});
