
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your financial assistant. I can help you with questions about your transactions, daily summaries, and financial insights. What would you like to know?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('balance') || input.includes('money')) {
      return 'To check your current balances, you can view the Financial Summary widget on your dashboard. It shows your cash, eSewa, Fonepay, and cooperative balances in real-time.';
    }
    
    if (input.includes('daily closing') || input.includes('close day')) {
      return 'Daily closing helps you summarize all transactions for a day. Click the "Daily Closing" button on your dashboard to process all transactions and generate a comprehensive daily summary.';
    }
    
    if (input.includes('report') || input.includes('summary')) {
      return 'You can access various reports from the Analytics tab. Available reports include daily summaries, financial insights, and custom reports. All data is based on your daily_summary table for consistency.';
    }
    
    if (input.includes('transaction') || input.includes('order') || input.includes('expense')) {
      return 'You can add transactions using the respective tabs: Orders for sales, Expenses for costs, Deposits for money coming in, and Withdrawals for money going out. All transactions are automatically included in your daily summaries.';
    }
    
    if (input.includes('help') || input.includes('how to')) {
      return 'I can help you with: checking balances, understanding daily closing, viewing reports, adding transactions, and navigating the dashboard features. What specific area would you like help with?';
    }
    
    if (input.includes('error') || input.includes('problem') || input.includes('issue')) {
      return 'If you\'re experiencing issues, try refreshing the page first. For daily closing problems, ensure all transactions are properly saved. If problems persist, check the Settings page for system logs.';
    }
    
    // Use the last message if available, otherwise use default
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === 'user') {
      return `I understand you're asking about "${userInput}". While I can provide general guidance about the financial dashboard features, for specific data queries, please use the Analytics section or contact support for detailed assistance.`;
    }
    
    return `I understand you're asking about "${userInput}". I can help you with dashboard navigation, transaction management, daily closing procedures, and report generation. Could you be more specific about what you need help with?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-blue-700 shadow-lg z-50"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 h-96 shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Financial Assistant
          <Badge className="bg-success/10 text-success text-xs">Online</Badge>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-2 text-sm ${
                  message.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.sender === 'bot' && <Bot className="h-4 w-4 mt-0.5 text-primary" />}
                  <div className="flex-1">
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.sender === 'user' && <User className="h-4 w-4 mt-0.5 text-white" />}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-2 text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 text-sm"
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              size="sm"
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;
