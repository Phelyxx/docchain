const hre = require("hardhat");
const fs = require('fs');

async function main() {
  /* these two lines deploy the contract to the network */
  const DocumentManagement = await hre.ethers.getContractFactory("DocumentManagement");
  const documentManagement = await DocumentManagement.deploy();

  await documentManagement.deployed();
  console.log("DocumentManagement deployed to:", documentManagement.address);
  
  /* this code writes the contract addresses to a local */
  /* file named config.js that we can use in the app */
  fs.writeFileSync('./config.js', `
  export const contractAddress = "${documentManagement.address}"
  export const ownerAddress = "${documentManagement.signer.address}"
  `)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });