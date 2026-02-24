import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./Login";
// --- NEW IMPORTS FOR FIREBASE/FIRESTORE ---
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { signOutUser } from "./services/auth";
import {
  subscribeUserCerts,
  addCertificate,
  deleteCertificate,
  updateCertificate,
  getUserRole,
  setUserRole,
} from "./services/firestore";
import axios from 'axios';
// ------------------------------------------
function genSerial() {
  return "SN-" + Math.floor(Math.random() * 1e8).toString(16).toUpperCase();

}


export default function App() {
  const [user, setUser] = useState(null);
  const [lastError, setLastError] = useState(null);
  const certsUnsubRef = useRef(null);
  const [certs, setCerts] = useState([]);
  const [newCert, setNewCert] = useState({ cn: "", issuer: "", link: "" });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [role, setRole] = useState(null);
  const [localCerts, setLocalCerts] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  useEffect(() => {
    // capture uncaught errors and promise rejections to show in the UI for debugging
    const onErr = (e) => {
      try {
        const msg = e && e.message ? e.message : JSON.stringify(e);
        console.error('Captured window error:', e);
        setLastError(msg);
      } catch (err) {
        console.error(err);
      }
    };
    const onRej = (ev) => {
      try {
        const reason = ev && ev.reason ? ev.reason : ev;
        console.error('Captured unhandledrejection:', reason);
        setLastError((reason && reason.message) || JSON.stringify(reason));
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        console.log('Auth state changed: user uid=', u.uid, 'email=', u.email);
        // fetch role, but if there's a dev-local override, prefer that for testing
        getUserRole(u.uid).then((r) => {
          try {
            const devKey = `dev_admin_${u.uid}`;
            const devOverride = typeof window !== 'undefined' && window.localStorage?.getItem(devKey);
            if (!r && devOverride) {
              console.log('Applying local dev admin override for', u.uid);
              r = 'admin';
            }
          } catch (e) {
            /* ignore localStorage errors */
          }
          console.log('user role=', r);
          setRole(r);
        });
        if (certsUnsubRef.current) {
          try {
            certsUnsubRef.current();
          } catch (e) {
            console.warn("Error closing previous unsub", e);
          }
          certsUnsubRef.current = null;
        }
        certsUnsubRef.current = subscribeUserCerts(u.uid, (items) => {
          console.log('subscribeUserCerts callback received', items.length, 'items');
          setCerts(items);
        });
      } else {
        setUser(null);
        setCerts([]);
        if (certsUnsubRef.current) {
          try {
            certsUnsubRef.current();
          } catch (e) {
            console.warn("Error closing unsub on logout", e);
          }
          certsUnsubRef.current = null;
        }
      }
    });

    return () => {
      try {
        unsubAuth();
      } catch (e) {
        /* ignore */
      }
      if (certsUnsubRef.current) {
        try {
          certsUnsubRef.current();
        } catch (e) {
          /* ignore */
        }
        certsUnsubRef.current = null;
      }
    };
  }, []);

  if (!user) return <Login onLogin={() => {}} />;

  async function addCert() {
    if (!newCert.cn || !newCert.issuer || !newCert.link) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      const payload = { serial: genSerial(), ...newCert, status: "Active" };
      console.log("Adding certificate payload", payload);
      await addCertificate(user.uid, payload);
      setShowForm(false);
      setNewCert({ cn: "", issuer: "", link: "" });
    } catch (error) {
      console.error("Error adding certificate:", error);
      alert("Failed to add certificate.");
    }
  }

  async function deleteCert(serial) {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    try {
      const certToDelete = certs.find((c) => c.serial === serial);
      if (!certToDelete || !certToDelete.id) {
        alert("Cannot delete: Document ID not found.");
        return;
      }
      console.log("Deleting doc id", certToDelete.id);
      await deleteCertificate(certToDelete.id);
    } catch (error) {
      console.error("Error deleting certificate:", error);
      alert("Failed to delete certificate.");
    }
  }

  async function revokeCert(serial) {
    try {
      const certToUpdate = certs.find((c) => c.serial === serial);
      if (!certToUpdate || !certToUpdate.id) {
        alert("Cannot revoke: Document ID not found.");
        return;
      }
      console.log("Revoking", certToUpdate.id);
      await updateCertificate(certToUpdate.id, { status: "Revoked" });
    } catch (error) {
      console.error("Error revoking certificate:", error);
      alert("Failed to revoke certificate.");
    }
  }

  async function renewCert(serial) {
    try {
      const certToUpdate = certs.find((c) => c.serial === serial);
      if (!certToUpdate || !certToUpdate.id) {
        alert("Cannot renew: Document ID not found.");
        return;
      }
      console.log("Renewing", certToUpdate.id);
      await updateCertificate(certToUpdate.id, { status: "Active" });
      alert("✅ Certificate renewed successfully! (Updating in Firestore)");
    } catch (error) {
      console.error("Error renewing certificate:", error);
      alert("Failed to renew certificate.");
    }
  }

  async function checkSSL(cert) {
    const domain = cert.link.replace(/^https?:\/\//, "").split("/")[0];
    try {
      alert(`🔍 Checking SSL for ${domain}... please wait 15–30 seconds.`);
      await fetch(
        `https://thingproxy.freeboard.io/fetch/https://api.ssllabs.com/api/v3/analyze?host=${domain}`
      );
      await new Promise((resolve) => setTimeout(resolve, 20000));
      const res = await fetch(
        `https://thingproxy.freeboard.io/fetch/https://api.ssllabs.com/api/v3/analyze?host=${domain}`
      );
      const data = await res.json();

      if (data.status === "READY" && data.endpoints?.[0]?.details) {
        const details = data.endpoints[0].details;
        const validFrom = new Date(details.notBefore).toISOString().slice(0, 10);
        const validTo = new Date(details.notAfter).toISOString().slice(0, 10);
        const issuer = details.issuerLabel || cert.issuer;

        if (cert.id) {
          await updateCertificate(cert.id, {
            issuer,
            validFrom,
            validTo,
            status: "Active",
          });
        }

        alert(`✅ SSL valid from ${validFrom} to ${validTo}`);
      } else {
        alert("⚠ SSL data not ready or unavailable. Try again later.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ SSL check failed. Could not fetch certificate info.");
    }
  }

  function filteredCerts() {
    if (filter === "All") return certs;
    return certs.filter((c) => c.status === filter);
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="dashboard-container bg-white shadow rounded-4 p-4 w-100">
        {/* Added Logout Button */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0 text-primary">🔐 PKI Dashboard</h2>
          <div className="d-flex gap-2 align-items-center">
            {/* Dev-only promote button: only show on localhost or non-production */}
            {(
              window.location.hostname === "localhost" ||
              process.env.NODE_ENV !== "production"
            ) && (
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={async () => {
                  const devKey = `dev_admin_${user.uid}`;
                  try {
                    await setUserRole(user.uid, "admin");
                    // refresh role from server
                    const r = await getUserRole(user.uid);
                    setRole(r);
                    // set local marker as well for persistence in dev
                    try { window.localStorage?.setItem(devKey, '1'); } catch(e) {}
                    alert("You are now an admin (server-side). UI refreshed.");
                  } catch (e) {
                    // permission denied — fallback to local dev override so you can test admin UI
                    try {
                      window.localStorage?.setItem(devKey, '1');
                      setRole('admin');
                      alert("Server permission denied; applied local dev admin override.");
                    } catch (err) {
                      alert("Failed to promote to admin: " + (e?.message || e));
                    }
                  }
                }}
              >
                Promote to admin (dev)
              </button>
            )}
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => signOutUser()}
            >
              Logout ({user.email || "User"})
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="d-flex justify-content-between mb-3 flex-wrap gap-2">
          <div>
            {["All", "Active", "Revoked"].map((f) => (
              <button
                key={f}
                className={`btn me-2 ${filter === f ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div>
            <button
              className="btn btn-outline-info me-2"
              onClick={async () => {
                try {
                  const res = await axios.get('http://localhost:4000/api/list');
                  setLocalCerts(res.data.files || []);
                  alert('Loaded local certs: ' + (res.data.files || []).length);
                } catch (e) {
                  console.error(e);
                  alert('Failed to load local certs. Is the cert-server running?');
                }
              }}
            >
              Load Local Certs
            </button>
          </div>
          <button
            className="btn btn-success"
            onClick={() => setShowForm(true)}
            disabled={role !== "admin"}
            title={role !== "admin" ? "Admin only" : "Add Certificate"}
          >
            + Add Certificate
          </button>
        </div>

        {/* Certificate Table */}
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle text-center">
            <thead className="table-dark">
              <tr>
                <th>CN</th>
                <th>Issuer</th>
                <th>Status</th>
                <th>Valid From</th>
                <th>Valid To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCerts().map((cert) => (
                <tr key={cert.serial}>
                  <td>{cert.cn}</td>
                  <td>{cert.issuer}</td>
                  <td>
                    <span
                      className={`badge ${
                        cert.status === "Active"
                          ? "bg-success"
                          : cert.status === "Revoked"
                          ? "bg-danger"
                          : "bg-secondary"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </td>
                  <td>{cert.validFrom || "—"}</td>
                  <td>{cert.validTo || "—"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info me-2"
                      onClick={() => window.open(cert.link, "_blank")}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-sm btn-outline-info me-2"
                      onClick={() => {
                        // open modal with parsed permissions if available
                        const found = localCerts.find((c) => c.filename === cert.filename || c.subject?.includes(cert.cn) );
                        setSelectedCert(found || { filename: cert.filename || 'unknown', info: cert });
                      }}
                    >
                      Permissions
                    </button>
                    <button
                      className="btn btn-sm btn-secondary me-2"
                      onClick={() => checkSSL(cert)}
                    >
                      SSL Check
                    </button>
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => renewCert(cert.serial)}
                    >
                      Renew
                    </button>
                    <button
                      className="btn btn-sm btn-danger me-2"
                      onClick={() => revokeCert(cert.serial)}
                    >
                      Revoke
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteCert(cert.serial)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Certificate Modal */}
        {showForm && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Certificate</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowForm(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label">Common Name (CN)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCert.cn}
                      onChange={(e) => setNewCert({ ...newCert, cn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Issuer</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCert.issuer}
                      onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Website Link</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://yourdomain.com"
                      value={newCert.link}
                      onChange={(e) => setNewCert({ ...newCert, link: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={addCert}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Dev-only debug panel */}
        <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 2200 }}>
          <div className="card p-2" style={{ minWidth: 260, opacity: 0.95 }}>
            <div style={{ fontSize: 12 }}>
              <strong>Dev Debug</strong>
              <div>auth: {user?.uid || 'none'}</div>
              <div>role: {role || 'null'}</div>
              <div>certs: {certs.length}</div>
              <div style={{ color: 'red', whiteSpace: 'pre-wrap' }}>{lastError || ''}</div>
            </div>
          </div>
        </div>
        {/* Local certs modal */}
        {selectedCert && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Certificate Details: {selectedCert.filename}</h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedCert(null)}></button>
                </div>
                <div className="modal-body">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                    {JSON.stringify(selectedCert, null, 2)}
                  </pre>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setSelectedCert(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}