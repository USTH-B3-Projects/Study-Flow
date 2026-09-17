import assert from "node:assert/strict";
const data = new Map();
globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
};

const auth = await import("./js/services/authService.js");
const tasks = await import("./js/services/taskService.js");
const smart = await import("./js/services/smartService.js");

assert.equal(auth.register("alice", "password1", "Alice", "Alice@example.com").success, true);
assert.equal(auth.register("bob", "password2", "Bob", "alice@example.com").success, false);
assert.equal(auth.register("ALICE", "password2", "Other Alice").success, false);
assert.equal(auth.login("alice", "password1").success, true);
assert.equal(auth.login("ALICE@EXAMPLE.COM", "password1").success, true);

localStorage.setItem("studyflow_courses", JSON.stringify([{ courseId: "course", studentId: "alice", courseName: "Test" }]));
const deadline = new Date(Date.now() + 86400000).toISOString();
const task = tasks.createTask({ courseId: "course", name: "Test task", deadline, importance: "high", currentProgress: 0 });
let derived = smart.enrich(task);
assert.equal(derived.effectiveDuration, 2);
assert.equal(derived.remainingWorkload, 2);
assert.equal(derived.hasWorkloadWarning, false);
tasks.updateTask(task.taskId, { estimatedDuration: 6, currentProgress: 25 });
derived = smart.enrich(tasks.getTaskById(task.taskId));
assert.equal(derived.remainingWorkload, 4.5);
assert.equal(derived.hasWorkloadWarning, true);
const score = derived.priorityScore;
const second = tasks.createTask({ courseId: "course", name: "Second task", deadline, importance: "low", currentProgress: 0 });
const secondScore = smart.enrich(second).priorityScore;
tasks.updateDisplayOrder([second.taskId, task.taskId]);
assert.deepEqual(tasks.getTasksByCourseId("course").sort((a, b) => a.manualOrder - b.manualOrder).map((item) => item.taskId), [second.taskId, task.taskId]);
assert.equal(smart.enrich(tasks.getTaskById(task.taskId)).priorityScore, score);
assert.equal(smart.enrich(tasks.getTaskById(second.taskId)).priorityScore, secondScore);
tasks.markTaskCompleted(task.taskId);
assert.equal(smart.rankTasks(tasks.getTasksByCourseId("course")).length, 1);
assert.equal(smart.getWorkloadWarning(tasks.getTasksByCourseId("course")).length, 0);

console.log("StudyFlow service checks passed");
