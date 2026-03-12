type BatchIssuanceResult = {
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
    vc: Record<string, unknown>;
  }>;
};

export function formatBatchIssuance(result: BatchIssuanceResult) {
  return {
    chainId: result.batch.chainId,
    contractAddress: result.batch.contractAddress,
    deploymentTx: result.batch.deploymentTx,
    anchorTx: result.batch.anchorTx,
    merkleRoot: result.batch.merkleRoot,
    studentCount: result.batch.studentCount,
    componentCount: result.batch.componentCount,
    students: result.students.map((student) => ({
      studentId: student.studentId,
      credentialId: student.credentialId,
      contractAddress:
        ((student.vc["iu:merkleReceipt"] as Record<string, unknown> | undefined)?.contractAddress as string | undefined)
        ?? result.batch.contractAddress,
    })),
  };
}
