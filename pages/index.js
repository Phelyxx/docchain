import { css } from '@emotion/css'
import { useContext } from 'react'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'
import Link from 'next/link'
import { AccountContext } from '../context'

import {
  contractAddress, ownerAddress
} from '../config'

import DocumentManagement from '../artifacts/contracts/DocumentManagement.sol/DocumentManagement.json'

export default function Home(props) {
  const { parsedCheques, parsedDocuments } = props
  const account = useContext(AccountContext)

  // filter cheques in which account is drawer or beneficiary
  const filteredCheques = parsedCheques.filter(cheque => cheque[5] === account || cheque[6] === account)

  const cheques = filteredCheques.map(cheque => {
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

  // filter documents in which account is ownerAddress or is in the array of sharedWith
  console.log(parsedDocuments)
  const filteredDocuments = parsedDocuments.filter(document => document[4] === account || document[5].includes(account))

  const documents = filteredDocuments.map(document => {
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

  // for cheques and documents add an extra field to identify the type
  cheques.forEach(cheque => cheque.type = 'cheque');
  documents.forEach(document => document.type = 'document');


  const combinedData = [...cheques, ...documents].sort((a, b) => a[1] < b[1] ? 1 : -1);

  const router = useRouter()
  async function navigate(createType) {
    router.push(`/create-${createType}`)
  }

  return (
    <div>
      <div className={chequeList}>
        {
          combinedData && combinedData.length > 0 && (
          combinedData.map((item, index) => (
            <Link href={`/${item.type}/${item[6]}`} key={index}>
              <a>
                <div className={linkStyle}>
                <p className={chequeDate}>{item[1]}</p>
                  {item.type === 'document' && <p className={chequeDate}> Type: {item[2]}</p>}
                  {item.type === 'cheque' && <p className={chequeDate}> Type: Cheque</p>}
                  <div className={arrowContainer}>
                  </div>
                </div>
              </a>
            </Link>
          ))
          )
        }
        {
          (account === ownerAddress) && combinedData && !combinedData.length && (
            <div>
              <div className={buttonDiv}>
                <p className={chequeDate}>No cheques or documents found</p>
                <button className={buttonStyle} onClick={() => navigate('cheque')}>
                  Create your first cheque
                </button>
                <br />
                <button className={buttonStyle} onClick={() => navigate('document')}>
                  Create your first document
                </button>
              </div>
            </div>
          )
        }
        {
          (account != ownerAddress) && combinedData && !combinedData.length && (
            <div>
              <div className={buttonDiv}>
                <p className={chequeDate}>No documents found</p>
                <br />
                <button className={buttonStyle} onClick={() => navigate('document')}>
                  Create your first document
                </button>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

export async function getServerSideProps() {
  let provider
  if (process.env.ENVIRONMENT === 'local') {
    provider = new ethers.providers.JsonRpcProvider()
  } else if (process.env.ENVIRONMENT === 'testnet') {
    provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com")
  } else {
    provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com/')
  }

  const contract = new ethers.Contract(contractAddress, DocumentManagement.abi, provider)
  const chequesData = await contract.fetchCheques()
  const documentsData = await contract.fetchDocuments()

  return {
    props: {
      parsedCheques: JSON.parse(JSON.stringify(chequesData)),
      parsedDocuments: JSON.parse(JSON.stringify(documentsData)),
    }
  }
}

const arrowContainer = css`
  display: flex;
  flex: 1;
  justify-content: flex-end;
  padding-right: 20px;
`

const chequeDate = css`
  font-size: 30px;
  font-weight: bold;
  cursor: pointer;
  margin: 0;
  padding: 8px;
  color: #023e8a;
`

const linkStyle = css`
  border: 1px solid #ddd;
  margin-top: 20px;
  border-radius: 8px;
  display: flex;
`

const chequeList = css`
  width: 700px;
  margin: 0 auto;
  padding-top: 50px;  
`

const buttonStyle = css`
  background-color: #F76540;
  outline: none;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 18px;
  padding: 16px 50px;
  color: white;
  margin-top: 30px;
`

const buttonDiv = css`
  justify-content: center;
  /* spacing between buttons */
  > * {
    margin: 20px 10px;
  }

`