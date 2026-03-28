import { useEffect, useState } from "react";
import "./Modal.css";

const Modal = ({ setModalOpen, contract }) => {
  const [accessHistory, setAccessHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  const sharing = async () => {
    const address = document.querySelector(".address").value;
    const fileCID = document.querySelector(".fileCID").value;

    if (!address) {
      alert("Please enter a wallet address!");
      return;
    }

    try {
      let tx;
      if (fileCID) {
        tx = await contract.allowFileAccess(address, fileCID);
      } else {
        tx = await contract.allow(address);
      }
      await tx.wait();
      alert(fileCID ? "File access granted!" : "Global access granted!");
      setModalOpen(false);
    } catch (error) {
      console.error("Grant Access Error:", error);
      alert("Failed to grant access.");
    }
  };

  const revoking = async () => {
    const address = document.querySelector(".address").value;
    const fileCID = document.querySelector(".fileCID").value;

    if (!address) {
      alert("Please enter a wallet address!");
      return;
    }

    try {
      let tx;
      if (fileCID) {
        tx = await contract.disallowFileAccess(address, fileCID);
      } else {
        tx = await contract.disallow(address);
      }
      await tx.wait();
      alert(fileCID ? "File access revoked!" : "Global access revoked!");
      setModalOpen(false);
    } catch (error) {
      console.error("Revoke Access Error:", error);
      alert("Failed to revoke access.");
    }
  };

  const fetchAccessList = async () => {
    if (!contract) return;
    try {
      const addressList = await contract.shareAccess();
      const select = document.querySelector("#selectNumber");

      // Clear old options
      select.innerHTML = '<option value="">People With Access</option>';
      addressList.forEach((opt) => {
        let e1 = document.createElement("option");
        e1.textContent = opt.user;
        e1.value = opt.user;
        select.appendChild(e1);
      });
    } catch (err) {
      console.error("Error fetching access list:", err);
    }
  };

  const fetchAccessHistory = async () => {
    if (!contract) return;
    try {
      const history = await contract.getFileAccessHistory();
      setAccessHistory(history);
    } catch (error) {
      console.error("Fetch History Error:", error);
    }
  };

  useEffect(() => {
    fetchAccessHistory();
    fetchAccessList();
  }, [fetchAccessHistory, fetchAccessList]); // Add missing dependencies

  const handleSelectChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const filteredHistory = accessHistory.filter(
    (entry) => entry.user.toLowerCase() === selectedUser.toLowerCase()
  );

  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="title">Share File Access</div>

        <div className="shareText">
          <input type="text" className="address" placeholder="Enter Wallet Address" />
          <input
            type="text"
            className="fileCID"
            placeholder="Enter File CID (Optional)"
            style={{ marginTop: "8px" }}
          />
        </div>

        <form id="myForm">
          <select id="selectNumber" className="dropdown" onChange={handleSelectChange}>
            <option value="">People With Access</option>
          </select>
        </form>

        <div className="footer">
          <button onClick={() => setModalOpen(false)} id="cancelBtn">
            Cancel
          </button>
          <button onClick={sharing}>Grant Access</button>
          <button onClick={revoking} style={{ marginLeft: "8px" }}>
            Revoke Access
          </button>
        </div>

        {selectedUser && (
          <div className="historyTable">
            <h4>Access History for {selectedUser}</h4>
            {filteredHistory.length === 0 ? (
              <p>No history available.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>File CID</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((entry, index) => (
                    <tr key={index}>
                      <td>{entry.fileCID}</td>
                      <td>{entry.access ? "Granted" : "Revoked"}</td>
                      <td>{new Date(entry.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
