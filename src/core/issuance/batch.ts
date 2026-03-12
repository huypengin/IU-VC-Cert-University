import { hashComponents } from "../hashing/hashComponents.js";
import { buildMerkle } from "../merkle/merkle.js";
import type { ComponentInput } from "../index.js";

type BatchStudentInput = {
  studentId: string;
  credentialId: string;
  components: ComponentInput[];
};

type BatchReceiptComponent = {
  leafKey: string;
  name: string;
  mandatory: boolean;
  componentType: string;
  componentHash: string;
  proof: string[];
};

type StudentBatchMerkleResult = {
  studentId: string;
  credentialId: string;
  merkleRoot: string;
  receiptComponents: BatchReceiptComponent[];
};

export function buildBatchMerkle(args: {
  students: BatchStudentInput[];
}): {
  batch: {
    studentCount: number;
    componentCount: number;
    merkleRoot: string;
  };
  students: StudentBatchMerkleResult[];
} {
  const { students } = args;
  if (students.length === 0) {
    throw new Error("buildBatchMerkle: students must not be empty");
  }

  const seenLeafKeys = new Set<string>();
  const leaves: Array<{ name: string; hash: string }> = [];
  const studentResults = students.map((student) => {
    const hashedComponents = hashComponents({
      credentialId: student.credentialId,
      components: student.components,
      hashAlg: "sha256",
      leafEncoding: "credentialID||componentType||content",
    });

    const receiptComponents = hashedComponents.map((component) => {
      const leafKey = `${student.studentId}:${component.name}`;
      if (seenLeafKeys.has(leafKey)) {
        throw new Error(`buildBatchMerkle: duplicate leaf key: ${leafKey}`);
      }
      seenLeafKeys.add(leafKey);
      leaves.push({ name: leafKey, hash: component.componentHash });

      return {
        leafKey,
        name: component.name,
        mandatory: component.mandatory,
        componentType: component.componentType,
        componentHash: component.componentHash,
        proof: [],
      };
    });

    return {
      studentId: student.studentId,
      credentialId: student.credentialId,
      merkleRoot: "",
      receiptComponents,
    };
  });

  const { merkleRoot, proofs } = buildMerkle({ leaves });

  return {
    batch: {
      studentCount: students.length,
      componentCount: leaves.length,
      merkleRoot,
    },
    students: studentResults.map((student) => ({
      ...student,
      merkleRoot,
      receiptComponents: student.receiptComponents.map((component) => ({
        ...component,
        proof: proofs[component.leafKey],
      })),
    })),
  };
}
