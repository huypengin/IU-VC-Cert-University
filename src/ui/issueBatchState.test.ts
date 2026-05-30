import test from "node:test";
import assert from "node:assert/strict";

import * as issueBatchState from "./issueBatchState.js";

test("createDefaultIssueBatchState starts with no students", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;

  assert.equal(typeof createDefaultIssueBatchState, "function");

  const state = createDefaultIssueBatchState();

  assert.equal(state.students.length, 0);
});

test("addStudentToIssueBatchState adds students with three paper credentials each", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;

  assert.equal(typeof createDefaultIssueBatchState, "function");
  assert.equal(typeof addStudentToIssueBatchState, "function");

  const state = [1, 2, 3].reduce(
    (current: any) => addStudentToIssueBatchState(current),
    createDefaultIssueBatchState(),
  );

  assert.equal(state.students.length, 3);
  assert.deepEqual(
    state.students.map((student: any) => student.components.map((component: any) => component.name)),
    [
      ["diploma", "transcript", "recruiterSubmission"],
      ["diploma", "transcript", "recruiterSubmission"],
      ["diploma", "transcript", "recruiterSubmission"],
    ],
  );
  assert.deepEqual(
    state.students.map((student: any) => student.degree.type),
    ["BachelorDegree", "MasterDegree", "DoctoralDegree"],
  );
});

test("addStudentToIssueBatchState supports adding many students", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;

  assert.equal(typeof createDefaultIssueBatchState, "function");
  assert.equal(typeof addStudentToIssueBatchState, "function");

  const withFifth = [1, 2, 3, 4, 5].reduce(
    (current: any) => addStudentToIssueBatchState(current),
    createDefaultIssueBatchState(),
  );

  assert.equal(withFifth.students.length, 5);
});

test("removeStudentFromIssueBatchState can remove draft students before issue limits are met", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;
  const removeStudentFromIssueBatchState = (issueBatchState as any).removeStudentFromIssueBatchState;

  assert.equal(typeof removeStudentFromIssueBatchState, "function");

  const withOne = addStudentToIssueBatchState(createDefaultIssueBatchState());
  const empty = removeStudentFromIssueBatchState(withOne, 0);

  assert.equal(empty.students.length, 0);
});

test("createSubmittedIssueBatchState keeps only uploaded paper components", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;
  const createSubmittedIssueBatchState = (issueBatchState as any).createSubmittedIssueBatchState;

  assert.equal(typeof createSubmittedIssueBatchState, "function");

  const withOne = addStudentToIssueBatchState(createDefaultIssueBatchState());
  const draft = {
    students: [
      {
        ...withOne.students[0],
        components: withOne.students[0].components.map((component: any) =>
          component.name === "diploma"
            ? {
                ...component,
                content: JSON.stringify({
                  source: "uploaded-file",
                  filename: "diploma.pdf",
                  mediaType: "application/pdf",
                  size: 1234,
                  dataUrl: "data:application/pdf;base64,abc",
                }),
              }
            : component,
        ),
      },
    ],
  };

  const submitted = createSubmittedIssueBatchState(draft);

  assert.equal(submitted.students.length, 1);
  assert.deepEqual(
    submitted.students[0].components.map((component: any) => component.name),
    ["diploma"],
  );
});

test("createSubmittedIssueBatchState rejects when no PDF evidence was uploaded", () => {
  const createDefaultIssueBatchState = (issueBatchState as any).createDefaultIssueBatchState;
  const addStudentToIssueBatchState = (issueBatchState as any).addStudentToIssueBatchState;
  const createSubmittedIssueBatchState = (issueBatchState as any).createSubmittedIssueBatchState;

  const draft = addStudentToIssueBatchState(createDefaultIssueBatchState());

  assert.throws(() => createSubmittedIssueBatchState(draft), /upload at least one paper pdf/i);
});
