"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Bot, SendHorizontal, Sparkles, User } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "Can I recycle pizza boxes with oil stains?",
  "How should I dispose old phone batteries safely?",
  "Should I donate or recycle torn clothes?",
  "Best option for cracked plastic food containers?",
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m your EcoPath assistant. Ask me anything about reuse, recycling, donation, composting, or safe disposal.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>("");

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;

    setError("");
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      const reply = data.reply?.trim();
      if (!reply) throw new Error("Empty AI response");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I couldn’t answer right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">AI Chat Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Conversational guidance for smarter disposal decisions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Sparkles className="mr-1 size-3" />
                Live assistant
              </Badge>
            </div>
            <CardTitle>Ask anything about waste handling</CardTitle>
            <CardDescription>
              I’ll suggest reuse, repair, donation, recycling, or safe disposal with practical next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Ask specific item questions for better recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-lg border border-border p-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser ? (
                      <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="size-4" />
                      </div>
                    ) : null}

                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted/40 text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>

                    {isUser ? (
                      <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-muted text-foreground">
                        <User className="size-4" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask: Can this item be recycled in my city?"
                disabled={isSending}
              />
              <Button type="submit" disabled={isSending || !input.trim()} className="gap-2">
                {isSending ? "Sending..." : "Send"}
                <SendHorizontal className="size-4" />
              </Button>
            </form>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
