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
};

type IssueBatchDeps = {
  deployBatchContract?: typeof deployBatchContract;
  anchorBatchRootOnce?: typeof anchorBatchRootOnce;
  assembleVc?: (input: AssembleVcInput) => UnsignedVc;
  signVc?: typeof signVc;
};

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
    vc: SignedVc;
  }>;
}> {
  const { chainId, rpcUrl, validFrom, students } = args;
  if (students.length === 0) {
    throw new Error("issueBatch: students must not be empty");
  }

  const deployBatchContractImpl = deps.deployBatchContract ?? deployBatchContract;
  const anchorBatchRootOnceImpl = deps.anchorBatchRootOnce ?? anchorBatchRootOnce;
  const assembleVcImpl = deps.assembleVc ?? assembleVc;
  const signVcImpl = deps.signVc ?? signVc;

  const batchMerkle = buildBatchMerkle({
    students: students.map((student) => ({
      studentId: student.studentId,
      credentialId: student.credentialId,
      components: student.components,
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
    students.map(async (student) => {
      const batchStudent = batchMerkle.students.find((candidate) => candidate.studentId === student.studentId);
      if (!batchStudent) {
        throw new Error(`issueBatch: missing batch merkle result for student ${student.studentId}`);
      }

      const unsigned = assembleVcImpl({
        credentialId: student.credentialId,
        validFrom,
        subjectDid: student.subjectDid,
        degree: student.degree,
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
        studentId: student.studentId,
        credentialId: student.credentialId,
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
      studentCount: batchMerkle.batch.studentCount,
      componentCount: batchMerkle.batch.componentCount,
    },
    students: issuedStudents,
  };
}
