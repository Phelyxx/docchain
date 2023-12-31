// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class ChequeCreated extends ethereum.Event {
  get params(): ChequeCreated__Params {
    return new ChequeCreated__Params(this);
  }
}

export class ChequeCreated__Params {
  _event: ChequeCreated;

  constructor(event: ChequeCreated) {
    this._event = event;
  }

  get id(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get title(): string {
    return this._event.parameters[1].value.toString();
  }

  get hash(): string {
    return this._event.parameters[2].value.toString();
  }
}

export class ChequeUpdated extends ethereum.Event {
  get params(): ChequeUpdated__Params {
    return new ChequeUpdated__Params(this);
  }
}

export class ChequeUpdated__Params {
  _event: ChequeUpdated;

  constructor(event: ChequeUpdated) {
    this._event = event;
  }

  get id(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get title(): string {
    return this._event.parameters[1].value.toString();
  }

  get hash(): string {
    return this._event.parameters[2].value.toString();
  }

  get published(): boolean {
    return this._event.parameters[3].value.toBoolean();
  }
}

export class DocumentManagement__fetchChequeResultValue0Struct extends ethereum.Tuple {
  get id(): BigInt {
    return this[0].toBigInt();
  }

  get title(): string {
    return this[1].toString();
  }

  get content(): string {
    return this[2].toString();
  }

  get published(): boolean {
    return this[3].toBoolean();
  }
}

export class DocumentManagement__fetchChequesResultValue0Struct extends ethereum.Tuple {
  get id(): BigInt {
    return this[0].toBigInt();
  }

  get title(): string {
    return this[1].toString();
  }

  get content(): string {
    return this[2].toString();
  }

  get published(): boolean {
    return this[3].toBoolean();
  }
}

export class DocumentManagement extends ethereum.SmartContract {
  static bind(address: Address): DocumentManagement {
    return new DocumentManagement("DocumentManagement", address);
  }

  fetchCheque(hash: string): DocumentManagement__fetchChequeResultValue0Struct {
    let result = super.call(
      "fetchCheque",
      "fetchCheque(string):((uint256,string,string,bool))",
      [ethereum.Value.fromString(hash)]
    );

    return changetype<DocumentManagement__fetchChequeResultValue0Struct>(result[0].toTuple());
  }

  try_fetchCheque(
    hash: string
  ): ethereum.CallResult<DocumentManagement__fetchChequeResultValue0Struct> {
    let result = super.tryCall(
      "fetchCheque",
      "fetchCheque(string):((uint256,string,string,bool))",
      [ethereum.Value.fromString(hash)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(
      changetype<DocumentManagement__fetchChequeResultValue0Struct>(value[0].toTuple())
    );
  }

  fetchCheques(): Array<DocumentManagement__fetchChequesResultValue0Struct> {
    let result = super.call(
      "fetchCheques",
      "fetchCheques():((uint256,string,string,bool)[])",
      []
    );

    return result[0].toTupleArray<DocumentManagement__fetchChequesResultValue0Struct>();
  }

  try_fetchCheques(): ethereum.CallResult<
    Array<DocumentManagement__fetchChequesResultValue0Struct>
  > {
    let result = super.tryCall(
      "fetchCheques",
      "fetchCheques():((uint256,string,string,bool)[])",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(
      value[0].toTupleArray<DocumentManagement__fetchChequesResultValue0Struct>()
    );
  }

  getGreeting(): string {
    let result = super.call("getGreeting", "getGreeting():(string)", []);

    return result[0].toString();
  }

  try_getGreeting(): ethereum.CallResult<string> {
    let result = super.tryCall("getGreeting", "getGreeting():(string)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toString());
  }

  name(): string {
    let result = super.call("name", "name():(string)", []);

    return result[0].toString();
  }

  try_name(): ethereum.CallResult<string> {
    let result = super.tryCall("name", "name():(string)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toString());
  }

  owner(): Address {
    let result = super.call("owner", "owner():(address)", []);

    return result[0].toAddress();
  }

  try_owner(): ethereum.CallResult<Address> {
    let result = super.tryCall("owner", "owner():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _name(): string {
    return this._call.inputValues[0].value.toString();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class CreateChequeCall extends ethereum.Call {
  get inputs(): CreateChequeCall__Inputs {
    return new CreateChequeCall__Inputs(this);
  }

  get outputs(): CreateChequeCall__Outputs {
    return new CreateChequeCall__Outputs(this);
  }
}

export class CreateChequeCall__Inputs {
  _call: CreateChequeCall;

  constructor(call: CreateChequeCall) {
    this._call = call;
  }

  get title(): string {
    return this._call.inputValues[0].value.toString();
  }

  get hash(): string {
    return this._call.inputValues[1].value.toString();
  }
}

export class CreateChequeCall__Outputs {
  _call: CreateChequeCall;

  constructor(call: CreateChequeCall) {
    this._call = call;
  }
}

export class TransferOwnershipCall extends ethereum.Call {
  get inputs(): TransferOwnershipCall__Inputs {
    return new TransferOwnershipCall__Inputs(this);
  }

  get outputs(): TransferOwnershipCall__Outputs {
    return new TransferOwnershipCall__Outputs(this);
  }
}

export class TransferOwnershipCall__Inputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }

  get newOwner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class TransferOwnershipCall__Outputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }
}

export class UpdateNameCall extends ethereum.Call {
  get inputs(): UpdateNameCall__Inputs {
    return new UpdateNameCall__Inputs(this);
  }

  get outputs(): UpdateNameCall__Outputs {
    return new UpdateNameCall__Outputs(this);
  }
}

export class UpdateNameCall__Inputs {
  _call: UpdateNameCall;

  constructor(call: UpdateNameCall) {
    this._call = call;
  }

  get _name(): string {
    return this._call.inputValues[0].value.toString();
  }
}

export class UpdateNameCall__Outputs {
  _call: UpdateNameCall;

  constructor(call: UpdateNameCall) {
    this._call = call;
  }
}

export class UpdateChequeCall extends ethereum.Call {
  get inputs(): UpdateChequeCall__Inputs {
    return new UpdateChequeCall__Inputs(this);
  }

  get outputs(): UpdateChequeCall__Outputs {
    return new UpdateChequeCall__Outputs(this);
  }
}

export class UpdateChequeCall__Inputs {
  _call: UpdateChequeCall;

  constructor(call: UpdateChequeCall) {
    this._call = call;
  }

  get chequeId(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get title(): string {
    return this._call.inputValues[1].value.toString();
  }

  get hash(): string {
    return this._call.inputValues[2].value.toString();
  }

  get published(): boolean {
    return this._call.inputValues[3].value.toBoolean();
  }
}

export class UpdateChequeCall__Outputs {
  _call: UpdateChequeCall;

  constructor(call: UpdateChequeCall) {
    this._call = call;
  }
}
