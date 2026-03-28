// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Upload {
    struct FileData {
        string fileCID;
        string encryptionKey;
        string fileHash;
        string fileName;
        string fileType;
    }

    struct Access {
        address user;
        bool access;
    }

    struct FileAccessInfo {
        address user;
        string fileCID;
        bool access;
        uint timestamp;
    }

    mapping(address => FileData[]) private files;
    mapping(address => mapping(address => bool)) private ownership;
    mapping(address => Access[]) private accessList;
    mapping(address => mapping(address => bool)) private previousData;

    // 🔐 File-specific access control
    mapping(address => mapping(string => mapping(address => bool))) private fileAccess;
    mapping(address => FileAccessInfo[]) private fileAccessHistory;

    // Add a mapping for accessible files
    mapping(address => mapping(address => string[])) private accessibleFiles;

    // 📢 Events
    event FileUploaded(address indexed user, string fileCID, string fileName, uint gasUsed);
    event AccessGranted(address indexed owner, address indexed user);
    event AccessRevoked(address indexed owner, address indexed user);
    event FileAccessGranted(address indexed owner, address indexed user, string fileCID, uint timestamp);
    event FileAccessRevoked(address indexed owner, address indexed user, string fileCID, uint timestamp);

    // 📥 Add a new file
    function add(
        address _user,
        string memory _fileCID,
        string memory _encryptionKey,
        string memory _fileHash,
        string memory _fileName,
        string memory _fileType
    ) external {
        uint startGas = gasleft();
        files[_user].push(FileData(_fileCID, _encryptionKey, _fileHash, _fileName, _fileType));
        uint gasUsed = startGas - gasleft();
        emit FileUploaded(_user, _fileCID, _fileName, gasUsed);
    }

    // ✅ Grant GLOBAL access (all files of owner)
    function allow(address user) external {
        ownership[msg.sender][user] = true;
        Access[] storage userAccessList = accessList[msg.sender];

        if (previousData[msg.sender][user]) {
            for (uint i = 0; i < userAccessList.length; i++) {
                if (userAccessList[i].user == user) {
                    userAccessList[i].access = true;
                }
            }
        } else {
            userAccessList.push(Access(user, true));
            previousData[msg.sender][user] = true;
        }

        emit AccessGranted(msg.sender, user);
    }

    // ❌ Revoke GLOBAL access
    function disallow(address user) public {
        ownership[msg.sender][user] = false;
        Access[] storage userAccessList = accessList[msg.sender];

        for (uint i = 0; i < userAccessList.length; i++) {
            if (userAccessList[i].user == user) {
                userAccessList[i].access = false;
            }
        }

        emit AccessRevoked(msg.sender, user);
    }

    // 📜 Display files (Supports global and file-level access)
    function display(address _user) external view returns (FileData[] memory) {
        // ✅ Case 1: The requester is the owner
        if (_user == msg.sender) {
            return files[_user];
        }

        // ✅ Case 2: The requester has global access
        if (ownership[_user][msg.sender]) {
            return files[_user];
        }

        // ✅ Case 3: Filter only files with file-level access
        string[] memory accessibleCIDs = accessibleFiles[_user][msg.sender];
        FileData[] memory result = new FileData[](accessibleCIDs.length);

        for (uint i = 0; i < accessibleCIDs.length; i++) {
            for (uint j = 0; j < files[_user].length; j++) {
                if (keccak256(abi.encodePacked(files[_user][j].fileCID)) == keccak256(abi.encodePacked(accessibleCIDs[i]))) {
                    result[i] = files[_user][j];
                    break;
                }
            }
        }

        return result;
    }

    // 📋 Global access list
    function shareAccess() public view returns (Access[] memory) {
        return accessList[msg.sender];
    }

    // 🔑 Grant access to a specific file
    function allowFileAccess(address user, string memory fileCID) external {
        fileAccess[msg.sender][fileCID][user] = true;
        accessibleFiles[msg.sender][user].push(fileCID);
        fileAccessHistory[msg.sender].push(FileAccessInfo(user, fileCID, true, block.timestamp));
        emit FileAccessGranted(msg.sender, user, fileCID, block.timestamp);
    }

    // 🚫 Revoke access to a specific file
    function disallowFileAccess(address user, string memory fileCID) external {
        fileAccess[msg.sender][fileCID][user] = false;
        fileAccessHistory[msg.sender].push(FileAccessInfo(user, fileCID, false, block.timestamp));
        emit FileAccessRevoked(msg.sender, user, fileCID, block.timestamp);
    }

    // 🔍 Check file-level access
    function hasFileAccess(address owner, string memory fileCID, address user) public view returns (bool) {
        return fileAccess[owner][fileCID][user];
    }

    // 📜 Retrieve file access history
    function getFileAccessHistory() external view returns (FileAccessInfo[] memory) {
        return fileAccessHistory[msg.sender];
    }
}
