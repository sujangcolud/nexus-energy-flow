import React from "react";

const BasicTest = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Basic Test Component</h1>
      <p>If you can see this, React is working!</p>
      <div
        style={{
          backgroundColor: "#f0f0f0",
          padding: "10px",
          margin: "10px 0",
        }}
      >
        <p>Current timestamp: {Date.now()}</p>
        <p>Random number: {Math.random()}</p>
      </div>
    </div>
  );
};

export default BasicTest;
