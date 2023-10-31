import {
  ChequeCreated as ChequeCreatedEvent,
  ChequeUpdated as ChequeUpdatedEvent
} from "../generated/DocumentManagement/DocumentManagement"
import {
  Cheque
} from "../generated/schema"
import { ipfs, json } from '@graphprotocol/graph-ts'

export function handleChequeCreated(event: ChequeCreatedEvent): void {
  let cheque = new Cheque(event.params.id.toString());
  cheque.title = event.params.title;
  cheque.contentHash = event.params.hash;
  let data = ipfs.cat(event.params.hash);
  if (data) {
    let value = json.fromBytes(data).toObject()
    if (value) {
      const content = value.get('content')
      if (content) {
        cheque.chequeContent = content.toString()
      }
    }
  }
  cheque.createdAtTimestamp = event.block.timestamp;
  cheque.save()
}

export function handleChequeUpdated(event: ChequeUpdatedEvent): void {
  let cheque = Cheque.load(event.params.id.toString());
  if (cheque) {
    cheque.title = event.params.title;
    cheque.contentHash = event.params.hash;
    cheque.published = event.params.published;
    let data = ipfs.cat(event.params.hash);
    if (data) {
      let value = json.fromBytes(data).toObject()
      if (value) {
        const content = value.get('content')
        if (content) {
          cheque.chequeContent = content.toString()
        }
      }
    }
    cheque.updatedAtTimestamp = event.block.timestamp;
    cheque.save()
  }
}
