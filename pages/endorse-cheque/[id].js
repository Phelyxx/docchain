import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import { css } from '@emotion/css'
import dynamic from 'next/dynamic'
import { ethers } from 'ethers'
import lighthouse from '@lighthouse-web3/sdk';

import {
  contractAddress
} from '../../config'
import DocumentManagement from '../../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'


/* define the ipfs endpoint */


const SimpleMDE = dynamic(
  () => import('react-simplemde-editor'),
  { ssr: false }
)

export default function Cheque() {
  const [cheque, setCheque] = useState(null)
  const [editing, setEditing] = useState(true)
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    fetchCheque()
  }, [id])

  const sign_auth_message = async() =>{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const publicKey = (await signer.getAddress()).toLowerCase();
    const messageRequested = (await lighthouse.getAuthMessage(publicKey)).data.message;
    const signedMessage = await signer.signMessage(
      messageRequested
    );
    return({publicKey: publicKey, signedMessage: signedMessage});
  }


  async function fetchCheque() {
    /* we first fetch the individual cheque by ipfs hash from the network */
    if (!id) return
    let provider
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'local') {
      provider = new ethers.providers.JsonRpcProvider()
    } else if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'testnet') {
      provider = new ethers.providers.JsonRpcProvider('https://rpc-mumbai.maticvigil.com')
    } else {
      provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/')
    }
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider)
    const val = await contract.getCheque(id)
    const chequeId = val[0].toNumber()

    /* next we fetch the IPFS metadata from the network */
    const { publicKey, signedMessage } = await sign_auth_message();
    const keyObject = await lighthouse.fetchEncryptionKey(
      id,
      publicKey,
      signedMessage,
    );
    const fileType = "application/json";
    const data = await lighthouse.decryptFile(id, keyObject.data.key, fileType);
    let reader = new FileReader();

    // Leer el blob como texto
    reader.readAsText(data);

    let cheque;
    
    // Cuando se termine de leer, mostrar el contenido, esperar a que termine
    await new Promise((resolve, reject) => {
      reader.onload = () => {
        cheque = JSON.parse(reader.result);
        resolve();
      };
      reader.onerror = reject;
    });
    console.log('cheque', cheque)
    /* finally we append the cheque ID to the cheque data */
    /* we need this ID to make updates to the cheque */
    if (cheque.files.length <= 0) {
      let files = []
      for (let i = 0; i < val[9].length; i++) {
        let file = [cheque.coverDocumentFile, cheque.creationDate]
        files.push(file)
      }
      cheque.files = files
    }

    cheque.id = chequeId;

    alert('Cheque fetched from the blockchain and IPFS!');

    setCheque(cheque)
  }

  const encryptionSignature = async() =>{
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
    const signedMessage = await signer.signMessage(messageRequested);
    return({
      signedMessage: signedMessage,
      publicKey: address
    });
  }

  const progressCallback = (progressData) => {
    let percentageDone =
      100 - (progressData?.total / progressData?.uploaded)?.toFixed(2);
    console.log(percentageDone);
  };


  async function saveChequeToIpfs() {
    try {
      const sig = await encryptionSignature();
      /* create a new cheque object with the updated data */
      const updatedCheque = {
        ...cheque,
        status: 'Endorsed'
      }
      if (updatedCheque.endorsements) {
        updatedCheque.endorsements = updatedCheque.beneficiaryAddress + ', ' + [updatedCheque.endorsements]
      } else {
        updatedCheque.endorsements = updatedCheque.beneficiaryAddress
      }
      const chequeBlob = new Blob ([JSON.stringify(updatedCheque)], {type: "application/json"});
      const fakeEvent = {
        target: {
          files: [chequeBlob]
        },
        persist: () => {}
      }
      const response = await lighthouse.uploadEncrypted(
        fakeEvent,
        sig.publicKey,
        process.env.API_KEY_LIGHTHOUSE,
        sig.signedMessage,
        progressCallback
      );
      alert('Endorsed cheque saved to IPFS!');
      console.log('response: ', response)
      console.log('response.data: ', response.data)
      console.log('response.data.Hash: ', response.data.Hash)
      // Apply cheque access conditions
      const conditions = [
        {
          id: 1,
          chain: "Mumbai",
          method: "canAccessFile",
          standardContractType: "Custom",
          contractAddress: contractAddress,
          returnValueTest: {
              comparator: "==",
              value: "true"
          },
          parameters: [":userAddress"],
          inputArrayType: ["address"],
          outputType: "bool",
        },
      ];
      const aggregator = "([1])";
      const sig2 = await encryptionSignature();
      const response2 = await lighthouse.accessCondition(
        sig2.publicKey,
        response.data.Hash,
        sig2.signedMessage,
        conditions,
        aggregator
      )
      alert('Cheque access conditions applied!');
      console.log('response2: ', response2)
      // // Apply cover document access conditions
      // const sig3 = await encryptionSignature();
      // const response3 = await lighthouse.accessCondition(
      //   sig3.publicKey,
      //   cheque.coverDocumentFile,
      //   sig3.signedMessage, 
      //   conditions,
      //   aggregator
      // )
      // alert('Cover document access conditions applied!');
      // console.log('response3: ', response3)
      return response.data.Hash;
    } catch (err) {
      console.log('error: ', err)
    }
  }

  async function updateCheque() {
    const hash = await saveChequeToIpfs()
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
    console.log('cheque.id: ', cheque.id)
    console.log('cheque.beneficiaryAddress: ', cheque.beneficiaryAddress)
    console.log('cheque.amount: ', cheque.amount)
    await contract.addEndorsement(cheque.id, cheque.beneficiaryAddress, cheque.amount, hash)
    router.push('/')
  }

  if (!cheque) return null

  return (
    <div className={container}>
      {
      /* editing state will allow the user to toggle between */
      /*  a markdown editor and a markdown renderer */
      }
      {
        editing && (
          <div>
            <input
              onChange={e => setCheque({ ...cheque, beneficiaryAddress: e.target.value })}
              name='beneficiaryAddress'
              placeholder='Beneficiary address'
              value={cheque.beneficiaryAddress}
              className={beneficiaryAddressStyle}
              style={{width: '100%'}}
            />
            <br />
            <input
              onChange={e => setCheque({ ...cheque, amount: e.target.value })}
              name='amount'
              placeholder='Amount'
              value={cheque.amount}
              className={beneficiaryAddressStyle}
            />
            <br />
            <button className={button} onClick={updateCheque}>Endorse cheque</button>
          </div>
        )
      }
      {
        !editing && (
          <div>
            {
              cheque.coverDocumentFilePath && (
                <img
                  src={cheque.coverDocumentFilePath}
                  className={coverDocumentFileStyle}
                />
              )
            }
            <h1>{cheque.beneficiaryAddress}</h1>
            <div className={contentContainer}>
              <ReactMarkdown>{cheque.content}</ReactMarkdown>
            </div>
          </div>
        )
      }
    </div>
  )
}

const button = css`
  background-color: #F76540;
  outline: none;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  margin-right: 10px;
  margin-top : 30px;
  font-size: 18px;
  padding: 16px 70px;
  color: white;
`

const beneficiaryAddressStyle = css`
  margin-top: 40px;
  border: none;
  outline: none;
  background-color: inherit;
  font-size: 24px;
`

const mdEditor = css`
  margin-top: 40px;
`

const coverDocumentFileStyle = css`
  width: 900px;
`

const container = css`
  width: 900px;
  margin: 0 auto;
`

const contentContainer = css`
  margin-top: 60px;
  padding: 0px 40px;
  border-left: 1px solid #e7e7e7;
  border-right: 1px solid #e7e7e7;
  & img {
    max-width: 900px;
  }
`