const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("DocumentManagement", async function () {
  it("Should create a Cheque", async function () {
    const DocumentManagement = await ethers.getContractFactory("DocumentManagement")
    const documentManagement = await DocumentManagement.deploy()
    await documentManagement.deployed()
    expirationDate = 1620000000
    drawerAddress = "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2"
    content = "12345",
    hash = "12345"
    await documentManagement.createCheque(expirationDate, drawerAddress, content, hash)

    const cheque = await documentManagement.getCheque(hash)
    expect(cheque.expirationDate).to.equal(expirationDate)
    expect(cheque.drawerAddress).to.equal(drawerAddress)
    expect(cheque.content).to.equal(content)
  })

  it("Should add endorsement", async function () {
    const DocumentManagement = await ethers.getContractFactory("DocumentManagement")
    const documentManagement = await DocumentManagement.deploy()
    const [owner] = await ethers.getSigners();
    await documentManagement.deployed()
    expirationDate = 1620000000
    drawerAddress = owner.address
    content = "12345"
    hash = "12345"
    await documentManagement.createCheque(expirationDate, drawerAddress, content, hash)
    beneficiaryAddress = owner.address
    amount = 100
    await documentManagement.addEndorsement(1, beneficiaryAddress, amount)

    cheque = await documentManagement.getCheque(hash)
    expect(cheque.expirationDate).to.equal(expirationDate)
    expect(cheque.drawerAddress).to.equal(drawerAddress)
    expect(cheque.content).to.equal(content)
  })

  it("Should fetchChequesDrawerOrBeneficiary", async function () {
    const DocumentManagement = await ethers.getContractFactory("DocumentManagement")
    const documentManagement = await DocumentManagement.deploy()
    await documentManagement.deployed()
    expirationDate = 1620000000
    drawerAddress = "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
    content = "12345"
    hash = "12345"
    await documentManagement.createCheque(expirationDate, drawerAddress, content, hash)

    const cheques = await documentManagement.fetchChequesDrawerOrBeneficiary(drawerAddress)
    expect(cheques[0].id).to.equal(1)
    expect(cheques[0].expirationDate).to.equal(expirationDate)
    expect(cheques[0].drawerAddress).to.equal(drawerAddress)
    expect(cheques[0].content).to.equal(content)
  })
})
