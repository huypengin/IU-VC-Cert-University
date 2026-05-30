import type { ComponentInput } from "../core/index.js";

export type DemoCredentialPreset = {
  type: string;
  name: string;
};

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

export const DEMO_CREDENTIAL_PRESETS: DemoCredentialPreset[] = [
  { type: "BachelorDegree", name: "BSc in Computer Science" },
  { type: "MasterDegree", name: "MSc in Data Science" },
  { type: "DoctoralDegree", name: "PhD in Information Systems" },
  { type: "ProfessionalCertificate", name: "Certificate in Blockchain Systems" },
];

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
    {
      name: "recruiterSubmission",
      mandatory: false,
      componentType: "recruiterSubmissionPaper",
      content: `demo-content:recruiter-submission-${index}`,
    },
  ];
}

function createDefaultStudent(index: number): IssueBatchStudentState {
  return {
    studentId: `student-${String(index).padStart(3, "0")}`,
    subjectDid: `did:example:student${index}`,
    credentialId: `urn:uuid:example-degree-${index}`,
    degree: DEMO_CREDENTIAL_PRESETS[(index - 1) % DEMO_CREDENTIAL_PRESETS.length],
    components: createDefaultComponents(index),
  };
}

export function createDefaultIssueBatchState(): IssueBatchState {
  return {
    students: [],
  };
}

export function addStudentToIssueBatchState(state: IssueBatchState): IssueBatchState {
  return {
    students: [...state.students, createDefaultStudent(state.students.length + 1)],
  };
}

export function removeStudentFromIssueBatchState(state: IssueBatchState, studentIndex: number): IssueBatchState {
  if (state.students.length === 0) {
    throw new Error("No students to remove");
  }

  return {
    students: state.students.filter((_, index) => index !== studentIndex),
  };
}

function hasUploadedPdfEvidence(component: ComponentInput): boolean {
  try {
    const parsed = JSON.parse(component.content) as Record<string, unknown>;
    return parsed.source === "uploaded-file" && typeof parsed.filename === "string";
  } catch {
    return false;
  }
}

export function createSubmittedIssueBatchState(state: IssueBatchState): IssueBatchState {
  const students = state.students
    .map((student) => ({
      ...student,
      components: student.components.filter(hasUploadedPdfEvidence),
    }))
    .filter((student) => student.components.length > 0);

  if (students.length === 0) {
    throw new Error("Upload at least one paper PDF before issuing credentials");
  }

  return { students };
}
