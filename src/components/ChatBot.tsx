import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  MessageCircle,
  X,
  Minimize2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatBot = ({ isOpen, onToggle }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        '🔋 Welcome to Energy Palace Nexus Business Assistant! I\'m here to help you analyze your restaurant and charging station operations.\n\n💡 I can help with:\n• Financial analysis and KPIs\n• Revenue optimization strategies\n• Expense management insights\n• Cash flow analysis\n• Menu performance tracking\n• Charging station utilization\n��� Business forecasting\n\nTry asking: "What\'s my revenue breakdown this week?" or "How is my cash flow?"',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "connecting"
  >("connected");
  const [retryCount, setRetryCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const exampleQuestions = [
    "What's my total revenue this week?",
    "How is my cash flow looking?",
    "Which menu items are most profitable?",
    "Show me expense breakdown by category",
    "What's the charging vs restaurant revenue?",
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const question = messageText || inputValue.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setConnectionStatus("connecting");

    try {
      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: { question },
      });

      if (error) {
        throw new Error(error.message || "Failed to get response from chatbot");
      }

      if (!data || !data.answer) {
        throw new Error("No response received from chatbot");
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConnectionStatus("connected");
      setRetryCount(0);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      setConnectionStatus("error");
      setRetryCount((prev) => prev + 1);

      let errorContent = "🔧 I'm experiencing technical difficulties. ";

      if (error.message?.includes("OpenAI") || error.message?.includes("API")) {
        errorContent +=
          "The AI service is temporarily unavailable. Please try again in a moment.";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorContent +=
          "There seems to be a connection issue. Please check your internet connection.";
      } else if (
        error.message?.includes("unauthorized") ||
        error.message?.includes("auth")
      ) {
        errorContent +=
          "Authentication error. Please refresh the page and try again.";
      } else {
        errorContent +=
          "Please try rephrasing your question or ask about:\n• Revenue and profit analysis\n• Expense tracking\n• Cash flow status\n• Menu performance\n• Charging station data";
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (messages.length > 1) {
      const lastUserMessage = messages.findLast((msg) => msg.type === "user");
      if (lastUserMessage) {
        handleSendMessage(lastUserMessage.content);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50 bg-slate-600 hover:bg-slate-700 touch-target"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] max-h-[80vh] shadow-xl z-50 flex flex-col border border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-800">
                Business Assistant
              </CardTitle>
              <div className="flex items-center gap-1">
                <Badge
                  variant={
                    connectionStatus === "connected"
                      ? "default"
                      : connectionStatus === "error"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {connectionStatus === "connected" && "🟢 Online"}
                  {connectionStatus === "error" && "🔴 Error"}
                  {connectionStatus === "connecting" && "🟡 Connecting"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {connectionStatus === "error" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRetry}
                className="hover:bg-slate-100 touch-target"
                title="Retry last message"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="hover:bg-slate-100 touch-target"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="hover:bg-slate-100 touch-target"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        <ScrollArea className="flex-1 pr-3" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.type === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-slate-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.type === "user"
                      ? "bg-slate-600 text-white ml-auto"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>

                {message.type === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-slate-600" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Example Questions */}
        {messages.length <= 1 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Try asking:
            </p>
            <div className="flex flex-wrap gap-1">
              {exampleQuestions.slice(0, 3).map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(question)}
                  disabled={isLoading}
                  className="text-xs h-7 px-2 bg-white hover:bg-blue-50 border-blue-200"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about revenue, expenses, trends..."
            disabled={isLoading}
            className="flex-1 border-slate-300 focus:border-blue-500"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 touch-target"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {connectionStatus === "error" && retryCount > 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>Connection issues (attempt {retryCount})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="ml-auto h-6 px-2 text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatBot;
