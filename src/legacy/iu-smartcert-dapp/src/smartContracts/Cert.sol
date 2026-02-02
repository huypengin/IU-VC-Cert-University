//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.9.0;
import './Ownable.sol';

contract Cert is Ownable {
  bytes32 public immutable institute;
  bytes32 public immutable MTRoot;
  mapping(bytes32 => string) revocationList;

  constructor(bytes32 _institute, bytes32 _MTRoot) {
    institute = _institute;
    MTRoot = _MTRoot;
  }

  function revokeCertificate(
    bytes32 credentialMandatoryComponent,
    string memory reason
  ) public onlyOwner {
    revocationList[credentialMandatoryComponent] = reason;
  }

  function isValid(bytes32 credentialMandatoryComponent)
    public view
    returns (bool, string memory)
  {
    if (bytes(revocationList[credentialMandatoryComponent]).length > 0) {
      return (false, revocationList[credentialMandatoryComponent]);
    }
    return (true, 'valid');
  }

  function verify(bytes32[] memory proof, bytes32 leaf)
    public view
    returns (bool)
  {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i];

      if (computedHash < proofElement) {
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
    }
    return computedHash == MTRoot;
  }
}
