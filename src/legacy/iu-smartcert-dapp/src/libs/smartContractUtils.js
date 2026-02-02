export const revokeCertificate = async (
  _hashedCert,
  _reasonForRevoke,
  account,
  MyContract,
  selectedAddress,
) => {
  console.log(_hashedCert, account, MyContract);

  const receipt = await MyContract.methods
    .revokeCertificate(_hashedCert, _reasonForRevoke)
    .send({ from: account })
    .on('receipt', function (receipt) {
      console.log("Revoked succesfully. Gas used: ", receipt.gasUsed);
    }
    )
    .on('error', function (error, receipt) {
      console.log(error);
      return receipt;
    }
    );

  return receipt;
};

export const getInstituteInfo = async MyContract => {
  // console.log(props)
  const result = await MyContract.methods.institute().call();
  const owner = await MyContract.methods.getOwner().call();
  const MTRoot = await MyContract.methods.MTRoot().call();

  //TODO: use name instead of index
  return { 0: result, 4: owner, 5: MyContract.options.address, 6: MTRoot };
};

// export const getRoot = async MyContract => {
//   const result = await MyContract.methods.getRoot().call();
//   console.log('getRoot func: ', result);
//   return result;
// };

export const getOwner = async MyContract => {
  const result = await MyContract.methods.getOwner().call();
  console.log('getOwner func: ', result);
  return result;
}

export const verifyWithRevocationList = async (_certificateSection, MyContract) => {
  const result = await MyContract.methods.isValid(_certificateSection).call();
  console.log(result);
  return result;
};

// export const getAccountTransactions = async (accAddress, startBlockNumber) => {
//   // You can do a NULL check for the start/end blockNumber
//   const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
//   const array = [];
//   for (let i = startBlockNumber; i <= startBlockNumber + 9000; i++) {
//     web3.eth.getBlock(i, true, (err, block) => {
//       if (block != null) {
//         block.transactions.forEach(async e => {
//           console.log('not this one');
//           if (accAddress === e.from) {
//             const receipt = await web3.eth.getTransactionReceipt(e.hash);
//             array.push(receipt.contractAddress);
//             console.log(
//               'created contract Address: ',
//               e,
//               receipt.contractAddress,
//             );
//           }
//         });
//       }
//     });
//   }
//   return array;
// };

// export const setContractAddress = (contractAddress, account) => {
//   const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
//   const rootContract = new web3.eth.Contract(rootAbi, rootAddressLocal);

//   rootContract.methods
//     .setContractAddress(contractAddress)
//     .send({ from: account })
//     .then(async result => {
//       console.log('set roi nha', result);
//       const address = await rootContract.methods
//         .getContractAddressList()
//         .call();
//       console.log('result of contract list here when set', address);
//     });
// };

// export const getContractAddressList = async () => {
//   const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
// //  console.log('web', web3);
// //  const rootContract = new web3.eth.Contract(rootAbi, rootAddressLocal);
// //  const result = await rootContract.methods.getContractAddressList().call();
//   console.log('result of contract list here', result);
//   return result;
// };
