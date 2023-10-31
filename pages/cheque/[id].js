import ReactMarkdown from 'react-markdown'
import { useContext, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { css } from '@emotion/css'
import { ethers } from 'ethers'
import { AccountContext } from '../../context'
import lighthouse from '@lighthouse-web3/sdk';

/* import contract and owner addresses */
import {
  contractAddress, ownerAddress
} from '../../config'
import DocumentManagement from '../../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'



export default function Cheque() {
  const account = useContext(AccountContext)
  const [cheque, setCheque] = useState(null)
  const [documentFile, setDocumentFile] = useState(null)
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    fetchCheque()
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

  async function fetchCheque() {
    /* we first fetch the individual cheque by ipfs hash from the network */
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

  const fileRef = useRef(null)

  if (router.isFallback) {
    return <div>Loading...</div>
  }


  console.log('cheque', cheque)

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

  async function saveChequeToIpfs() {
    /* save cheque metadata to ipfs */
    try {
      const sig = await encryptionSignature();
      const chequeBlob = new Blob([JSON.stringify(cheque)], { type: "application/json" });
      const fakeEvent = {
        target: {
          files: [chequeBlob]
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
      alert('Cheque saved to IPFS!');
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
      );
      console.log('response2: ', response2)
      alert('Cheque access conditions applied successfully!')
      // Apply cover document access conditions
      const sig3 = await encryptionSignature();
      const response3 = await lighthouse.accessCondition(
        sig3.publicKey,
        cheque.coverDocumentFile,
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
    let files = cheque.files
    console.log('aded', added)
    let file = [added.data.Hash, new Date().toISOString()]
    files.push(file)
    setCheque(state => ({ ...state, coverDocumentFile: added.data.Hash, files: files }))
    setDocumentFile(uploadedFile)
  }

  async function editNewCheque() {
    /* saves cheque to ipfs then anchors to smart contract */
    const hash = await saveChequeToIpfs()
    await saveCheque(hash)
    router.push(`/cheque/${id}`)
  }


  async function saveCheque(hash) {
    /* save cheque metadata to smart contract */
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask first.')
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, signer)
    const transaction = await contract.updateChequeFile(cheque.id, hash)
    await transaction.wait()
    alert('Cheque saved to the blockchain!')
  }

  async function decryptFile(fileHash) {
    /* decrypts file from ipfs */
    const fileType = "application/pdf";
    const { publicKey, signedMessage } = await encryptionSignature();
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


  return (
    <div>
      {
        cheque && (
          <div className={container}>
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Expiration date: </label> <span style={{ fontSize: '1.2rem' }}>{cheque.expirationDate}</span> <br />
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Status: </label> <span style={{ fontSize: '1.2rem' }}>{cheque.status}</span> <br />
            <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Drawer: </label> <span style={{ fontSize: '1.2rem' }}>{cheque.drawerAddress}</span> <br />
            {cheque.beneficiaryAddress && <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Beneficiary: </label>} {cheque.beneficiaryAddress && <span style={{ fontSize: '1.2rem' }}>{cheque.beneficiaryAddress}</span>} <br />
            {cheque.amount && <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Amount: </label>} {cheque.amount && <span style={{ fontSize: '1.2rem' }}>{cheque.amount}</span>} <br />
            {cheque.endorsements && <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Endorsements: </label>} {cheque.endorsements && <span style={{ fontSize: '1.2rem' }}>{cheque.endorsements}</span>} <br />
            {/* cheque.files is an array of arrays, each subarray contains the file hash and the timestamp of when the file was uploaded, display the timestamp converted to a date that has also the time of the day with a link to the file that is https://ipfs.io/ipfs/hash*/}
            {cheque.files && <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}> Document History: </label>} {cheque.files && <span style={{ fontSize: '1.2rem' }}>{cheque.files.map((file, index) => {
              return (
                <div key={index}>
                  <a onClick={() => decryptFile(`${file[0]}`)} target="_blank" >
                    <span style={{ fontSize: '1.2rem' }}>File {index + 1}: {new Date(file[1]).toLocaleString()}</span>
                  </a>
                </div>
              )
            })}</span>} <br />

            {
              <>
                <div className={editCheque}>
                  <Link href={`/endorse-cheque/${id}`}>
                    <button className={button}>Endorse cheque</button>
                  </Link>
                </div>
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
                    onClick={editNewCheque}
                  >Submit</button>
                </div>
              </>
            }
          </div>
        )
      }
    </div>
  )
}

export async function getStaticPaths() {
  /* here we fetch the cheques from the network */
  let provider
  if (process.env.ENVIRONMENT === 'local') {
    provider = new ethers.providers.JsonRpcProvider()
  } else if (process.env.ENVIRONMENT === 'testnet') {
    provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com")
  } else {
    provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/')
  }

  const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider)
  const parsedData = await contract.fetchCheques()

  const parsedJSON = JSON.parse(JSON.stringify(parsedData))

  const data = parsedJSON.map(cheque => {
    return cheque.map(item => {
      if (item.type === 'BigNumber') {
        if (item === cheque[1]) {
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

  /* then we map over the cheques and create a params object passing */
  /* the id property to getStaticProps which will run for ever cheque */
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
  /* cheque data into the page as props */
  console.log(params)
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

const editCheque = css`
  margin: 20px 0px;
`

const editDocument = css`
  margin-top: 100px;
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

const contentContainer = css`
  margin-top: 60px;
  padding: 0px 40px;
  border-left: 1px solid #e7e7e7;
  border-right: 1px solid #e7e7e7;
  & img {
    max-width: 900px;
  }
`