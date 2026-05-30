import { buildBatchMerkle } from "./batch.js";
import { anchorBatchRootOnce, deployBatchContract } from "../chain/deployBatchContract.js";
import type { ComponentInput } from "../index.js";
import { assembleVc, signVc } from "../../vc/index.js";
import type { AssembleVcInput, SignedVc, UnsignedVc } from "../../vc/index.js";

type BatchStudentIssuanceInput = {
  studentId: string;
  subjectDid: string;
  credentialId: string;
  degree: {
    type: string;
    name: string;
    [key: string]: unknown;
  };
  components: ComponentInput[];
};

type IssueBatchArgs = {
  chainId: string;
  rpcUrl: string;
  validFrom: string;
  students: BatchStudentIssuanceInput[];
  devBatchLimits?: boolean;
};

type IssueBatchDeps = {
  deployBatchContract?: typeof deployBatchContract;
  anchorBatchRootOnce?: typeof anchorBatchRootOnce;
  assembleVc?: (input: AssembleVcInput) => UnsignedVc;
  signVc?: typeof signVc;
};

function createPaperCredentialId(baseCredentialId: string, paperType: string): string {
  return `${baseCredentialId}:${paperType}`;
}

function formatPaperLabel(paperType: string): string {
  const labels: Record<string, string> = {
    diploma: "Diploma",
    transcript: "Transcript",
    recruiterSubmission: "Recruiter Submission",
  };
  return labels[paperType] ?? paperType;
}

export async function issueBatch(
  args: IssueBatchArgs,
  deps: IssueBatchDeps = {},
): Promise<{
  batch: {
    chainId: string;
    contractAddress: string;
    deploymentTx: string;
    anchorTx: string;
    merkleRoot: string;
    studentCount: number;
    componentCount: number;
  };
  students: Array<{
    studentId: string;
    credentialId: string;
    paperType: string;
    paperLabel: string;
    vc: SignedVc;
  }>;
}> {
  const { chainId, rpcUrl, validFrom, students, devBatchLimits } = args;
  if (students.length === 0) {
    throw new Error("issueBatch: students must not be empty");
  }
  const deployBatchContractImpl = deps.deployBatchContract ?? deployBatchContract;
  const anchorBatchRootOnceImpl = deps.anchorBatchRootOnce ?? anchorBatchRootOnce;
  const assembleVcImpl = deps.assembleVc ?? assembleVc;
  const signVcImpl = deps.signVc ?? signVc;

  const paperCredentials = students.flatMap((student) =>
    student.components.map((component) => ({
      student,
      component,
      paperType: component.name,
      paperLabel: formatPaperLabel(component.name),
      credentialId: createPaperCredentialId(student.credentialId, component.name),
      batchStudentId: `${student.studentId}:${component.name}`,
    })),
  );

  const batchMerkle = buildBatchMerkle({
    students: paperCredentials.map((paper) => ({
      studentId: paper.batchStudentId,
      credentialId: paper.credentialId,
      components: [paper.component],
    })),
  });
  const deployed = await deployBatchContractImpl({
    chainId,
    rpcUrl,
    merkleRoot: batchMerkle.batch.merkleRoot,
  });

  const anchored = await anchorBatchRootOnceImpl({
    chainId: deployed.chainId,
    rpcUrl,
    contractAddress: deployed.contractAddress,
    merkleRoot: batchMerkle.batch.merkleRoot,
  });

  const issuedStudents = await Promise.all(
    paperCredentials.map(async (paper) => {
      const batchStudent = batchMerkle.students.find((candidate) => candidate.studentId === paper.batchStudentId);
      if (!batchStudent) {
        throw new Error(`issueBatch: missing batch merkle result for paper ${paper.batchStudentId}`);
      }

      const unsigned = assembleVcImpl({
        credentialId: paper.credentialId,
        validFrom,
        subjectDid: paper.student.subjectDid,
        degree: {
          ...paper.student.degree,
          "iu:paperType": paper.paperType,
          "iu:paperLabel": paper.paperLabel,
        },
        components: batchStudent.receiptComponents.map((component) => ({
          name: component.name,
          mandatory: component.mandatory,
          componentType: component.componentType,
          componentHash: component.componentHash,
        })),
        merkle: {
          chainId: anchored.chainId,
          contractAddress: anchored.contractAddress,
          merkleRoot: batchMerkle.batch.merkleRoot,
          anchorTx: anchored.anchorTx,
          deploymentTx: deployed.deploymentTx,
          proofs: Object.fromEntries(
            batchStudent.receiptComponents.map((component) => [component.name, component.proof]),
          ),
        },
      });

      const vc = await signVcImpl(unsigned);
      return {
        studentId: paper.student.studentId,
        credentialId: paper.credentialId,
        paperType: paper.paperType,
        paperLabel: paper.paperLabel,
        vc,
      };
    }),
  );

  return {
    batch: {
      chainId: anchored.chainId,
      contractAddress: anchored.contractAddress,
      deploymentTx: deployed.deploymentTx,
      anchorTx: anchored.anchorTx,
      merkleRoot: batchMerkle.batch.merkleRoot,
      studentCount: students.length,
      componentCount: batchMerkle.batch.componentCount,
    },
    students: issuedStudents,
  };
}
