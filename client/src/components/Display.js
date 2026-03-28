import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import contractABI from "../artifacts/contracts/Upload.sol/Upload.json";
import "./Display.css";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // replace with actual deployed contract

const Display = () => {
    const [files, setFiles] = useState([]);
    const [contract, setContract] = useState(null);
    const [notification, setNotification] = useState("");
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const loadContract = async () => {
            if (!window.ethereum) {
                console.error("❌ Metamask not detected!");
                return;
            }

            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                const contractInstance = new ethers.Contract(contractAddress, contractABI.abi, signer);
                setContract(contractInstance);

                contractInstance.on("FileUploaded", (user, fileCID, fileName) => {
                    console.log(`📢 File Uploaded: ${fileName}`);
                    setNotification(`✅ File "${fileName}" uploaded successfully!`);
                    setTimeout(() => setNotification(""), 5000);
                });
            } catch (error) {
                console.error("❌ Contract Load Error:", error);
            }
        };

        loadContract();
    }, []);

    const fetchFiles = async () => {
        if (!contract) {
            setErrorMessage("Smart contract not loaded.");
            return;
        }

        try {
            setLoading(true);
            setErrorMessage("");
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const viewer = accounts[0];

            const ownerAddress = address.trim() || viewer;

            const rawFiles = await contract.display(ownerAddress);

            const formattedFiles = rawFiles.map((file) => ({
                fileCID: file.fileCID,
                encryptionKey: file.encryptionKey,
                fileHash: file.fileHash,
                fileName: file.fileName,
                fileType: file.fileType,
            }));

            setFiles(formattedFiles);

            if (formattedFiles.length === 0) {
                setErrorMessage("No accessible files found.");
            }
        } catch (error) {
            console.error("❌ Fetch Error:", error);
            setErrorMessage("Failed to fetch files. Check wallet connection or access rights.");
        } finally {
            setLoading(false);
        }
    };

    const decryptAndDownload = async (file) => {
        const startTime = performance.now(); // Start measuring time
        try {
            const { fileCID, encryptionKey, fileName, fileType } = file;
            const response = await fetch(`https://ipfs.io/ipfs/${fileCID}`);

            if (!response.ok) throw new Error(`IPFS Fetch Failed: ${response.statusText}`);

            const encryptedData = await response.text();
            const decrypted = CryptoJS.AES.decrypt(
                encryptedData,
                CryptoJS.enc.Hex.parse(encryptionKey),
                { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
            );

            const decryptedBase64 = CryptoJS.enc.Base64.stringify(decrypted);
            const binary = atob(decryptedBase64);
            const byteArray = new Uint8Array(binary.length);

            for (let i = 0; i < binary.length; i++) {
                byteArray[i] = binary.charCodeAt(i);
            }

            const blob = new Blob([byteArray], { type: fileType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("❌ Decryption Error:", err);
            alert("Failed to decrypt or download file.");
        } finally {
            const endTime = performance.now();
            console.log(`Decryption and download for ${file.fileName} took ${(endTime - startTime).toFixed(2)} ms`);
        }
    };

    return (
        <div className="display-container">
            <h2 style={{ color: "white" }}>📁 Uploaded Files</h2>

            {notification && <p className="notification-display">{notification}</p>}

            <input
                type="text"
                className="address"
                placeholder="Enter address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
            />

            <button
                onClick={fetchFiles}
                className="dataButton"
                disabled={loading}
            >
                {loading ? "⏳ Fetching..." : "📥 Get Files"}
            </button>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {loading && <p className="loading">⏳ Loading files...</p>}

            <ul className="file-list">
                {files.length === 0 && !loading ? (
                    <p className="no-files">No files uploaded or accessible.</p>
                ) : (
                    files.map((file, index) => (
                        <li key={index} className="file-item">
                            <p><strong>Name:</strong> {file.fileName}</p>
                            <p><strong>Type:</strong> {file.fileType}</p>
                            <button
                                onClick={() => decryptAndDownload(file)}
                                className="decrypt-button"
                            >
                                🔓 Decrypt & Download
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default Display;
