import { useState, useRef, useEffect } from 'react' // new
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { css } from '@emotion/css'
import { ethers } from 'ethers'
import lighthouse from '@lighthouse-web3/sdk';

/* import contract address and contract owner address */
import {
  contractAddress
} from '../config'

import DocumentManagement from '../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'


const initialState = { expirationDate: '', drawerAddress: '', amount: '', status : 'ACTIVO', beneficiaryAddress : '', endorsements : '', creationDate : Date.now(), files : [] }



function CreateCheque() {
  /* configure initial state to be used in the component */
  const [cheque, setCheque] = useState(initialState)
  const [documentFile, setDocumentFile] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const fileRef = useRef(null)
  const { expirationDate, drawerAddress } = cheque
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => {
      /* delay rendering buttons until dynamic import is complete */
      setLoaded(true)
    }, 500)
  }, [])

  function onChange(e) {
    setCheque(() => ({ ...cheque, [e.target.name]: e.target.value }))

  }

  const encryptionSignature = async() =>{
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
      const signedMessage = await signer.signMessage(messageRequested);
      console.log('signedMessage: ', signedMessage);
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

  async function createNewCheque() {   
    /* saves cheque to ipfs then anchors to smart contract */
    try {
      if (!expirationDate || !drawerAddress) return
      /* set creation date to current timestamp */
      const hash = await saveChequeToIpfs()
      await saveCheque(hash)
      // Add document credentials by making a request to localhost:3000/api/auth/ 
      

      router.push(`/`)
    } catch (err) {
      alert(err);
      console.log(err)
    }
  }

  async function saveChequeToIpfs() {
    /* save cheque metadata to ipfs */
    try {
      const sig = await encryptionSignature();
      const chequeBlob = new Blob ([JSON.stringify(cheque)], {type: "application/json"});
      const fakeEvent = {
        target: {
          files: [chequeBlob]
        },
        persist: () => {}
      }
      // Upload cheque to IPFS
      const response = await lighthouse.uploadEncrypted(
        fakeEvent,
        sig.publicKey,
        process.env.API_KEY_LIGHTHOUSE,
        sig.signedMessage,
        progressCallback
      );
      alert('Cheque uploaded successfully!')
      // Apply cheque access conditions
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
      alert('Cheque access conditions applied successfully!')
      // Apply cover documentFile access conditions
      console.log('contractAddress: ', contractAddress)
      const sig3 = await encryptionSignature();
      const response3 = await lighthouse.accessCondition(
        sig3.publicKey,
        cheque.coverDocumentFile,
        sig3.signedMessage,
        conditions,
        aggregator
      );
      console.log('response3: ', response3)
      alert('Cover documentFile access conditions applied successfully!')
      return response.data.Hash;
    } catch (err) {
      alert(err);
      console.log(err);
    }
  }

  async function saveCheque(hash) {
    /* anchor cheque to smart contract */
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
      console.log('contract: ', contract)
      try {

        console.log('expirationDate: ', cheque.expirationDate)
        console.log('drawerAddress: ', cheque.drawerAddress)
        console.log('hash: ', hash)

        /* convert expiration date to timestamp */
        cheque.expirationDate = new Date(cheque.expirationDate).getTime()

        cheque.files = [[hash, cheque.creationDate]]
        
        const val = await contract.createCheque(cheque.expirationDate, cheque.drawerAddress, hash)
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
    alert('Cover document uploaded successfully!')
    setCheque(state => ({ ...state, coverDocumentFile: added.data.Hash }))
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
      <label className={titleStyle} style={{marginRight: '20px'}}>Expiration date:</label>
      <input
        type="date"
        onChange={onChange}
        name='expirationDate'
        value={cheque.expirationDate}
        className={titleStyle}
      />
      <br/>
      <label className={titleStyle} style={{marginRight: '20px'}}>Drawer address:</label>
      <input
        onChange={onChange}
        name='drawerAddress'
        placeholder='Enter drawer address...'
        value={cheque.drawerAddress}
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
              onClick={createNewCheque}
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

export default CreateCheque