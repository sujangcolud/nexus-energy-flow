import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const SimpleApp = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Simple App Test</h1>
      <p>If you can see this, the app is loading correctly!</p>
      <BrowserRouter basename="/poss">
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h2>Home Page</h2>
                <p>This is the home page content.</p>
                <div
                  style={{
                    backgroundColor: "#f0f0f0",
                    padding: "10px",
                    margin: "10px 0",
                  }}
                >
                  <p>Current time: {new Date().toLocaleString()}</p>
                  <p>Random: {Math.random()}</p>
                </div>
              </div>
            }
          />
          <Route
            path="/test"
            element={
              <div>
                <h2>Test Page</h2>
                <p>This is the test page.</p>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default SimpleApp;
