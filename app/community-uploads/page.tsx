"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Flame,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Tag,
  type LucideIcon,
  Users,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ForumCategory =
  | "Question"
  | "Local Tip"
  | "Facility Review"
  | "Repair & Reuse"
  | "Swap / Donate"
  | "Announcement";

type ForumThreadStatus = "Open" | "Solved" | "Pinned";

type ForumReply = {
  id: string;
  author: string;
  body: string;
  votes: number;
  isAnswer: boolean;
  createdAt: string;
};

type ForumThread = {
  id: string;
  title: string;
  category: ForumCategory;
  body: string;
  author: string;
  location: string;
  tags: string[];
  status: ForumThreadStatus;
  votes: number;
  views: number;
  pinned: boolean;
  createdAt: string;
  lastActivityAt: string;
  replies: ForumReply[];
  replyCount: number;
};

type ForumStats = {
  threads: number;
  replies: number;
  solved: number;
  members: number;
};

type SortMode = "latest" | "popular" | "unanswered";

const forumCategories: ForumCategory[] = [
  "Question",
  "Local Tip",
  "Facility Review",
  "Repair & Reuse",
  "Swap / Donate",
  "Announcement",
];

const searchSuggestions = ["batteries", "repair", "e-waste", "hazardous"];
const minReplyLength = 2;

function categoryColor(category: ForumCategory) {
  switch (category) {
    case "Question":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Local Tip":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Facility Review":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "Repair & Reuse":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Swap / Donate":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Announcement":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "";
  }
}

function categoryAccentColor(category: ForumCategory) {
  switch (category) {
    case "Question":
      return "border-l-blue-500";
    case "Local Tip":
      return "border-l-emerald-500";
    case "Facility Review":
      return "border-l-cyan-500";
    case "Repair & Reuse":
      return "border-l-amber-500";
    case "Swap / Donate":
      return "border-l-violet-500";
    case "Announcement":
      return "border-l-rose-500";
    default:
      return "border-l-border";
  }
}

function statusColor(status: ForumThreadStatus) {
  switch (status) {
    case "Solved":
      return "bg-emerald-600 text-white";
    case "Pinned":
      return "bg-amber-500 text-white";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function tagColor(tag: string) {
  const normalizedTag = tag.toLowerCase();

  if (normalizedTag.includes("hazard") || normalizedTag.includes("swollen")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalizedTag.includes("battery") || normalizedTag.includes("power")) {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }

  if (
    normalizedTag.includes("repair") ||
    normalizedTag.includes("reuse") ||
    normalizedTag.includes("appliance")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalizedTag.includes("drop") || normalizedTag.includes("collection")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalizedTag.includes("e-waste")) {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getViewerCount(thread: ForumThread) {
  return Math.max(4, (thread.views % 17) + thread.replyCount + 3);
}

function isTrending(thread: ForumThread) {
  return thread.pinned || thread.votes >= 25 || thread.replyCount >= 2;
}

function getEmptyState(activeCategory: ForumCategory | "All", searchQuery: string) {
  if (searchQuery.trim()) {
    return {
      title: "No matching discussions.",
      body: "Try another search term or create a post for the community to answer.",
    };
  }

  if (activeCategory === "Swap / Donate") {
    return {
      title: "No swap posts yet.",
      body: "Be the first to help someone reuse electronics instead of discarding them.",
    };
  }

  if (activeCategory === "Repair & Reuse") {
    return {
      title: "No repair leads yet.",
      body: "Share a repair shop, spare-part source, or reuse idea.",
    };
  }

  if (activeCategory === "Facility Review") {
    return {
      title: "No facility reviews yet.",
      body: "Post accepted materials, timings, staff notes, and visit caveats.",
    };
  }

  return {
    title: "No discussions yet.",
    body: "Create the first useful post for this topic.",
  };
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sortThreads(threads: ForumThread[], sortMode: SortMode) {
  const sorted = [...threads];

  if (sortMode === "popular") {
    return sorted.sort(
      (a, b) => b.votes + b.replyCount * 3 - (a.votes + a.replyCount * 3)
    );
  }

  if (sortMode === "unanswered") {
    return sorted.sort((a, b) => a.replyCount - b.replyCount);
  }

  return sorted.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );
}

function StatusPill({ status }: { status: ForumThreadStatus }) {
  const Icon = status === "Solved" ? CheckCircle2 : status === "Pinned" ? Pin : Circle;

  return (
    <Badge className={cn("gap-1", statusColor(status))}>
      <Icon className="size-3" />
      {status}
    </Badge>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tagColor(tag)
      )}
    >
      <Tag className="size-3" />
      {tag}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">
      {getInitials(name) || "CM"}
    </span>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
      <Icon className="size-4 text-emerald-600" />
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export default function CommunityUploadsPage() {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [stats, setStats] = useState<ForumStats>({
    threads: 0,
    replies: 0,
    solved: 0,
    members: 0,
  });
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [activeCategory, setActiveCategory] = useState<ForumCategory | "All">("All");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ForumCategory>("Question");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const replyBoxRef = useRef<HTMLTextAreaElement>(null);
  const viewedThreadIdsRef = useRef<Set<string>>(new Set());

  const canCreateThread = title.trim().length >= 8 && body.trim().length >= 20;

  const visibleThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = threads.filter((thread) => {
      const categoryMatches =
        activeCategory === "All" || thread.category === activeCategory;
      const queryMatches =
        !query ||
        [thread.title, thread.body, thread.author, thread.location, thread.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return categoryMatches && queryMatches;
    });

    return sortThreads(filtered, sortMode);
  }, [activeCategory, searchQuery, sortMode, threads]);

  const selectedThread =
    visibleThreads.find((thread) => thread.id === selectedThreadId) ??
    visibleThreads[0] ??
    threads[0];
  const emptyState = getEmptyState(activeCategory, searchQuery);

  useEffect(() => {
    async function loadThreads() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/community-uploads");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load forum threads");
        }

        const nextThreads = data.threads ?? [];
        setThreads(nextThreads);
        setSelectedThreadId((currentThreadId) => {
          const hashThreadId = window.location.hash.replace("#", "");
          const hashThreadExists = nextThreads.some(
            (thread: ForumThread) => thread.id === hashThreadId
          );

          return currentThreadId || (hashThreadExists ? hashThreadId : nextThreads[0]?.id) || "";
        });
        setStats(
          data.stats ?? {
            threads: 0,
            replies: 0,
            solved: 0,
            members: 0,
          }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load forum threads.";
        setFeedbackMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadThreads();
  }, []);

  function replaceThread(updatedThread: ForumThread) {
    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === updatedThread.id ? updatedThread : thread
      )
    );
  }

  function resetCreateForm() {
    setTitle("");
    setCategory("Question");
    setLocation("");
    setTags("");
    setBody("");
    setFormError("");
  }

  function handleCreateDialogOpenChange(open: boolean) {
    setIsCreateDialogOpen(open);

    if (open) {
      setFormError("");
      return;
    }

    resetCreateForm();
  }

  async function selectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setFeedbackMessage("");
    window.history.replaceState(null, "", `#${threadId}`);

    if (viewedThreadIdsRef.current.has(threadId)) return;

    viewedThreadIdsRef.current.add(threadId);

    try {
      const response = await fetch("/api/community-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view-thread", threadId }),
      });
      const data = await response.json();

      if (response.ok) {
        replaceThread(data.thread as ForumThread);
      }
    } catch {
      viewedThreadIdsRef.current.delete(threadId);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateThread) return;

    setIsSubmitting(true);
    setFormError("");
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/community-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-thread",
          author,
          title,
          category,
          location,
          tags,
          body,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create thread");
      }

      const thread = data.thread as ForumThread;
      setThreads((currentThreads) => [thread, ...currentThreads]);
      if (data.stats) setStats(data.stats as ForumStats);
      setActiveCategory("All");
      setSearchQuery("");
      setSortMode("latest");
      await selectThread(thread.id);
      resetCreateForm();
      setFeedbackMessage("Thread posted.");
      setIsCreateDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create thread right now.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || replyBody.trim().length < minReplyLength) {
      setFormError(`Reply must be at least ${minReplyLength} characters.`);
      return;
    }

    setIsReplying(true);
    setFormError("");
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/community-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-reply",
          threadId: selectedThread.id,
          author,
          body: replyBody,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to post reply");
      }

      replaceThread(data.thread as ForumThread);
      if (data.stats) setStats(data.stats as ForumStats);
      setReplyBody("");
      setFeedbackMessage("Reply posted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to post reply right now.";
      setFormError(message);
    } finally {
      setIsReplying(false);
    }
  }

  async function voteThread(threadId: string) {
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/community-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote-thread", threadId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to vote.");
      }

      replaceThread(data.thread as ForumThread);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to vote.";
      setFeedbackMessage(message);
    }
  }

  async function voteReply(threadId: string, replyId: string) {
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/community-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote-reply", threadId, replyId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to vote.");
      }

      replaceThread(data.thread as ForumThread);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to vote.";
      setFeedbackMessage(message);
    }
  }

  async function shareSelectedThread() {
    if (!selectedThread) return;

    const threadUrl = `${window.location.origin}${window.location.pathname}#${selectedThread.id}`;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(threadUrl);
      setFeedbackMessage("Thread link copied.");
    } catch {
      setFeedbackMessage(threadUrl);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                EcoPath Community
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Community Forum
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Ask questions, share local disposal updates, and help neighbors reuse
                before they discard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Back
              </Link>
              <Button
                type="button"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => {
                  setFormError("");
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Create Post
              </Button>
              <UserMenu />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="threads" value={stats.threads} icon={MessageSquare} />
            <StatPill label="replies" value={stats.replies} icon={MessageCircle} />
            <StatPill label="solved" value={stats.solved} icon={CheckCircle2} />
            <StatPill label="members" value={stats.members} icon={Users} />
          </div>
          {feedbackMessage ? (
            <div className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              {feedbackMessage}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <Card className="overflow-hidden">
            <CardHeader className="gap-4 border-b border-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Discussions</CardTitle>
                  <CardDescription>
                    {visibleThreads.length} thread
                    {visibleThreads.length === 1 ? "" : "s"} shown.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="group relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search batteries, repair, e-waste…"
                      className="pl-8 sm:w-72"
                    />
                  </div>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Popular</option>
                    <option value="unanswered">Unanswered</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(["All", ...forumCategories] as const).map((option) => {
                  const count =
                    option === "All"
                      ? threads.length
                      : threads.filter((thread) => thread.category === option).length;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setActiveCategory(option)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                        activeCategory === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {option} <span className="text-xs opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSearchQuery(suggestion)}
                    className="rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    #{suggestion}
                  </button>
                ))}
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="rounded-full px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="grid gap-0 divide-y divide-border">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="grid gap-3 p-4 sm:grid-cols-[84px_1fr]">
                      <div className="h-14 animate-pulse rounded-lg bg-muted" />
                      <div className="grid gap-3">
                        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleThreads.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <MessageSquare className="mx-auto size-8 text-muted-foreground" />
                  <h3 className="mt-3 text-base font-semibold">{emptyState.title}</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    {emptyState.body}
                  </p>
                  <Button
                    type="button"
                    className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => {
                      setFormError("");
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Create Post
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visibleThreads.map((thread) => (
                    <article
                      key={thread.id}
                      className={cn(
                        "group border-l-4 bg-background p-4 transition-all duration-200 hover:bg-muted/40",
                        categoryAccentColor(thread.category),
                        selectedThread?.id === thread.id && "bg-muted/60"
                      )}
                    >
                      <div className="grid gap-4 sm:grid-cols-[92px_minmax(0,1fr)]">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground sm:grid-cols-1">
                          <button
                            type="button"
                            onClick={() => void voteThread(thread.id)}
                            className="rounded-lg border border-border bg-background px-2 py-1.5 font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                            aria-label={`Upvote ${thread.title}`}
                          >
                            <ArrowUp className="mx-auto size-3.5" />
                            <span className="block text-base text-foreground">
                              {thread.votes}
                            </span>
                            votes
                          </button>
                          <div className="rounded-lg bg-muted px-2 py-1.5">
                            <span className="block text-base font-semibold text-foreground">
                              {thread.replyCount}
                            </span>
                            replies
                          </div>
                          <div className="rounded-lg bg-muted px-2 py-1.5">
                            <span className="block text-base font-semibold text-foreground">
                              {thread.views}
                            </span>
                            views
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void selectThread(thread.id)}
                          className="min-w-0 cursor-pointer text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={categoryColor(thread.category)}>
                              {thread.category}
                            </Badge>
                            <StatusPill status={thread.status} />
                            {isTrending(thread) ? (
                              <Badge className="bg-orange-500 text-white">
                                <Flame className="size-3" />
                                Trending
                              </Badge>
                            ) : null}
                          </div>

                          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                            {thread.title}
                          </h2>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {thread.body}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {thread.tags.slice(0, 4).map((tag) => (
                              <TagPill key={tag} tag={tag} />
                            ))}
                            {thread.tags.length > 4 ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                +{thread.tags.length - 4}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
                              <Avatar name={thread.author} />
                              {thread.author}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {thread.location}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Eye className="size-3.5" />
                              {getViewerCount(thread)} viewing
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="size-3.5" />
                              {formatRelativeTime(thread.lastActivityAt)}
                            </span>
                          </div>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="min-w-0 self-start lg:sticky lg:top-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <CardTitle>Thread Preview</CardTitle>
              <CardDescription>Selected discussion and replies.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedThread ? (
                <div className="px-4 py-10 text-sm text-muted-foreground">
                  Select a discussion to view replies.
                </div>
              ) : (
                <div className="grid gap-0">
                  <div className="grid gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={categoryColor(selectedThread.category)}
                      >
                        {selectedThread.category}
                      </Badge>
                      <StatusPill status={selectedThread.status} />
                    </div>
                    <h2 className="text-lg font-semibold leading-snug">
                      {selectedThread.title}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {selectedThread.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
                        <Avatar name={selectedThread.author} />
                        {selectedThread.author}
                      </span>
                      {selectedThread.author === "EcoPath Team" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="size-3.5" />
                          Verified
                        </span>
                      ) : null}
                      <span>{formatRelativeTime(selectedThread.createdAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void voteThread(selectedThread.id)}
                      >
                        <ArrowUp className="size-3.5" />
                        Vote
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => replyBoxRef.current?.focus()}
                      >
                        <MessageCircle className="size-3.5" />
                        Reply
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={shareSelectedThread}
                      >
                        <Share2 className="size-3.5" />
                        Share
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Replies</h3>
                      <span className="text-xs text-muted-foreground">
                        {selectedThread.replyCount}
                      </span>
                    </div>

                    {selectedThread.replies.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                        No replies yet.
                      </div>
                    ) : (
                      <div className="grid max-h-[360px] gap-3 overflow-auto pr-1">
                        {selectedThread.replies.map((reply) => (
                          <article
                            key={reply.id}
                            className={cn(
                              "rounded-lg border bg-background p-3",
                              reply.isAnswer
                                ? "border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/60"
                                : "border-border"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 gap-2">
                                <Avatar name={reply.author} />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium">{reply.author}</p>
                                    {reply.isAnswer ? (
                                      <Badge className="bg-emerald-600 text-white">
                                        <CheckCircle2 className="size-3" />
                                        Best Answer
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {reply.body}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatRelativeTime(reply.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  void voteReply(selectedThread.id, reply.id)
                                }
                                className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold hover:text-primary"
                                aria-label="Upvote reply"
                              >
                                <ArrowUp className="size-3" />
                                {reply.votes}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <form className="border-t border-border p-4" onSubmit={handleCreateReply}>
                    <Label htmlFor="forum-reply">Reply</Label>
                    <textarea
                      id="forum-reply"
                      ref={replyBoxRef}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Add a practical answer..."
                      className="mt-2 min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <Button
                      type="submit"
                      disabled={replyBody.trim().length < minReplyLength || isReplying}
                      className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isReplying ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {isReplying ? "Posting…" : "Post Reply"}
                    </Button>
                    {formError ? (
                      <p className="mt-2 text-xs text-destructive">{formError}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Minimum {minReplyLength} characters.
                      </p>
                    )}
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Start a focused discussion. Add location, category, and useful context.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleCreateThread}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="forum-author">Display name</Label>
                <Input
                  id="forum-author"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="Community Member"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="forum-location">Location</Label>
                <Input
                  id="forum-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="E.g., JP Nagar, Bengaluru"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="forum-title">Title</Label>
              <Input
                id="forum-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="E.g., Where can I recycle swollen phone batteries?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="forum-category">Category</Label>
                <select
                  id="forum-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ForumCategory)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  {forumCategories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="forum-tags">Tags</Label>
                <Input
                  id="forum-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="battery, repair, e-waste"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="forum-body">Details</Label>
              <textarea
                id="forum-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Add context, what you already tried, timings, accepted materials, or proof that helps others answer."
                className="min-h-[140px] rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canCreateThread || isSubmitting}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {isSubmitting ? "Posting…" : "Post Thread"}
              </Button>
            </div>

            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
