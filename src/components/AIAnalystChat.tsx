import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot, Send, X, Loader2, Sparkles, AlertTriangle, TrendingUp, MessageCircle, Plus, History,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props { isOpen: boolean; onToggle: () => void; }

interface ChartHint { type: "bar" | "line" | "pie"; x: string; y: string; }
interface AssistantPayload {
  rows?: any[];
  aggregated?: any[] | null;
  chart?: ChartHint | null;
  plan?: any;
  insights?: string[];
  composite?: string | null;
}
interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  payload?: AssistantPayload;
  ts: Date;
}

interface Insight { type: string; severity: "info" | "warn" | "critical"; message: string; }

const SUGGESTIONS = [
  "Total revenue this month broken down by payment mode",
  "Top 5 selling menu items in the last 30 days",
  "Charging session revenue last week vs the week before",
  "Show all expenses above NRs. 5000 this month",
  "Inventory items below minimum stock",
];

const NEUTRAL_PALETTE = ["#1f2937", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#374151"];

export default function AIAnalystChat({ isOpen, onToggle }: Props) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // load proactive insights once when opened
  useEffect(() => {
    if (!isOpen || !user) return;
    supabase.functions.invoke("nexus-insights").then(({ data }) => {
      if (data?.insights) setInsights(data.insights);
    }).catch(() => {});
  }, [isOpen, user]);

  // create or load most recent session
  useEffect(() => {
    if (!isOpen || !user || sessionId) return;
    (async () => {
      const { data: existing } = await supabase
        .from("ai_chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        setSessionId(existing.id);
        const { data: msgs } = await supabase
          .from("ai_chat_messages")
          .select("*")
          .eq("session_id", existing.id)
          .order("created_at");
        setMessages((msgs || []).map((m: any) => ({
          id: m.id, role: m.role, content: m.content,
          payload: m.payload as AssistantPayload | undefined,
          ts: new Date(m.created_at),
        })));
      }
    })();
  }, [isOpen, user, sessionId]);

  const newSession = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .insert({ user_id: user.id, title: "New conversation" })
      .select("id").single();
    if (error) { toast({ title: "Failed to start session", variant: "destructive" }); return; }
    setSessionId(data.id);
    setMessages([]);
  }, [user]);

  const persist = async (sid: string, role: Msg["role"], content: string, payload?: any) => {
    if (!user) return;
    await supabase.from("ai_chat_messages").insert({
      session_id: sid, user_id: user.id, role, content, payload: payload || null,
    });
  };

  const send = async () => {
    const q = input.trim();
    if (!q || loading || !user) return;
    setInput("");

    let sid = sessionId;
    if (!sid) {
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .insert({ user_id: user.id, title: q.slice(0, 60) })
        .select("id").single();
      if (error || !data) { toast({ title: "Could not start session", variant: "destructive" }); return; }
      sid = data.id; setSessionId(sid);
    }

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: q, ts: new Date() };
    setMessages((m) => [...m, userMsg]);
    persist(sid, "user", q);

    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("nl-query-engine", {
        body: { question: q, history },
      });
      if (error) throw error;

      if (data?.clarify) {
        const m: Msg = { id: crypto.randomUUID(), role: "assistant", content: data.clarify, ts: new Date() };
        setMessages((p) => [...p, m]); persist(sid, "assistant", data.clarify);
      } else if (data?.error) {
        const m: Msg = { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${data.error}`, ts: new Date() };
        setMessages((p) => [...p, m]); persist(sid, "assistant", m.content);
      } else {
        const payload: AssistantPayload = {
          rows: data.rows, aggregated: data.aggregated, chart: data.chart, plan: data.plan,
          insights: data.insights, composite: data.composite,
        };
        const m: Msg = {
          id: crypto.randomUUID(), role: "assistant",
          content: data.answer || "Done.", payload, ts: new Date(),
        };
        setMessages((p) => [...p, m]);
        persist(sid, "assistant", m.content, payload);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to reach AI engine";
      setMessages((p) => [...p, { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${msg}`, ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        aria-label="Open AI Analyst"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] z-50 flex flex-col shadow-2xl border-border">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-foreground text-background flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AI Analyst</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nexus Energy Flow</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={newSession} aria-label="New conversation">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {insights.length > 0 && messages.length === 0 && (
        <div className="px-4 py-3 border-b bg-muted/40 space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Proactive insights</p>
          {insights.map((i, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {i.severity === "critical" ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> :
                i.severity === "warn" ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" /> :
                <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
              <span className="leading-snug">{i.message}</span>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ask me anything about your business data.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-left text-xs rounded-md border bg-background hover:bg-muted px-3 py-2 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <footer className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about revenue, expenses, anomalies…"
            disabled={loading}
            className="text-sm"
          />
          <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </footer>
    </Card>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${isUser ? "bg-foreground text-background" : "bg-muted text-foreground"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            {msg.payload && <PayloadView payload={msg.payload} />}
          </div>
        )}
      </div>
    </div>
  );
}

function PayloadView({ payload }: { payload: AssistantPayload }) {
  const data = payload.aggregated && payload.aggregated.length > 0 ? payload.aggregated : payload.rows || [];
  const hasInsights = payload.insights && payload.insights.length > 0;
  if ((!data || data.length === 0) && !hasInsights) return null;

  const chart = payload.chart;
  const xKey = chart?.x || (payload.aggregated && data.length > 0 ? Object.keys(data[0])[0] : null);
  const yKey = chart?.y || "value";

  return (
    <div className="mt-2 space-y-3">
      {payload.composite && (
        <Badge variant="secondary" className="text-[10px] font-normal capitalize">
          Multi-table: {payload.composite}
        </Badge>
      )}
      {hasInsights && (
        <ul className="text-xs space-y-1 border-l-2 border-foreground/30 pl-3">
          {payload.insights!.map((i, idx) => (
            <li key={idx}><ReactMarkdown>{i}</ReactMarkdown></li>
          ))}
        </ul>
      )}
      {chart && xKey && (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={xKey} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey={yKey} stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
              </LineChart>
            ) : chart.type === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={70} label>
                  {data.map((_: any, i: number) => <Cell key={i} fill={NEUTRAL_PALETTE[i % NEUTRAL_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={xKey} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey={yKey} fill="hsl(var(--foreground))" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto rounded border">
        <table className="text-xs w-full">
          <thead className="bg-background">
            <tr>
              {Object.keys(data[0]).slice(0, 6).map((k) => (
                <th key={k} className="text-left px-2 py-1 font-medium border-b">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row: any, i: number) => (
              <tr key={i} className="border-b last:border-0">
                {Object.keys(data[0]).slice(0, 6).map((k) => (
                  <td key={k} className="px-2 py-1 align-top">
                    {typeof row[k] === "number" ? Number(row[k]).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[k] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/40">
            Showing 10 of {data.length} rows
          </div>
        )}
      </div>

      {payload.plan?.explanation && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {payload.plan.explanation}
        </Badge>
      )}
    </div>
  );
}
