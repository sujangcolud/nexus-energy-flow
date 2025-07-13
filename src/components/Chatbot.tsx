import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  text: string;
  sender: "user" | "bot";
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    if (input.trim() === "") return;

    const newMessages: Message[] = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput("");

    setInput("");

    const getBotResponse = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("chatbot", {
          body: JSON.stringify({ question: input }),
        });
        if (error) throw error;
        setMessages([
          ...newMessages,
          { text: data.response, sender: "bot" },
        ]);
      } catch (err: any) {
        setMessages([
          ...newMessages,
          { text: "Sorry, something went wrong.", sender: "bot" },
        ]);
      }
    };

    getBotResponse();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chatbot</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 p-4 border rounded-md">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chatbot;
