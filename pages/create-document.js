import { useState, useRef, useEffect } from 'react' // new
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { css } from '@emotion/css'
import { ethers } from 'ethers'
import lighthouse from '@lighthouse-web3/sdk';
import { QRCode } from "react-qr-svg";

/* import contract address and contract owner address */
import {
  contractAddress
} from '../config'

import DocumentManagement from '../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'


const initialState = { ownerAddress: '', polygonSmartContractId: '', documentType: '', description: '', creationDate : Date.now(), files : [], sharedWith : [] }


function CreateDocument() {
  /* configure initial state to be used in the component */
  const [document, setDocument] = useState(initialState)
  const [polygonIdWallet, setPolygonIdWallet] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [qrCodeData, setQrCodeData] = useState(null)

  const fileRef = useRef(null)
  const { documentType, description } = document
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => {
      /* delay rendering buttons until dynamic import is complete */
      setLoaded(true)
    }, 500)
  }, [])

  function onChange(e) {
    setDocument(() => ({ ...document, [e.target.name]: e.target.value }))
  }

  function onChangePolygonIdWallet(e) {
    setPolygonIdWallet(e.target.value)
  }

  const encryptionSignature = async() =>{
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
      const signedMessage = await signer.signMessage(messageRequested);
      return({
        signedMessage: signedMessage,
        publicKey: address
      });
    }
    catch (err) {
      alert(err);
    }
  }

   const progressCallback = (progressData) => {
    let percentageDone =
      100 - (progressData?.total / progressData?.uploaded)?.toFixed(2);
    console.log(percentageDone);
  };

  async function createNewDocument() {   
    /* saves document to ipfs then anchors to smart contract */
    try {
      if (!documentType || !description) return


      // Request to the endpoint
      //
      const endpoint = 'http://localhost:3000/api/auth/documentCredentials?polygonIdWallet=' + polygonIdWallet.replaceAll(":", "%3A");

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "documentId": document.creationDate,
          "creationDate": convertDocumentDateToNumericalId(),
          "description": document.description,
        })
      })
      const responseBody = await res.json()
      document.polygonSmartContractId = responseBody.smartContractId
      setDocument(() => (document))
      console.log(res.data)

      setQrCodeData(responseBody.data)

      alert('Please scan the QR code in PolygonID Wallet before proceeding.')

      console.log('document.creationDate: ', document.creationDate)
      console.log('convertDocumentDateToNumericalId(): ', convertDocumentDateToNumericalId())
      console.log('document.description: ', document.description)


      /* set creation date to current timestamp */
      const hash = await saveDocumentToIpfs()
      await saveDocument(hash, responseBody.smartContractId)
      router.push('/')
    } catch (err) {
      alert(err);
      console.log(err)
    }
  }

  function convertDocumentDateToNumericalId() {
    /* convert document date to numerical id */
    const date = new Date(document.creationDate)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = date.getFullYear()
    const formattedMonth = String(month + 1).padStart(2, '0');
    const id = parseInt(`${year}${formattedMonth}${day}`)
    return id
  }

  

  async function saveDocumentToIpfs() {
    /* save document metadata to ipfs */
    try {
      const sig = await encryptionSignature();
      document.ownerAddress = sig.publicKey;
      const documentBlob = new Blob ([JSON.stringify(document)], {type: "application/json"});
      const fakeEvent = {
        target: {
          files: [documentBlob]
        },
        persist: () => {}
      }
      // Upload document to IPFS
      const response = await lighthouse.uploadEncrypted(
        fakeEvent,
        sig.publicKey,
        process.env.API_KEY_LIGHTHOUSE,
        sig.signedMessage,
        progressCallback
      );
      alert('Document uploaded successfully!')
      // Apply document access conditions
      const conditions = [
        {
          id: 1,
          chain: "Mumbai",
          method: "canAccessDocument",
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
      );
      console.log('response2: ', response2)
      alert('Document access conditions applied successfully!')
      // Apply cover documentFile access conditions
      console.log('contractAddress: ', contractAddress)
      const sig3 = await encryptionSignature();
      const response3 = await lighthouse.accessCondition(
        sig3.publicKey,
        document.coverDocumentFile,
        sig3.signedMessage,
        conditions,
        aggregator
      );
      console.log('response3: ', response3)
      alert('Cover documentFile access conditions applied successfully!')
      console.log('response.data.Hash: ', response.data.Hash)
      return response.data.Hash;
    } catch (err) {
      alert(err);
      console.log(err);
    }
  }

  async function saveDocument(hash, polygonSmartContractId) {
    /* anchor document to smart contract */
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
      console.log('contract: ', contract)
      try {

        console.log('hash: ', hash)

        document.files = [[hash, document.creationDate]]

        console.log('document: ', document)
        
        const val = await contract.createDocument(document.documentType, document.description, hash, polygonSmartContractId)
        /* optional - wait for transaction to be confirmed before rerouting */
        /* await provider.waitForTransaction(val.hash) */
        console.log('val: ', val)
      } catch (err) {
        console.log('Error: ', err)
      }
    }    
  }

  function triggerOnChange() {
    /* trigger handleFileChange handler of hidden file input */
    fileRef.current.click()
  }



  async function handleFileChange (e) {
    /* upload cover documentFile to ipfs and save hash to state */
    const uploadedFile = e.target.files[0]
    
    if (!uploadedFile) return
    const sig = await encryptionSignature();
    const added = await lighthouse.uploadEncrypted(
      e,
      sig.publicKey,
      process.env.API_KEY_LIGHTHOUSE,
      sig.signedMessage,
      progressCallback
    );
    console.log(process.env.API_KEY_LIGHTHOUSE)
    alert('Cover document uploaded successfully!')
    console.log('added: ', added)
    setDocument(state => ({ ...state, coverDocumentFile: added.data.Hash }))
    setDocumentFile(uploadedFile)
  }

  return (
    <div className={container}>
      {
        documentFile && (
          <div>
            {documentFile.name}
          </div>
        )
      }
      <label className={titleStyle} style={{marginRight: '20px'}}>Document type:</label>
      <input
        onChange={onChange}
        name='documentType'
        placeholder='Enter document type...'
        value={document.documentType}
        className={titleStyle}
        style={{width: '70%'}}
      />
      <br/>
      <label className={titleStyle} style={{marginRight: '20px'}}>Description:</label>
      <input
        onChange={onChange}
        name='description'
        placeholder='Enter description...'
        value={document.description}
        className={titleStyle}
        style={{width: '70%'}}
      />
      <br/>
      <label className={titleStyle} style={{marginRight: '20px'}}>Polygon ID wallet:</label>
      <input
        onChange={onChangePolygonIdWallet}
        name='polygonIdWallet'
        placeholder='Enter Polygon ID wallet...'
        value={polygonIdWallet}
        className={titleStyle}
        style={{width: '70%'}}
      />
      <br/>
      {
        loaded && (
          <>
            <button
              className={button}
              type='button'
              onClick={createNewDocument}
            >Publish</button>
            <button
              onClick={triggerOnChange}
              className={button}
            >Add document file</button>
          </>
        )
      }
      <input
        id='selectDocumentFile'
        className={hiddenInput} 
        type='file'
        onChange={handleFileChange}
        ref={fileRef}
      />
      {qrCodeData && (
      <div>
         <h1>Scan the QR code with Polygon</h1>
         <QRCode
            level="Q"
            style={{ width: 256 }}
            value={JSON.stringify(qrCodeData)}
          />
      </div>
      )}
    </div>
  )
}

const hiddenInput = css`
  display: none;
`

const titleStyle = css`
  margin-top: 40px;
  border: none;
  outline: none;
  background-color: inherit;
  font-size: 24px;
  
`

const container = css`
  width: 900px;
  margin: 0 auto;
`

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

export default CreateDocument