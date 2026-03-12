import test from "node:test";
import assert from "node:assert/strict";

import * as issueBatchState from "./issueBatchState.js";

test("createDefaultIssueBatchState returns 3 students with diploma and transcript components", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;

  assert.equal(typeof createDefaultIssueBatchState, "function");

  const state = createDefaultIssueBatchState();

  assert.equal(state.students.length, 3);
  assert.deepEqual(
    state.students.map((student: any) => student.components.map((component: any) => component.name)),
    [
      ["diploma", "transcript"],
      ["diploma", "transcript"],
      ["diploma", "transcript"],
    ],
  );
});

test("addStudentToIssueBatchState rejects when adding a fifth student", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;

  assert.equal(typeof createDefaultIssueBatchState, "function");
  assert.equal(typeof addStudentToIssueBatchState, "function");

  const state = createDefaultIssueBatchState();
  const withFourth = addStudentToIssueBatchState(state);

  assert.equal(withFourth.students.length, 4);
  assert.throws(() => addStudentToIssueBatchState(withFourth), /3-4 students/i);
});
