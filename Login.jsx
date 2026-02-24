// src/Login.jsx
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css"; // Added Bootstrap import for styling
import { signUp, signIn } from "./services/auth";

export default function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(""); // Keeping 'email' as per the target code
  const [password, setPassword] = useState("");
  // Renamed 'msg' to 'message' and separated success/error for better alert styling
  const [error, setError] = useState(""); 
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
        setError("Please enter both email and password.");
        return;
    }
    
    try {
      if (isSignUp) {
        await signUp(email, password);
        // On successful sign-up, set success message and switch to sign-in mode
        setSuccess("Account created successfully! Please sign in.");
        setIsSignUp(false);
        setEmail("");
        setPassword("");
      } else {
        // Sign In logic
        await signIn(email, password);
        // Call the parent onLogin function on success
        onLogin(); 
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      // Set the error message from the external service (e.g., Firebase error)
      setError(err.message || "An unknown error occurred during authentication.");
    }
  };

  const handleToggleMode = (signUp) => {
    setIsSignUp(signUp);
    setError("");
    setSuccess("");
    // Clear inputs when toggling between Sign In and Sign Up
    setEmail(""); 
    setPassword("");
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center bg-light"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div
        className="bg-white shadow-lg rounded-4 p-5"
        style={{
          width: "500px",
          maxWidth: "90%",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h2 className="text-center mb-4 text-primary">
          🔐 {isSignUp ? "Create Account" : "PKI Dashboard Login"}
        </h2>

        {/* Display Alert Messages */}
        {error && (
          <div className="alert alert-danger py-2 text-center">{error}</div>
        )}
        {success && (
          <div className="alert alert-success py-2 text-center">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Input (Username from first code block changed to Email) */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Email Address</label>
            <input
              type="email" // Using type="email" for better validation
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
            />
          </div>

          {/* Password Input */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold mt-3 py-2"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="text-center mt-4">
          {isSignUp ? (
            <>
              <span>Already have an account? </span>
              <button
                className="btn btn-link p-0"
                onClick={() => handleToggleMode(false)}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <span>Don’t have an account? </span>
              <button
                className="btn btn-link p-0"
                onClick={() => handleToggleMode(true)}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}