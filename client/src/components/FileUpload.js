import { useState } from "react";
import axios from "axios";
import CryptoJS from "crypto-js";
import "./FileUpload.css";

const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;

const FileUpload = ({ contract, account }) => {
  const [fileState, setFileState] = useState({
    files: [],
    fileNames: [],
  });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsMinimized, setNotificationsMinimized] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [dropZoneState, setDropZoneState] = useState("");

  const addNotification = (message, type = "info") => {
    const timestamp = new Date();
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev.slice(-19), { id, message, type, timestamp }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropZoneState("active");
  };

  const handleDragLeave = () => {
    setDropZoneState("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndSetFiles(droppedFiles);
    setDropZoneState("");
  };

  const validateAndSetFiles = (selectedFiles) => {
    let totalSize = 0;
    const validFiles = [];

    for (let file of selectedFiles) {
      if (validFiles.length >= 4) break;
      totalSize += file.size;
      validFiles.push(file);
    }

    if (totalSize > 100 * 1024 * 1024) {
      addNotification("⚠️ Total file size exceeds 100MB.", "error");
      return;
    }

    setFileState({
      files: validFiles,
      fileNames: validFiles.map((f) => f.name),
    });
  };

  const toggleNotifications = () => {
    setNotificationsMinimized((prev) => !prev);
  };

  const clearNotifications = () => {
    setShowConfirmPopup(true);
  };

  const confirmClearNotifications = () => {
    setNotifications([]);
    setShowConfirmPopup(false);
  };

  const generateEncryptionKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  };

  const scanForMalware = async (originalFile) => {
    try {
      if (!originalFile || !originalFile.name) {
        console.error("Invalid file selected.");
        addNotification("❌ No valid file selected.", "error");
        return false;
      }
      const formData = new FormData();
      formData.append("file", new File([originalFile], originalFile.name));
      const uploadResponse = await axios.post(
        "https://www.virustotal.com/api/v3/files",
        formData,
        {
          headers: {
            "x-apikey": "6ea577626d2f39661fb489d9a12af0c7e2cee0198c6ea102aadea4fc3ee807fd",
            "Content-Type": "multipart/form-data",
          },
          timeout: 150000,
        }
      );
      const analysisId = uploadResponse.data?.data?.id;
      if (!analysisId) throw new Error("⚠️ No analysis ID returned from VirusTotal.");
      addNotification("🔍 File uploaded. Scanning in progress...", "info");
      let analysisStatus = "queued";
      let result;
      while (analysisStatus === "queued") {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const analysisResponse = await axios.get(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
          {
            headers: {
              "x-apikey": "6ea577626d2f39661fb489d9a12af0c7e2cee0198c6ea102aadea4fc3ee807fd",
            },
            timeout: 100000,
          }
        );
        result = analysisResponse.data?.data;
        analysisStatus = result?.attributes?.status;
      }
      const maliciousCount = result?.attributes?.stats?.malicious || 0;
      if (maliciousCount > 0) {
        addNotification(`⚠️ Malware Detected: ${maliciousCount} engines flagged this file.`, "error");
        return false;
      } else {
        addNotification("✅ File is clean! No malware detected.", "success");
        return true;
      }
    } catch (error) {
      console.error("Error submitting file to VirusTotal:", error);
      addNotification("❌ Error scanning file. Check console for details.", "error");
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileState.files.length === 0) return;

    const startTime = performance.now(); // Start measuring total time
    setLoading(true);

    try {
      await Promise.all(
        fileState.files.map(async (file) => {
          const fileStartTime = performance.now(); // Start measuring time for this file
          addNotification(`🚀 Starting upload process for ${file.name}...`, "info");

          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = async () => {
              try {
                const fileContent = reader.result.split(",")[1];

                // Step 1: Malware Scanning
                const scanStartTime = performance.now();
                addNotification(`🛡️ Scanning ${file.name} for malware...`, "info");
                const scanSuccess = await scanForMalware(file);
                const scanEndTime = performance.now();
                console.log(`Malware scan for ${file.name} took ${(scanEndTime - scanStartTime).toFixed(2)} ms`);
                if (!scanSuccess) return resolve();

                // Step 2: Encryption
                const encryptionStartTime = performance.now();
                addNotification(`🔐 Encrypting ${file.name}...`, "info");
                const encryptionKey = generateEncryptionKey();
                const encryptedFile = CryptoJS.AES.encrypt(
                  CryptoJS.enc.Base64.parse(fileContent),
                  CryptoJS.enc.Hex.parse(encryptionKey),
                  { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
                ).toString();
                const fileHash = CryptoJS.SHA256(fileContent).toString();
                const encryptionEndTime = performance.now();
                console.log(`Encryption for ${file.name} took ${(encryptionEndTime - encryptionStartTime).toFixed(2)} ms`);

                // Step 3: IPFS Upload
                const ipfsStartTime = performance.now();
                addNotification(`📦 Uploading ${file.name} to IPFS...`, "info");
                const formData = new FormData();
                const encryptedBlob = new Blob([encryptedFile], { type: file.type });
                formData.append("file", encryptedBlob);

                const resFile = await axios({
                  method: "post",
                  url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
                  data: formData,
                  headers: {
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                    "Content-Type": "multipart/form-data",
                  },
                  timeout: 150000,
                });

                const fileCID = resFile.data.IpfsHash;
                const ipfsEndTime = performance.now();
                console.log(`IPFS upload for ${file.name} took ${(ipfsEndTime - ipfsStartTime).toFixed(2)} ms`);
                addNotification(`✅ ${file.name} uploaded to IPFS! CID: ${fileCID}`, "success");

                // Step 4: Smart Contract Interaction
                const contractStartTime = performance.now();
                addNotification(`⛓️ Storing metadata for ${file.name} on blockchain...`, "info");

                const estimatedGas = await contract.estimateGas.add(
                  account,
                  fileCID,
                  encryptionKey,
                  fileHash,
                  file.name,
                  file.type
                );
                console.log(`Estimated gas for storing ${file.name}: ${estimatedGas.toString()}`);

                const tx = await contract.add(account, fileCID, encryptionKey, fileHash, file.name, file.type);
                const receipt = await tx.wait();
                const actualGasUsed = receipt.gasUsed.toString();
                console.log(`Actual gas used for storing ${file.name}: ${actualGasUsed}`);

                const contractEndTime = performance.now();
                console.log(`Smart contract interaction for ${file.name} took ${(contractEndTime - contractStartTime).toFixed(2)} ms`);
                addNotification(`✅ Metadata for ${file.name} stored on blockchain. Tx Hash: ${tx.hash}`, "success");
              } catch (innerError) {
                console.error(`❌ Error processing ${file.name}:`, innerError);
                addNotification(`❌ Error processing ${file.name}.`, "error");
              }

              resolve();
            };

            reader.readAsDataURL(file);
          });

          const fileEndTime = performance.now();
          console.log(`Total time for ${file.name}: ${(fileEndTime - fileStartTime).toFixed(2)} ms`);
        })
      );

      const endTime = performance.now();
      console.log(`Total time for all files: ${(endTime - startTime).toFixed(2)} ms`);
      addNotification("✅ All files uploaded successfully!", "success");
    } catch (error) {
      console.error("Error during file upload:", error);
      addNotification("❌ File upload failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`drop-zone ${dropZoneState}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag & drop up to 4 files here (Max size of each file:35MB,Max total size: 100MB)</p>
        {fileState.fileNames.length > 4 && (
          <p className="file-limit-warning">Only the first 4 files will be processed</p>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="file-upload" className="choose">
          {fileState.files.length > 0 ? 'Add More Files' : 'Choose Files'}
        </label>
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={(e) => validateAndSetFiles(Array.from(e.target.files))}
        />
        
        <div className="textArea">
          {fileState.fileNames.length > 0 ? (
            <>
              <strong>Selected Files:</strong>
              <ul>
                {fileState.fileNames.map((name, idx) => (
                  <li key={idx} className={idx >= 4 ? 'error' : 'success'}>
                    {name} {idx >= 4 && '(Will not be processed)'}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            "No files selected"
          )}
        </div>

        <button 
          type="submit" 
          className="upload" 
          disabled={fileState.files.length === 0 || loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Processing {fileState.files.length > 1 ? `${fileState.files.length} files` : 'file'}...
            </>
          ) : (
            `Encrypt & Upload ${fileState.files.length > 0 ? `(${fileState.files.length})` : ''}`
          )}
        </button>
      </form>

      <div className={`notification-container ${notificationsMinimized ? 'minimized' : ''}`}>
        <div className="notification-bar">
          <h4>Notifications ({notifications.length})</h4>
          <div className="notification-actions">
            <button 
              className="toggle-btn" 
              onClick={toggleNotifications}
              aria-label={notificationsMinimized ? 'Expand notifications' : 'Minimize notifications'}
            >
              {notificationsMinimized ? "Expand" : "Minimize"}
            </button>
            <button 
              className="clear-btn" 
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>
        
        {!notificationsMinimized && (
          <div className="notification-content">
            {notifications.length > 0 ? (
              notifications.map((note) => (
                <div key={note.id} className={`notification ${note.type}`}>
                  {note.message}
                </div>
              ))
            ) : (
              <div className="notification-empty">No notifications</div>
            )}
          </div>
        )}
      </div>

      {showConfirmPopup && (
        <div className="custom-confirm-overlay">
          <div className="custom-confirm-box">
            <h3>Clear Notifications</h3>
            <p>This will remove all notification history.</p>
            <div className="custom-confirm-buttons">
              <button className="confirm-no" onClick={() => setShowConfirmPopup(false)}>
                Cancel
              </button>
              <button className="confirm-yes" onClick={confirmClearNotifications}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;