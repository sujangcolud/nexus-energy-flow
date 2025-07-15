import React from "react";

const TestComponent = () => {
  console.log("TestComponent rendering");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f0f0",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h1 style={{ color: "#333", fontSize: "24px", marginBottom: "20px" }}>
        Test Component - Page is Loading!
      </h1>
      <p style={{ color: "#666", fontSize: "16px" }}>
        If you can see this, React is working correctly.
      </p>
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <p>Current time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default TestComponent;
