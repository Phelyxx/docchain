import ReactMarkdown from 'react-markdown'
import { useContext, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { css } from '@emotion/css'
import { ethers } from 'ethers'
import { AccountContext } from '../../context'
import lighthouse from '@lighthouse-web3/sdk';
import { QRCode } from "react-qr-svg";

/* import contract and owner addresses */
import {
  contractAddress, ownerAddress
} from '../../config'
import DocumentManagement from '../../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'



export default function Document() {
  const account = useContext(AccountContext)
  const [document, setDocument] = useState(null)
  const [documentFile, setDocumentFile] = useState(null)
  const [userAddress, setUserAddress] = useState("")
  const [currentAddress, setCurrentAddress] = useState("")
  const [polygonWallet, setPolygonWallet] = useState("")
  const [qrCodeData, setQrCodeData] = useState("")
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    fetchDocument()
  }, [id])

  const sign_auth_message = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const publicKey = (await signer.getAddress()).toLowerCase();
    const messageRequested = (await lighthouse.getAuthMessage(publicKey)).data.message;
    const signedMessage = await signer.signMessage(
      messageRequested
    );
    return ({ publicKey: publicKey, signedMessage: signedMessage });
  }

  async function fetchDocument() {
    /* we first fetch the individual document by ipfs hash from the network */
    if (!id) return
    let provider
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'local') {
      provider = new ethers.providers.JsonRpcProvider()
    } else if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'testnet') {
      provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com")
    } else {
      provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/')
    }
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider)
    const val = await contract.getDocument(id)
    const documentId = val[0].toNumber()

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

    let document;

    // Cuando se termine de leer, mostrar el contenido, esperar a que termine
    await new Promise((resolve, reject) => {
      reader.onload = () => {
        document = JSON.parse(reader.result);
        resolve();
      };
      reader.onerror = reject;
    });
    console.log('document', document)
    /* finally we append the document ID to the document data */
    /* we need this ID to make updates to the document */
    if (document.files.length <= 0) {
      let files = []
      for (let i = 0; i < val[7].length; i++) {
        let file = [document.coverDocumentFile, document.creationDate]
        files.push(file)
      }
      document.files = files
    }

    document.id = documentId;

    
    // Request to the endpoint

    const endpoint = 'http://localhost:3000/api/auth/openDocument?documentId=' + document.creationDate + "&contractAddress=" + document.polygonSmartContractId;

    const res = await fetch(endpoint, {
      method: 'GET'
    })

    const responseBody = await res.json()

    setQrCodeData(null)

    alert('Please scan the QR code in PolygonID Wallet before proceeding.')

    setQrCodeData(JSON.stringify(responseBody).replaceAll("\\", ""))

    alert('Document fetched from the blockchain and IPFS!');

    await setTimeout(() => {
      setQrCodeData(null)
    }, 15000)

    setDocument(document)
    setCurrentAddress(publicKey)
  }

  const fileRef = useRef(null)

  if (router.isFallback) {
    return <div>Loading...</div>
  }


  console.log('document', document)

  function triggerOnChange() {
    fileRef.current.click()
  }

  const encryptionSignature = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const messageRequested = (await lighthouse.getAuthMessage(address)).data.message;
    const signedMessage = await signer.signMessage(messageRequested);
    return ({
      signedMessage: signedMessage,
      publicKey: address
    });
  }

  const progressCallback = (progressData) => {
    let percentageDone =
      100 - (progressData?.total / progressData?.uploaded)?.toFixed(2);
    console.log(percentageDone);
  };

  async function saveDocumentToIpfs() {
    /* save document metadata to ipfs */
    try {
      const sig = await encryptionSignature();
      const documentBlob = new Blob([JSON.stringify(document)], { type: "application/json" });
      const fakeEvent = {
        target: {
          files: [documentBlob]
        },
        persist: () => { }
      }
      const response = await lighthouse.uploadEncrypted(
        fakeEvent,
        sig.publicKey,
        process.env.API_KEY_LIGHTHOUSE,
        sig.signedMessage,
        progressCallback
      );
      alert('Document saved to IPFS!');
      console.log('response: ', response)
      console.log('response.data: ', response.data)
      console.log('response.data.Hash: ', response.data.Hash)
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
      // Apply cover document access conditions
      const sig3 = await encryptionSignature();
      const response3 = await lighthouse.accessCondition(
        sig3.publicKey,
        document.coverDocumentFile,
        sig3.signedMessage,
        conditions,
        aggregator
      )
      console.log('response3: ', response3)
      alert('Cover document access conditions applied successfully!')
      return response.data.Hash;
    } catch (err) {
      console.log('error: ', err)
    }
  }

  async function handleFileChange(e) {
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
    alert('Cover document saved to IPFS!');
    /* change files array of arrays to include a new array with the new file hash and creation date */
    let files = document.files
    console.log('aded', added)
    let file = [added.data.Hash, new Date().toISOString()]
    files.push(file)
    setDocument(state => ({ ...state, coverDocumentFile: added.data.Hash, files: files }))
    setDocumentFile(uploadedFile)
  }

  async function editNewDocument() {
    /* saves document to ipfs then anchors to smart contract */
    const hash = await saveDocumentToIpfs()
    await saveDocument(hash)
    router.push(`/document/${id}`)
  }


  async function saveDocument(hash) {
    /* save document metadata to smart contract */
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask first.')
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
    const transaction = await contract.updateDocumentFile(document.id, hash)
    await transaction.wait()
    alert('Document saved to the blockchain!')
  }

  async function dencryptFile(fileHash) {
    /* decrypts pdf file from ipfs */
    const fileType = "application/pdf";
    const { publicKey, signedMessage } = await sign_auth_message();
    const keyObject = await lighthouse.fetchEncryptionKey(
      fileHash,
      publicKey,
      signedMessage,
    );
    const data = await lighthouse.decryptFile(fileHash, keyObject.data.key, fileType);
    alert('Cover document decrypted!');
    console.log('data', data)
    const url = URL.createObjectURL(data);
    window.open(url);
  }

  async function saveShared() {
    try {
      const sig = await encryptionSignature();
      /* add to the document object another address in the sharedWidth array */
      console.log('document', document)
      console.log(userAddress, 'userAddress')
      console.log(document.sharedWith, 'document.sharedWith')
      const updatedDocument = {
        ...document,
        sharedWith: [...document.sharedWith, userAddress]
      }
      console.log(updatedDocument, 'updatedDocument')
      const documentBlob = new Blob([JSON.stringify(updatedDocument)], { type: "application/json" });
      const fakeEvent = {
        target: {
          files: [documentBlob]
        },
        persist: () => { }
      }
      const response = await lighthouse.uploadEncrypted(
        fakeEvent,
        sig.publicKey,
        process.env.API_KEY_LIGHTHOUSE,
        sig.signedMessage,
        progressCallback
      );
      alert('Shared document saved to IPFS!');
      console.log('response: ', response)
      console.log('response.data: ', response.data)
      console.log('response.data.Hash: ', response.data.Hash)
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
      )
      alert('Document access conditions applied!');
      console.log('response2: ', response2)
      // // Apply cover document access conditions
      // const sig3 = await encryptionSignature();
      // const response3 = await lighthouse.accessCondition(
      //   sig3.publicKey,
      //   document.coverDocumentFile,
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


  async function shareDocument() {
    // Request to the endpoint
    const endpoint = 'http://localhost:3000/api/auth/shareDocument?polygonIdWallet=' + polygonWallet.replaceAll(":", "%3A");

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "documentId": document.creationDate,
        "creationDate": convertDocumentDateToNumericalId(),
        "description": document.description,
      })
    })

    const responseBody = await res.json()

    setQrCodeData(JSON.stringify(responseBody))

    alert('Please scan the QR code in PolygonID Wallet before proceeding.')


    console.log('document.creationDate: ', document.creationDate)
    console.log('convertDocumentDateToNumericalId(): ', convertDocumentDateToNumericalId())
    console.log('document.description: ', document.description)

    const hash = await saveShared()
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
    await contract.shareDocument(document.id, userAddress, hash)
    alert('Document shared!')
    router.push(`/document/${id}`)
  }

  console.log('account', account)
  console.log('currentAddress', currentAddress)




  return (
    <div>
      {
        document && (
          <div className={container}>
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Document type: </label> <span style={{ fontSize: '1.2rem' }}>{document.documentType}</span> <br />
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Description: </label> <span style={{ fontSize: '1.2rem' }}>{document.description}</span> <br />
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Owner address: </label> <span style={{ fontSize: '1.2rem' }}>{document.ownerAddress}</span> <br />
            {document.ownerAddress === currentAddress && document.sharedWith && document.sharedWith.length > 0 && (
              <div>
                <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Shared with: </label>
                <span style={{ fontSize: '1.2rem' }}>{document.sharedWith.map((address, index) => {
                  return (
                    <div key={index}>
                      <span style={{ fontSize: '1.2rem' }}>Address {index + 1}: {address}</span>
                    </div>
                  )
                })}</span>
              </div>)
            } <br />
            {document.files && <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Document History: </label>} {document.files && <span style={{ fontSize: '1.2rem' }}>{document.files.map((file, index) => {
              return (
                <div key={index}>
                  <a onClick={() => dencryptFile(`${file[0]}`)} target="_blank" >
                    <span style={{ fontSize: '1.2rem' }}>File {index + 1}: {new Date(file[1]).toLocaleString()}</span>
                  </a>
                </div>
              )
            })}</span>} <br />

            {document.ownerAddress === currentAddress && (
              <>
                <div className={editDocument}>
                  <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Edit document file </label><br />

                  {documentFile && documentFile.name} <br />


                  <button
                    className={button}
                    onClick={triggerOnChange}
                  >
                    Select document file
                  </button>
                  <input
                    id='selectDocumentFile'
                    className={hiddenInput}
                    type='file'
                    onChange={handleFileChange}
                    ref={fileRef}
                  />
                  <button
                    className={button}
                    type='button'
                    onClick={editNewDocument}
                  >Submit</button>
                </div>
                <br />
                <div className={editDocument}>
                  <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Share file with another user </label><br />
                  <input
                    type='text'
                    className={shareInput}
                    placeholder='Enter user address'
                    name='userAddress'
                    value={userAddress}
                    onChange={e => setUserAddress(e.target.value)}
                  />
                  <br />
                  <input
                    type='text'
                    className={shareInput}
                    placeholder='Enter user Polygon ID wallet'
                    name='polygonWallet'
                    value={polygonWallet}
                    onChange={e => setPolygonWallet(e.target.value)}
                  />
                  <button
                    className={button}
                    type='button'
                    onClick={shareDocument}
                  >Share</button>
                </div>
              </>
            )
            }
          </div>
        )
      }
      {qrCodeData && (
      <div>
        <h1>Scan the QR code with Polygon</h1>
        <QRCode
          level="Q"
          style={{ width: 256 }}
          value={qrCodeData}
        />
      </div>
      )}
    </div>
  )
}

export async function getStaticPaths() {
  /* here we fetch the documents from the network */
  let provider
  if (process.env.ENVIRONMENT === 'local') {
    provider = new ethers.providers.JsonRpcProvider()
  } else if (process.env.ENVIRONMENT === 'testnet') {
    provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com")
  } else {
    provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/')
  }

  const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider)
  const parsedData = await contract.fetchDocuments()

  const parsedJSON = JSON.parse(JSON.stringify(parsedData))

  const data = parsedJSON.map(document => {
    return document.map(item => {
      if (item.type === 'BigNumber') {
        if (item === document[1]) {
          /* Convert date to string */
          const date = new Date(parseInt(item.hex, 16) * 1000).toLocaleString();
          item = date;
        } else {
          item = parseInt(item.hex, 16);
        }
      }
      return item;
    });
  });

  console.log(data)

  /* then we map over the documents and create a params object passing */
  /* the id property to getStaticProps which will run for ever document */
  /* in the array and generate a new page */
  const paths = data.map(d => ({ params: { id: d[6] } }))

  console.log(paths)

  return {
    paths,
    fallback: true
  }
}

export async function getStaticProps({ params }) {
  /* using the id property passed in through the params object */
  /* we can us it to fetch the data from IPFS and pass the */
  /* document data into the page as props */
  const { id } = params
  return {
    props: {
      id: id
    },
  }
}

const hiddenInput = css`
  display: none;
`

const editDocument = css`
  margin: 20px 0px;
`


const button = css`
  background-color: #F76540;
  outline: none;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  margin-right: 10px;
  margin-top : 10px;
  font-size: 18px;
  padding: 16px 70px;
  color: white;
`

const container = css`
  width: 900px;
  margin: 0 auto;
`

const shareInput = css`
  margin-top: 40px;
  border: none;
  outline: none;
  background-color: inherit;
  font-size: 18px;
  margin-bottom: 20px;
  width: 100%;
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