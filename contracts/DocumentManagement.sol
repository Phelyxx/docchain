pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DocumentManagement {
    address public owner;

    using Counters for Counters.Counter;
    Counters.Counter private _chequeIds;
    Counters.Counter private _documentIds;

    struct File {
        string cid;
        uint date;
    }

    struct Cheque {
        uint id;
        uint creationDate;
        uint amount;
        string status;
        uint expirationDate;
        address drawerAddress;
        string content;
        address beneficiaryAddress;
        address[] endorsements;
        File[] files;
    }

    struct Document {
        uint id;
        uint creationDate;
        string documentType;
        string description;
        address ownerAddress;
        address[] sharedWith;
        string content;
        File[] files;
        string polygonIdSmartContract;
    }

    mapping(uint => Cheque) private idToCheque;
    mapping(string => Cheque) private hashToCheque;

    mapping(uint => Document) private idToDocument;
    mapping(string => Document) private hashToDocument;

    event ChequeCreated(
        uint id,
        uint creationDate,
        uint amount,
        string status,
        uint expirationDate,
        address drawerAddress,
        string content,
        address beneficiaryAddress,
        address[] endorsements,
        string hash,
        File[] files
    );

    event ChequeUpdated(
        uint id,
        uint creationDate,
        uint amount,
        string status,
        uint expirationDate,
        address drawerAddress,
        string content,
        address beneficiaryAddress,
        address[] endorsements,
        string hash,
        File[] files
    );

    event DocumentCreated(
        uint id,
        uint creationDate,
        string documentType,
        string description,
        address ownerAddress,
        address[] sharedWith,
        string content,
        File[] files,
        string hash,
        string polygonIdSmartContract
    );

    event DocumentUpdated(
        uint id,
        uint creationDate,
        string documentType,
        string description,
        address ownerAddress,
        address[] sharedWith,
        string content,
        File[] files,
        string hash,
        string polygonIdSmartContract
    );

    constructor() {
        owner = msg.sender;
    }

    function getCheque(string memory hash) public view returns (Cheque memory) {
        return hashToCheque[hash];
    }

    function getDocument(string memory hash) public view returns (Document memory) {
        return hashToDocument[hash];
    }

    function createCheque(
        uint expirationDate,
        address drawerAddress,
        string memory hash
    ) public onlyOwner {
        _chequeIds.increment();
        uint creationDate = block.timestamp;
        uint amount = 0;
        string memory status = "ACTIVO";
        address beneficiaryAddress = address(0);
        uint id = _chequeIds.current();
        address[] memory endorsements = new address[](0);

        // Directly push the new File object to the storage array
        Cheque storage cheque = idToCheque[id];
        cheque.files.push(File(hash, creationDate));

        cheque.id = id;
        cheque.creationDate = creationDate;
        cheque.amount = amount;
        cheque.status = status;
        cheque.expirationDate = expirationDate;
        cheque.drawerAddress = drawerAddress;
        cheque.beneficiaryAddress = beneficiaryAddress;
        cheque.endorsements = endorsements;
        cheque.content = hash;

        idToCheque[id] = cheque;
        hashToCheque[hash] = cheque;
    }

    function createDocument(
        string memory documentType,
        string memory description,
        string memory hash,
        string memory polygonIdSmartContract
    ) public  {
        _documentIds.increment();
        uint creationDate = block.timestamp;
        address[] memory sharedWith = new address[](0);
        uint id = _documentIds.current();

        // Directly push the new File object to the storage array
        Document storage document = idToDocument[id];
        document.files.push(File(hash, creationDate));

        document.id = id;
        document.creationDate = creationDate;
        document.documentType = documentType;
        document.description = description;
        document.ownerAddress = msg.sender;
        document.sharedWith = sharedWith;
        document.content = hash;
        document.polygonIdSmartContract = polygonIdSmartContract;

        idToDocument[id] = document;
        hashToDocument[hash] = document;
    }

    function updateChequeFile(uint id, string memory hash) public {
        Cheque storage cheque = idToCheque[id];
        cheque.content = hash;
        hashToCheque[hash] = cheque;
        cheque.files.push(File(hash, block.timestamp));
    }

    function updateDocumentFile(uint id, string memory hash) public {
        Document storage document = idToDocument[id];
        document.content = hash;
        hashToDocument[hash] = document;
        document.files.push(File(hash, block.timestamp));
    }

    function addEndorsement(
        uint id,
        address beneficiaryAddress,
        uint amount,
        string memory hash
    ) public onlyDrawerOrBeneficiary(id) {
        Cheque storage cheque = idToCheque[id];
        cheque.beneficiaryAddress = beneficiaryAddress;
        cheque.amount = amount;
        cheque.status = "ENDOSADO";
        cheque.content = hash;
        hashToCheque[hash] = cheque;
        cheque.endorsements.push(beneficiaryAddress);
    }

    function shareDocument (
        uint id,
        address sharedWith,
        string memory hash
    ) public onlyDocumentOwner(id) {
        Document storage document = idToDocument[id];
        document.sharedWith.push(sharedWith);
        document.content = hash;
        hashToDocument[hash] = document;
    }

    function fetchChequesDrawerOrBeneficiary(
        address drawerOrBeneficiary
    ) public view returns (Cheque[] memory) {
        Cheque[] memory result = new Cheque[](_chequeIds.current());
        uint counter = 0;
        for (uint i = 1; i <= _chequeIds.current(); i++) {
            if (
                idToCheque[i].drawerAddress == drawerOrBeneficiary ||
                idToCheque[i].beneficiaryAddress == drawerOrBeneficiary
            ) {
                result[counter] = idToCheque[i];
                counter++;
            }
        }
        Cheque[] memory result2 = new Cheque[](counter);
        for (uint i = 0; i < counter; i++) {
            result2[i] = result[i];
        }
        return result2;
    }

    function fetchCheques() public view returns (Cheque[] memory) {
        uint itemCount = _chequeIds.current();
        Cheque[] memory items = new Cheque[](itemCount);
        for (uint i = 0; i < itemCount; i++) {
            uint currentId = i + 1;
            Cheque storage currentItem = idToCheque[currentId];
            items[i] = currentItem;
        }
        return items;
    }

    function fetchDocuments() public view returns (Document[] memory) {
        uint itemCount = _documentIds.current();
        Document[] memory items = new Document[](itemCount);
        for (uint i = 0; i < itemCount; i++) {
            uint currentId = i + 1;
            Document storage currentItem = idToDocument[currentId];
            items[i] = currentItem;
        }
        return items;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyDocumentOwner(uint id) {
        require(
            idToDocument[id].ownerAddress == msg.sender,
            "Only owner can call this function."
        );
        _;
    }

    modifier onlyDrawerOrBeneficiary(uint id) {
        require(
            idToCheque[id].drawerAddress == msg.sender ||
                idToCheque[id].beneficiaryAddress == msg.sender,
            "Only drawer or beneficiary can call this function."
        );
        _;
    }

    function canAccessFile(address userAddress) public view returns (bool) {
        for (uint i = 1; i <= _chequeIds.current(); i++) {
            if (
                userAddress == idToCheque[i].drawerAddress ||
                userAddress == idToCheque[i].beneficiaryAddress ||
                userAddress == owner
            ) {
                return true;
            }

            for (uint j = 0; j < idToCheque[i].endorsements.length; j++) {
                if (userAddress == idToCheque[i].endorsements[j]) {
                    return true;
                }
            }
        }
        return false;
    }

    function canAccessDocument(address userAddress) public view returns (bool) {
        for (uint i = 1; i <= _documentIds.current(); i++) {
            if (
                userAddress == idToDocument[i].ownerAddress ||
                userAddress == owner
            ) {
                return true;
            }

            for (uint j = 0; j < idToDocument[i].sharedWith.length; j++) {
                if (userAddress == idToDocument[i].sharedWith[j]) {
                    return true;
                }
            }
        }
        return false;
    }
}
