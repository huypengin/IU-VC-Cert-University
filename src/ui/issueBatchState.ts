import type { ComponentInput } from "../core/index.js";

export type IssueBatchStudentState = {
  studentId: string;
  subjectDid: string;
  credentialId: string;
  degree: {
    type: string;
    name: string;
  };
  components: ComponentInput[];
};

export type IssueBatchState = {
  students: IssueBatchStudentState[];
};

const MIN_STUDENTS = 3;
const MAX_STUDENTS = 4;

function createDefaultComponents(index: number): ComponentInput[] {
  return [
    {
      name: "diploma",
      mandatory: true,
      componentType: "degreeCertificate",
      content: `demo-content:diploma-${index}`,
    },
    {
      name: "transcript",
      mandatory: false,
      componentType: "academicTranscript",
      content: `demo-content:transcript-${index}`,
    },
  ];
}

function createDefaultStudent(index: number): IssueBatchStudentState {
  return {
    studentId: `student-${String(index).padStart(3, "0")}`,
    subjectDid: `did:example:student${index}`,
    credentialId: `urn:uuid:example-degree-${index}`,
    degree: {
      type: "BachelorDegree",
      name: "BSc in Computer Science",
    },
    components: createDefaultComponents(index),
  };
}

export function createDefaultIssueBatchState(): IssueBatchState {
  return {
    students: Array.from({ length: MIN_STUDENTS }, (_, index) => createDefaultStudent(index + 1)),
  };
}

export function addStudentToIssueBatchState(state: IssueBatchState): IssueBatchState {
  if (state.students.length >= MAX_STUDENTS) {
    throw new Error("Small-batch dev flow supports only 3-4 students");
  }

  return {
    students: [...state.students, createDefaultStudent(state.students.length + 1)],
  };
}

export function removeStudentFromIssueBatchState(state: IssueBatchState, studentIndex: number): IssueBatchState {
  if (state.students.length <= MIN_STUDENTS) {
    throw new Error("Small-batch dev flow supports only 3-4 students");
  }

  return {
    students: state.students.filter((_, index) => index !== studentIndex),
  };
}
