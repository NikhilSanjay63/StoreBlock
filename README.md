# StoreBlock

A Web3 demo dApp for decentralized file storage and access control.

## Overview

The contract is `contracts/Upload.sol` and supports:
- add file metadata + hash + encryption key to owner profile
- grant/revoke global access (all files) per user
- grant/revoke single file access per user
- retrieve file listings with authorization checks
- access history logging (per owner)

The front end under `client/src/components` includes:
- `FileUpload.js`: drag-and-drop file upload, malware scan, AES encryption, Pinata upload, and contract write
- `Display.js`: fetch accessible files from contract, decrypt and download using local key
- `Modal.js`: grant/revoke access, access history display

## Smart contract details

1. `add(address _user, string fileCID, string encryptionKey, string fileHash, string fileName, string fileType)`
   - stores `FileData` under `_user`
2. `allow(address user)` / `disallow(address user)`
   - global sharing on `ownership[msg.sender][user]`
3. `allowFileAccess(address user, string fileCID)` / `disallowFileAccess(address user, string fileCID)`
   - file-level sharing on `fileAccess[msg.sender][fileCID][user]`
4. `display(address _user)`
   - returns all owner files if requester is owner or globally allowed
   - else returns matched file-level accessible CIDs
5. `shareAccess()` returns array of granted users (per owner)
6. `getFileAccessHistory()` returns file-level grant/revoke history (per owner)

## Architecture

- Solidity contract stores mostly metadata and access flags on-chain.
- Actual file payload is stored in IPFS via Pinata.
- File contents are encrypted client-side with AES (currently ECB, recommend upgrade to GCM).
- Decryption key is stored on-chain in metadata currently (avoid in production).

## Setup

### 1. Backend (hardhat)

```bash
git clone https://github.com/<your-org>/StoreBlock.git
cd StoreBlock
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Frontend

```bash
cd client
npm install
npm start
```

### 3. Environment variables

In `client/.env` set:

- `REACT_APP_PINATA_API_KEY` (Pinata API key)
- `REACT_APP_PINATA_SECRET_API_KEY` (Pinata secret key)
- `REACT_APP_VIRUSTOTAL_API_KEY` (VirusTotal API key)

⚠️ Important: Do not commit these values to source control. Better: move API key use to a backend proxy.

## Usage

1. Open the React app in browser (`http://localhost:3000`).
2. Connect MetaMask to local Hardhat network and select account.
3. Upload file(s) in `FileUpload`:
   - file gets scanned for malware (VirusTotal API in current code)
   - file is encrypted client-side and uploaded to Pinata
   - metadata is registered on smart contract via `add`
4. Use `Modal` to grant or revoke access,
   - global or per-file based on CID input.
5. Use `Display` to fetch accessible files and decrypt/download.

## Security notes (strongly recommended)

- Do not store encryption keys on-chain. Store only keys off-chain or use key exchange.
- Replace AES-ECB with AES-GCM or AES-CBC + random IV in client encryption/decryption.
- Move API keys out of front-end to secure backend service.
- Add `require(msg.sender == owner)`/`onlyOwner` patterns for clearer authority.
- Deduplicate `accessibleFiles` entries and remove on revoke to avoid stale data.

## Tests

- existing test file: `Lock.js` (Hardhat sample)
- add targeted tests for `Upload.sol` will improve reliability.

## Improve this project

- implement `Ownable` or `AccessControl` (OpenZeppelin)
- encrypt secrets & access management off-chain
- add pagination for large file lists in `display`
- remove plain `encryptionKey` from on-chain records

---

Project status: prototype. Not production-ready without the above security improvements.

