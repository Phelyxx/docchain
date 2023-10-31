import { ethers } from 'ethers';
import DocumentManagement from '../../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json';
import lighthouse from '@lighthouse-web3/sdk';
import fs from 'fs';

export default async function fetchDocument(req, res) {
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ error: 'Missing document ID' });
    return;
  }

  try {

  let provider;
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'local') {
    provider = new ethers.providers.JsonRpcProvider();
  } else if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'testnet') {
    provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com");
  } else {
    provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/');
  }

  const contractAddress = '0x9Cbf7C00a25B375B778Afce7f9d90F614d0Efd92'; // Replace with your contract address
  const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider);
  console.log("Contract", contract);
  const val = await contract.getDocument(id);
  console.log("Val", val);
  const documentId = val[0].toNumber();

  // Fetch IPFS metadata
  console.log("lighthouse1");
  const { publicKey, signedMessage } = await sign_auth_message();
  console.log("lighthouse2");
  console.log('publicKey', publicKey);
  console.log('signedMessage', signedMessage);
  const keyObject = await lighthouse.fetchEncryptionKey(id, publicKey, signedMessage);
  console.log("lighthouse3");
  const fileType = "application/json";
  console.log("lighthouse4");
  const data = await lighthouse.decryptFile(id, keyObject.data.key, fileType);
  console.log("lighthouse5");

  console.log("burger")

  console.log("data", data);

  const dataBuffer = Buffer.from(data);

  console.log("dataBuffer", dataBuffer);

  let document;

  // Leer el buffer como texto
  document = JSON.parse(dataBuffer.toString());

  console.log('document', document);

  // Append the document ID to the document data
  // We need this ID to make updates to the document
  if (document.files.length <= 0) {
    let files = [];
    for (let i = 0; i < val[7].length; i++) {
      let file = [document.coverDocumentFile, document.creationDate];
      files.push(file);
    }
    document.files = files;
  }

  document.id = documentId;

  // Request to the endpoint
  const endpoint = `http://localhost:3000/api/auth/openDocument?documentId=${document.creationDate}&contractAddress=${document.polygonSmartContractId}`;
  const apiRes = await fetch(endpoint, { method: 'GET' });
  const responseBody = await apiRes.json();
  
  console.log('responseBody', responseBody);

  console.log('Document fetched from the blockchain and IPFS!');

  res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
}

const sign_auth_message = async () => {
  const provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com"); // Replace with your RPC provider URL
  const privateKey = "0300fbed25f36daf92ab406b2c20f9398b863645038acc9179856c3fea57f91a"; // Replace with the private key of the predefined user

  const wallet = new ethers.Wallet(privateKey, provider);
  const publicKey = wallet.address.toLowerCase();

  const messageRequested = (await lighthouse.getAuthMessage(publicKey)).data.message;
  const signedMessage = await wallet.signMessage(messageRequested);

  return { publicKey: publicKey, signedMessage: signedMessage };
};
