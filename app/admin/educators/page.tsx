"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, MoreHorizontal, RefreshCw, X, Send, Loader2 } from "lucide-react";
import adminAPI from "@/util/server";
import { io, Socket } from "socket.io-client";
import { getAdminAccessToken } from "@/util/server";

type Participant = {
  userId:
    | string
    | {
        _id: string;
        fullName?: string;
        email?: string;
        profilePicture?: string;
        image?: string;
      };
  userType: "Admin" | "Educator";
};

type Conversation = {
  _id: string;
  participants: Participant[];
  lastMessage?: {
    content?: string;
    messageType?: string;
    createdAt?: string;
  };
  lastMessageAt?: string;
  unreadCount?: number;
};

type ChatMessage = {
  _id: string;
  content: string;
  messageType: "text" | "image" | "file";
  attachments?: { url: string; type?: string; filename?: string }[];
  conversationId: string;
  sender: { userId: string | { _id: string }; userType: "Admin" | "Educator" };
  receiver: {
    userId: string | { _id: string };
    userType: "Admin" | "Educator";
  };
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
};

type TableEducator = {
  id: string;
  name: string;
  username: string;
  email: string;
  specialization: string;
  specializationList: string[];
  rating: number;
  status: string;
  totalCourses: number;
  totalStudents: number;
  followersCount: number;
};

type PaginationMeta = {
  currentPage: number;
  totalPages: number;
  totalEducators: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
};

export default function EducatorsPage() {
  const [educators, setEducators] = useState<TableEducator[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedEducator, setSelectedEducator] =
    useState<TableEducator | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatConversations, setChatConversations] = useState<Conversation[]>(
    []
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [specializationFilter, setSpecializationFilter] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>(
    {}
  );
  const PAGE_SIZE = 10;

  const normalizeEducator = useCallback(
    (educator: any): TableEducator | null => {
      const id = educator?.id ?? educator?._id;
      if (!id) {
        return null;
      }

      const specializationList = Array.isArray(educator?.specialization)
        ? educator.specialization.filter(Boolean)
        : [];

      const specialization = specializationList.length
        ? specializationList.join(", ")
        : "—";

      const ratingValue =
        typeof educator?.rating === "number"
          ? educator.rating
          : educator?.rating ?? 0;
      const ratingAverage =
        typeof ratingValue === "number"
          ? Math.round(ratingValue * 100) / 100
          : typeof ratingValue?.average === "number"
          ? Math.round(ratingValue.average * 100) / 100
          : 0;

      const totalCourses = Number.isFinite(Number(educator?.totalCourses))
        ? Number(educator.totalCourses)
        : Array.isArray(educator?.courses)
        ? educator.courses.length
        : 0;

      const totalStudents = Number.isFinite(Number(educator?.totalStudents))
        ? Number(educator.totalStudents)
        : Array.isArray(educator?.followers)
        ? educator.followers.length
        : Number(educator?.followersCount ?? 0);

      return {
        id: String(id),
        name: educator?.fullName || educator?.name || "Unknown",
        username: educator?.username || "—",
        email: educator?.email || "—",
        specialization,
        specializationList,
        rating: ratingAverage,
        status: educator?.status || "inactive",
        totalCourses,
        totalStudents,
        followersCount: Number(educator?.followersCount ?? 0),
      };
    },
    []
  );

  const loadEducators = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await adminAPI.educators.list({
          page: targetPage,
          limit: PAGE_SIZE,
        });
        const rawEducators = response?.educators ?? response ?? [];
        const mapped = Array.isArray(rawEducators)
          ? rawEducators
              .map(normalizeEducator)
              .filter((item): item is TableEducator => Boolean(item))
          : [];

        setEducators(mapped);
        setPagination(response?.pagination ?? null);
      } catch (err) {
        // 401 errors are handled globally by AuthGuard
        const status = (err as { status?: number })?.status;
        if (status !== 401) {
          const message =
            err instanceof Error ? err.message : "Failed to load educators";
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [normalizeEducator, page, PAGE_SIZE]
  );

  useEffect(() => {
    void loadEducators(page);
  }, [loadEducators, page]);

  const toggleEducatorStatus = useCallback(async (row: TableEducator) => {
    const nextStatus = row.status === "active" ? "inactive" : "active";

    setStatusUpdating((prev) => ({ ...prev, [row.id]: true }));
    setEducators((prev) =>
      prev.map((edu) =>
        edu.id === row.id ? { ...edu, status: nextStatus } : edu
      )
    );

    try {
      await adminAPI.educators.updateStatus(row.id, nextStatus);
    } catch (err) {
      setEducators((prev) =>
        prev.map((edu) =>
          edu.id === row.id ? { ...edu, status: row.status } : edu
        )
      );

      const message =
        err instanceof Error ? err.message : "Failed to update educator status";
      setError(message);
    } finally {
      setStatusUpdating((prev) => ({ ...prev, [row.id]: false }));
    }
  }, []);

  const specializationOptions = useMemo(() => {
    const unique = new Set<string>();
    educators.forEach((edu) =>
      edu.specializationList.forEach((spec) => unique.add(spec))
    );
    return Array.from(unique);
  }, [educators]);

  const filteredEducators = useMemo(() => {
    const query = search.trim().toLowerCase();

    return educators.filter((edu) => {
      const matchesSearch = query
        ? [edu.name, edu.email, edu.username, edu.specialization]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true;

      const matchesSpecialization = specializationFilter
        ? edu.specializationList.some(
            (s) => s.toLowerCase() === specializationFilter.toLowerCase()
          )
        : true;

      const minRating = ratingFilter ? Number(ratingFilter) : null;
      const matchesRating = minRating !== null ? edu.rating >= minRating : true;

      return matchesSearch && matchesSpecialization && matchesRating;
    });
  }, [educators, search, specializationFilter, ratingFilter]);

  const columns = [
    { key: "name" as const, label: "Name", sortable: true },
    { key: "email" as const, label: "Email", sortable: true },
    { key: "specialization" as const, label: "Specialization", sortable: true },
    { key: "rating" as const, label: "Rating", sortable: true },
    { key: "totalCourses" as const, label: "Courses", sortable: true },
    { key: "totalStudents" as const, label: "Followers", sortable: true },
    {
      key: "status" as const,
      label: "Status",
      render: (status: string, row: TableEducator) => (
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status}
          </span>
          <button
            type="button"
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(event) => {
              event.stopPropagation();
              void toggleEducatorStatus(row);
            }}
            disabled={Boolean(statusUpdating[row.id]) || isLoading}
          >
            {row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
    {
      key: "id" as const,
      label: "View",
      render: (_value: string, row: TableEducator) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedEducator(row);
            }}
            aria-label="View educator"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        </div>
      ),
    },
  ] as const;

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const resolveId = (value: string | { _id?: string }) =>
    typeof value === "string" ? value : value?._id || "";

  const getOtherParticipant = useCallback(
    (conversation: Conversation | undefined) => {
      if (!conversation) return null;
      return (
        conversation.participants.find((p) => p.userType === "Educator") || null
      );
    },
    []
  );

  const updateConversationUnread = useCallback(
    (conversationId: string, unreadCount: number) => {
      setChatConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, unreadCount: Math.max(unreadCount, 0) }
            : conv
        )
      );
    },
    []
  );

  const incrementConversationUnread = useCallback((conversationId: string) => {
    setChatConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId
          ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
          : conv
      )
    );
  }, []);

  const loadChatConversations = useCallback(async () => {
    setChatLoading(true);
    try {
      const response = await adminAPI.chat.listConversations();
      const payload = response?.data ?? response;
      const conversations = payload?.conversations ?? payload ?? [];
      setChatConversations(conversations);

      if (conversations.length === 0) {
        setSelectedConversationId(null);
        setChatMessages([]);
      } else if (
        selectedConversationId &&
        !conversations.some(
          (c: Conversation) => c._id === selectedConversationId
        )
      ) {
        setSelectedConversationId(conversations[0]._id);
      } else if (!selectedConversationId) {
        setSelectedConversationId(conversations[0]._id);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setChatLoading(false);
    }
  }, [selectedConversationId]);

  const loadChatMessages = useCallback(
    async (conversationId: string | null) => {
      if (!conversationId) {
        setChatMessages([]);
        return;
      }
      setChatMessagesLoading(true);
      try {
        const response = await adminAPI.chat.listMessages(
          conversationId,
          1,
          100
        );
        const payload = response?.data ?? response;
        const messages = payload?.messages ?? payload?.data?.messages ?? [];
        setChatMessages(messages);

        const unreadForAdmin = messages.filter(
          (msg: ChatMessage) =>
            msg.receiver?.userType === "Admin" && !msg.isRead
        );

        if (unreadForAdmin.length > 0) {
          try {
            await adminAPI.chat.markConversationAsRead(conversationId);
          } catch (err) {
            console.error("Failed to mark conversation as read", err);
          }

          const readAt = new Date().toISOString();
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.receiver?.userType === "Admin"
                ? { ...msg, isRead: true, readAt: msg.readAt || readAt }
                : msg
            )
          );
        }

        updateConversationUnread(conversationId, 0);
      } catch (err) {
        console.error("Failed to load chat messages", err);
      } finally {
        setChatMessagesLoading(false);
      }
    },
    [updateConversationUnread]
  );

  useEffect(() => {
    if (isChatOpen) {
      void loadChatConversations();
    }
  }, [isChatOpen, loadChatConversations]);

  useEffect(() => {
    if (!isChatOpen) return;
    void loadChatMessages(selectedConversationId);
  }, [isChatOpen, selectedConversationId, loadChatMessages]);

  useEffect(() => {
    if (!isChatOpen) return;

    const token = getAdminAccessToken();
    if (!token) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:5000";

    const socket = io(`${baseUrl}/admin-educator-chat`, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("new_message", ({ message }) => {
      if (!message) return;
      setChatMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [...prev, message]
      );
      setChatConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === message.conversationId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c
        );
        return updated;
      });

      const isActive = selectedConversationId === message.conversationId;
      const isForAdmin = message.receiver?.userType === "Admin";

      if (isActive && isForAdmin) {
        void adminAPI.chat
          .markMessageAsRead(message._id)
          .catch((err) => console.error("Failed to mark message read", err));

        setChatMessages((prev) =>
          prev.map((m) =>
            m._id === message._id
              ? { ...m, isRead: true, readAt: new Date().toISOString() }
              : m
          )
        );
      } else if (!isActive && isForAdmin) {
        incrementConversationUnread(message.conversationId);
      }
    });

    socket.on("message_sent", ({ message }) => {
      if (message?.conversationId === selectedConversationId) {
        setChatMessages((prev) =>
          prev.some((m) => m._id === message._id) ? prev : [...prev, message]
        );
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [incrementConversationUnread, isChatOpen, selectedConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const selectedConversation = useMemo(
    () =>
      chatConversations.find((c) => c._id === selectedConversationId) || null,
    [chatConversations, selectedConversationId]
  );

  const chatPartner = useMemo(
    () => getOtherParticipant(selectedConversation ?? undefined),
    [getOtherParticipant, selectedConversation]
  );

  const handleSendMessage = async () => {
    if (!selectedConversation || !chatPartner) return;
    const receiverId = resolveId(chatPartner.userId);
    if (!receiverId) return;
    const content = chatInput.trim();
    if (!content) return;

    setChatSending(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          conversationId: selectedConversation._id,
          receiverId,
          receiverType: "Educator",
          content,
          messageType: "text",
          attachments: [],
        });
      } else {
        const response = await adminAPI.chat.sendMessage({
          conversationId: selectedConversation._id,
          receiverId,
          receiverType: "Educator",
          content,
          messageType: "text",
          attachments: [],
        });
        const message = response?.message || response?.data?.message;
        if (message) {
          setChatMessages((prev) => [...prev, message]);
        }
      }
      setChatInput("");
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setChatSending(false);
    }
  };

  const formattedTime = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sortedChatMessages = useMemo(
    () =>
      [...chatMessages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [chatMessages]
  );

  const resolveParticipantName = (participant: Participant | null) => {
    if (!participant) return "Educator";
    if (typeof participant.userId === "object") {
      return (
        participant.userId.fullName ||
        participant.userId.email ||
        participant.userId._id ||
        "Educator"
      );
    }
    return participant.userId;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#2E073F" }}>
          Educators Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage and monitor all educators on the platform
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email, or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-gray-200"
          />
        </div>
        <div className="relative flex items-center gap-3">
          <Button
            type="button"
            className="bg-[#AD49E1] text-white hover:bg-[#932ccc]"
            onClick={() => setIsChatOpen(true)}
          >
            Chat
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            Filter
          </Button>
          {showFilters && (
            <div className="absolute right-28 top-12 z-20 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600">
                    Specialization
                  </p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    {specializationOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">
                    Min Rating
                  </p>
                  <select
                    className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="4.5">4.5+</option>
                    <option value="4">4.0+</option>
                    <option value="3.5">3.5+</option>
                    <option value="3">3.0+</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSpecializationFilter("");
                      setRatingFilter("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              void loadEducators(page);
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {/* <Button style={{ backgroundColor: "#AD49E1", color: "white" }}>Add Educator</Button> */}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable data={filteredEducators} columns={columns as any} />

      <Pagination
        currentPage={pagination?.currentPage ?? page}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />

      {pagination && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredEducators.length} of {pagination.totalEducators}{" "}
          educators
        </div>
      )}

      {!isLoading && !error && filteredEducators.length === 0 && (
        <div className="mt-4 text-sm text-gray-500">
          No educators match the current filters.
        </div>
      )}

      {isLoading && (
        <div className="mt-4 text-sm text-gray-500">Loading educators…</div>
      )}

      {selectedEducator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEducator(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Educator Details
              </h2>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => setSelectedEducator(null)}
                aria-label="Close details"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Name
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {selectedEducator.name}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm text-gray-900">
                    {selectedEducator.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Username
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedEducator.username}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Specialization
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedEducator.specialization}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <span
                    className={`mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                      selectedEducator.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedEducator.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Total Courses
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedEducator.totalCourses}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Total Followers
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedEducator.totalStudents}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Rating
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedEducator.rating}
                </p>
                {selectedEducator.followersCount >
                  selectedEducator.totalStudents && (
                  <p className="mt-1 text-xs text-gray-500">
                    Followers: {selectedEducator.followersCount}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedEducator(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {isChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsChatOpen(false)}
        >
          <div
            className="flex h-162.5 w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Sidebar */}
            <aside className="w-70 shrink-0 border-r border-gray-100 bg-white flex flex-col">
              <div className="px-6 pb-3 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Educators
                    </h2>
                    <p className="text-xs text-gray-500">
                      Recent conversations
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close chat"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                {chatLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : chatConversations.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500 px-3 py-4">
                    No educator messages yet.
                  </div>
                ) : (
                  chatConversations.map((conversation) => {
                    const partner = getOtherParticipant(conversation);
                    const name = resolveParticipantName(partner);
                    const isActive =
                      selectedConversationId === conversation._id;
                    const lastText = conversation.lastMessage?.content || "";
                    const timeLabel = formattedTime(
                      conversation.lastMessage?.createdAt ||
                        conversation.lastMessageAt
                    );

                    return (
                      <button
                        key={conversation._id}
                        type="button"
                        onClick={() => {
                          updateConversationUnread(conversation._id, 0);
                          setSelectedConversationId(conversation._id);
                        }}
                        className={`w-full rounded-xl border border-transparent p-3 text-left transition-colors ${
                          isActive
                            ? "bg-purple-50 border-purple-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative mt-0.5 h-10 w-10 rounded-full bg-linear-to-br from-purple-500 to-fuchsia-500 text-white flex items-center justify-center text-sm font-semibold">
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {name}
                              </p>
                              <span className="text-[11px] text-gray-400">
                                {timeLabel}
                              </span>
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {lastText}
                            </p>
                            {conversation.unreadCount ? (
                              <span className="mt-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                                {conversation.unreadCount} new
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Chat area */}
            <section className="flex min-w-0 flex-1 flex-col bg-white">
              <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full bg-linear-to-br from-purple-500 to-fuchsia-500 text-white flex items-center justify-center text-sm font-semibold">
                    {chatPartner
                      ? resolveParticipantName(chatPartner)
                          .slice(0, 2)
                          .toUpperCase()
                      : "--"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {chatPartner
                        ? resolveParticipantName(chatPartner)
                        : "No conversation"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Real-time chat with educators
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsChatOpen(false)}
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </header>

              <div className="flex-1 bg-white p-6 pb-4">
                <div
                  ref={scrollRef}
                  className="flex h-full flex-col gap-4 overflow-y-auto rounded-2xl bg-gray-50 px-4 py-4"
                >
                  {chatMessagesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                      messages...
                    </div>
                  ) : !selectedConversationId ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      Select an educator to start chatting.
                    </div>
                  ) : sortedChatMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      No messages yet.
                    </div>
                  ) : (
                    sortedChatMessages.map((message) => {
                      const isMine = message.sender.userType === "Admin";
                      const bubbleColor = isMine
                        ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200";
                      return (
                        <div
                          key={message._id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isMine ? "rounded-br-none" : "rounded-bl-none"
                            } ${bubbleColor}`}
                          >
                            {message.messageType === "image" &&
                            message.attachments?.[0]?.url ? (
                              <a
                                href={message.attachments[0].url}
                                target="_blank"
                                rel="noreferrer"
                                className="mb-2 block overflow-hidden rounded-lg"
                              >
                                <img
                                  src={message.attachments[0].url}
                                  alt={
                                    message.attachments[0].filename || "Image"
                                  }
                                  className="max-h-64 w-full object-cover"
                                />
                              </a>
                            ) : null}
                            <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
                              {message.content}
                            </p>
                            <span
                              className={`mt-2 block text-[11px] ${
                                isMine ? "text-white/80" : "text-gray-500"
                              }`}
                            >
                              {formattedTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <footer className="border-t border-gray-100 bg-white px-6 py-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendMessage();
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1">
                    <Input
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={!selectedConversationId || chatSending}
                      className="w-full rounded-full bg-gray-50 border-gray-200"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="gap-2 rounded-full bg-purple-600 px-5 text-white hover:bg-purple-700"
                    disabled={
                      !selectedConversationId ||
                      chatSending ||
                      !chatInput.trim()
                    }
                  >
                    {chatSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send
                      </>
                    )}
                  </Button>
                </form>
              </footer>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
