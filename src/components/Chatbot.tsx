import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  text: string;
  sender: "user" | "bot";
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (input.trim() === "") return;

    const newMessages: Message[] = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    const question = input;
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: JSON.stringify({ question }),
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
    } finally {
      setLoading(false);
    }
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
            {loading && (
              <div className="flex justify-start">
                <div className="p-2 rounded-lg bg-muted">...</div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={loading}
          />
          <Button onClick={handleSendMessage} disabled={loading}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chatbot;
