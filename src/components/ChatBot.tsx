import { useState } from "react";

const ChatBot = () => {
  const [userInput, setUserInput] = useState("");
  const [botResponse, setBotResponse] = useState("");

  async function askBot() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userInput }),
    });
    const data = await res.json();
    setBotResponse(data.answer);
  }

  return (
    <div
      id="chat-widget"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "320px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        zIndex: 9999,
        padding: "12px",
      }}
    >
      <h4 style={{ marginTop: 0 }}>Ask Me</h4>
      <input
        type="text"
        id="userInput"
        placeholder="Type your question..."
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <button
        onClick={askBot}
        style={{
          width: "100%",
          padding: "8px",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: "6px",
        }}
      >
        Send
      </button>
      <div id="botResponse" style={{ marginTop: "10px", fontSize: "14px" }}>
        {botResponse}
      </div>
    </div>
  );
};

export default ChatBot;
