import { NextResponse } from "next/server";

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
};

type CommunityForumStore = {
  threads: ForumThread[];
};

const globalStore = globalThis as typeof globalThis & {
  __communityForumStore?: CommunityForumStore;
};

const forumCategories: ForumCategory[] = [
  "Question",
  "Local Tip",
  "Facility Review",
  "Repair & Reuse",
  "Swap / Donate",
  "Announcement",
];

const minReplyLength = 2;

function hoursAgo(hours: number) {
  return new Date(Date.now() - 1000 * 60 * 60 * hours).toISOString();
}

function getStore() {
  if (!globalStore.__communityForumStore) {
    globalStore.__communityForumStore = {
      threads: [
        {
          id: "thread-1",
          title: "Where can I drop off swollen phone batteries in South Bengaluru?",
          category: "Question",
          body:
            "I found two swollen lithium batteries while cleaning an old drawer. Looking for a safe drop-off that accepts them without mixing them with regular e-waste.",
          author: "Ananya",
          location: "JP Nagar",
          tags: ["batteries", "hazardous", "drop-off"],
          status: "Solved",
          votes: 24,
          views: 182,
          pinned: false,
          createdAt: hoursAgo(29),
          lastActivityAt: hoursAgo(3),
          replies: [
            {
              id: "reply-1",
              author: "Rahul",
              body:
                "Saahas Zero Waste took mine last month. Tape the terminals, keep each battery in a separate pouch, and call before visiting.",
              votes: 13,
              isAnswer: true,
              createdAt: hoursAgo(3),
            },
            {
              id: "reply-2",
              author: "Mira",
              body:
                "Croma also runs battery collection drives. The Koramangala desk asked for the battery to be packed in a clear bag.",
              votes: 7,
              isAnswer: false,
              createdAt: hoursAgo(5),
            },
          ],
        },
        {
          id: "thread-2",
          title: "Saturday e-waste van schedule for JP Nagar",
          category: "Local Tip",
          body:
            "The municipal van is collecting chargers, cables, headphones, routers, and small appliances near Mini Forest this Saturday from 9 AM to noon.",
          author: "EcoPath Team",
          location: "JP Nagar 3rd Phase",
          tags: ["e-waste", "collection", "weekend"],
          status: "Pinned",
          votes: 41,
          views: 330,
          pinned: true,
          createdAt: hoursAgo(14),
          lastActivityAt: hoursAgo(1),
          replies: [
            {
              id: "reply-3",
              author: "Dev",
              body:
                "They accepted old power banks too, but rejected tube lights. Good to separate those before going.",
              votes: 11,
              isAnswer: false,
              createdAt: hoursAgo(1),
            },
          ],
        },
        {
          id: "thread-3",
          title: "Reliable repair shop for mixer grinders?",
          category: "Repair & Reuse",
          body:
            "Trying to avoid replacing a working motor because the jar coupler broke. Any shop that does small appliance repair with spare parts?",
          author: "Kavya",
          location: "Indiranagar",
          tags: ["repair", "appliances", "reuse"],
          status: "Open",
          votes: 18,
          views: 146,
          pinned: false,
          createdAt: hoursAgo(8),
          lastActivityAt: hoursAgo(8),
          replies: [],
        },
      ],
    };
  }

  return globalStore.__communityForumStore;
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function trimToLength(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

function isForumCategory(value: unknown): value is ForumCategory {
  return forumCategories.includes(value as ForumCategory);
}

function makeTags(value: unknown) {
  const seen = new Set<string>();

  function normalizeTag(tag: string) {
    return trimToLength(tag.replace(/^#/, "").trim(), 24);
  }

  function uniqueTag(tag: string) {
    const normalizedTag = normalizeTag(tag);
    const key = normalizedTag.toLowerCase();

    if (!normalizedTag || seen.has(key)) return "";

    seen.add(key);
    return normalizedTag;
  }

  if (Array.isArray(value)) {
    return value
      .map(cleanString)
      .map(uniqueTag)
      .filter(Boolean)
      .slice(0, 5);
  }

  return cleanString(value)
    .split(",")
    .map(uniqueTag)
    .filter(Boolean)
    .slice(0, 5);
}

function serializeThread(thread: ForumThread) {
  return {
    ...thread,
    replyCount: thread.replies.length,
  };
}

function getStats(store: CommunityForumStore) {
  return {
    threads: store.threads.length,
    replies: store.threads.reduce((total, thread) => total + thread.replies.length, 0),
    solved: store.threads.filter((thread) => thread.status === "Solved").length,
    members: 128,
  };
}

function sortThreads(threads: ForumThread[], sort: string) {
  const sorted = [...threads];

  if (sort === "popular") {
    return sorted.sort((a, b) => b.votes + b.replies.length * 3 - (a.votes + a.replies.length * 3));
  }

  if (sort === "unanswered") {
    return sorted.sort((a, b) => a.replies.length - b.replies.length);
  }

  return sorted.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "All";
  const query = cleanString(searchParams.get("q")).toLowerCase();
  const sort = searchParams.get("sort") ?? "latest";
  const store = getStore();

  const filtered = store.threads.filter((thread) => {
    const categoryMatches = category === "All" || thread.category === category;
    const queryMatches =
      !query ||
      [thread.title, thread.body, thread.author, thread.location, thread.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return categoryMatches && queryMatches;
  });

  return NextResponse.json({
    threads: sortThreads(filtered, sort).map(serializeThread),
    categories: forumCategories,
    stats: getStats(store),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = cleanString(body?.action);
    const store = getStore();

    if (action === "create-thread") {
      const title = trimToLength(cleanString(body?.title), 120);
      const category = body?.category;
      const threadBody = trimToLength(cleanString(body?.body), 1200);
      const author = trimToLength(cleanString(body?.author), 40) || "Community Member";
      const location = trimToLength(cleanString(body?.location), 80) || "Local area";
      const tags = makeTags(body?.tags);

      if (title.length < 8) {
        return NextResponse.json(
          { error: "Title must be at least 8 characters." },
          { status: 400 }
        );
      }

      if (!isForumCategory(category)) {
        return NextResponse.json({ error: "Invalid category." }, { status: 400 });
      }

      if (threadBody.length < 20) {
        return NextResponse.json(
          { error: "Post body must be at least 20 characters." },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const thread: ForumThread = {
        id: crypto.randomUUID(),
        title,
        category,
        body: threadBody,
        author,
        location,
        tags,
        status: "Open",
        votes: 0,
        views: 1,
        pinned: false,
        createdAt: now,
        lastActivityAt: now,
        replies: [],
      };

      store.threads.unshift(thread);

      return NextResponse.json(
        { thread: serializeThread(thread), stats: getStats(store) },
        { status: 201 }
      );
    }

    if (action === "create-reply") {
      const threadId = cleanString(body?.threadId);
      const replyBody = trimToLength(cleanString(body?.body), 800);
      const author = trimToLength(cleanString(body?.author), 40) || "Community Member";
      const thread = store.threads.find((item) => item.id === threadId);

      if (!thread) {
        return NextResponse.json({ error: "Thread not found." }, { status: 404 });
      }

      if (replyBody.length < minReplyLength) {
        return NextResponse.json(
          { error: `Reply must be at least ${minReplyLength} characters.` },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const reply: ForumReply = {
        id: crypto.randomUUID(),
        author,
        body: replyBody,
        votes: 0,
        isAnswer: false,
        createdAt: now,
      };

      thread.replies.push(reply);
      thread.lastActivityAt = now;

      return NextResponse.json(
        { thread: serializeThread(thread), reply, stats: getStats(store) },
        { status: 201 }
      );
    }

    if (action === "vote-thread") {
      const threadId = cleanString(body?.threadId);
      const thread = store.threads.find((item) => item.id === threadId);

      if (!thread) {
        return NextResponse.json({ error: "Thread not found." }, { status: 404 });
      }

      thread.votes += 1;

      return NextResponse.json({ thread: serializeThread(thread) });
    }

    if (action === "view-thread") {
      const threadId = cleanString(body?.threadId);
      const thread = store.threads.find((item) => item.id === threadId);

      if (!thread) {
        return NextResponse.json({ error: "Thread not found." }, { status: 404 });
      }

      thread.views += 1;

      return NextResponse.json({ thread: serializeThread(thread) });
    }

    if (action === "vote-reply") {
      const threadId = cleanString(body?.threadId);
      const replyId = cleanString(body?.replyId);
      const thread = store.threads.find((item) => item.id === threadId);
      const reply = thread?.replies.find((item) => item.id === replyId);

      if (!thread || !reply) {
        return NextResponse.json({ error: "Reply not found." }, { status: 404 });
      }

      reply.votes += 1;

      return NextResponse.json({ thread: serializeThread(thread), reply });
    }

    return NextResponse.json({ error: "Unsupported forum action." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
