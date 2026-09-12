"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { rtcConfig } from "@/lib/webrtc";
import { clearToken, getToken } from "@/lib/auth";
import { callDuration, dayLabel, timeOf } from "@/lib/ui";
import { Avatar } from "@/components/Avatar";
import {
  AlertIcon,
  ChatBubbleIcon,
  LogoutIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  UsersIcon,
  VideoIcon,
  VideoOffIcon,
} from "@/components/Icons";

interface User {
  id: number;
  username: string;
  email: string;
}

interface ChatMessage {
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
}

interface GroupMessage {
  type: "group_message";
  group_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

/** Shape the two message kinds share, so one renderer can draw both. */
interface RenderMessage {
  key: string;
  senderId: number;
  content: string;
  createdAt: string;
}

type CallState = "idle" | "calling" | "ringing" | "in-call";

export default function ChatPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<{
    from: number;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const [callPeerId, setCallPeerId] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // The socket handler needs to know who is on screen, but must NOT be torn down
  // and rebuilt every time you click a different conversation - messages sent
  // during that gap would be dropped. A ref gives the handler a live value
  // without making it a dependency.
  const selectedUserRef = useRef<User | null>(null);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  /* ------------------------------ auth guard ----------------------------- */
  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const logout = () => {
    wsRef.current?.close();
    clearToken();
    router.replace("/login");
  };

  // Declared up here because the socket handler below closes over it - a `const`
  // defined further down would still be in its temporal dead zone at that point.
  const teardownCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle");
    setIncomingCall(null);
    setCallPeerId(null);
    setMicOn(true);
    setCamOn(true);
    setCallSeconds(0);
  };

  /* ------------------------------ initial load --------------------------- */
  useEffect(() => {
    if (!getToken()) return;

    api
      .get("/users/me")
      .then((res) => setCurrentUser(res.data))
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
    api.get("/users/").then((res) => setUsers(res.data)).catch(() => { });
    api
      .get("/groups/")
      .then((res) => setGroups(res.data))
      .catch(() => setLoadError("Could not load groups."));
  }, [router]);

  /* ------------------------------ websocket ------------------------------ */
  useEffect(() => {
    if (!currentUser) return;

    const token = getToken();
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${token}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "group_message") {
        setGroupMessages((prev) => [...prev, data]);
        return;
      }

      if (data.type === "typing") {
        if (data.sender_id === selectedUserRef.current?.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
        return;
      }

      if (data.type === "call-offer") {
        setIncomingCall({ from: data.sender_id, offer: data.offer });
        setCallState("ringing");
        return;
      }

      if (data.type === "call-answer") {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        setCallState("in-call");
        return;
      }

      if (data.type === "ice-candidate") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
        return;
      }

      if (data.type === "call-end" || data.type === "call-reject") {
        teardownCall();
        return;
      }

      setMessages((prev) => [...prev, data]);
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [currentUser]);

  /* --------------------------- history loading --------------------------- */
  useEffect(() => {
    if (!selectedUser) return;
    api.get(`/messages/${selectedUser.id}`).then((res) => {
      setMessages((prev) => {
        const others = prev.filter(
          (m) => m.sender_id !== selectedUser.id && m.receiver_id !== selectedUser.id
        );
        return [...others, ...res.data];
      });
    });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedGroup) return;
    api.get(`/groups/${selectedGroup.id}/messages`).then((res) => {
      setGroupMessages(
        res.data.map((m: Omit<GroupMessage, "type">) => ({ ...m, type: "group_message" as const }))
      );
    });
  }, [selectedGroup]);

  /* ---------------------------- presence polling -------------------------- */
  useEffect(() => {
    if (users.length === 0) return;

    const checkOnlineStatus = async () => {
      const statuses: Record<number, boolean> = {};
      await Promise.all(
        users.map(async (u) => {
          try {
            const res = await api.get(`/online/${u.id}`);
            statuses[u.id] = res.data.online;
          } catch {
            statuses[u.id] = false;
          }
        })
      );
      setOnlineUsers(statuses);
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 3000);
    return () => clearInterval(interval);
  }, [users]);

  /* ----------------------------- call duration ---------------------------- */
  // The counter is reset in teardownCall / startCall rather than here - resetting
  // state synchronously inside an effect body triggers a cascading render.
  useEffect(() => {
    if (callState !== "in-call") return;
    const t = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  /* ------------------------------ messaging ------------------------------ */
  const handleTyping = () => {
    if (!selectedUser || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "typing", receiver_id: selectedUser.id }));
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedUser || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ receiver_id: selectedUser.id, content: input }));
    setInput("");
  };

  const sendGroupMessage = () => {
    if (!input.trim() || !selectedGroup || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({ type: "group_message", group_id: selectedGroup.id, content: input })
    );
    setInput("");
  };

  const send = () => (selectedGroup ? sendGroupMessage() : sendMessage());

  /* -------------------------------- groups -------------------------------- */
  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) return;
    setCreatingGroup(true);
    try {
      const res = await api.post("/groups/", {
        name: newGroupName,
        member_ids: selectedMemberIds,
      });
      setGroups((prev) => [...prev, res.data]);
      setNewGroupName("");
      setSelectedMemberIds([]);
      setShowCreateGroup(false);
      setSelectedGroup(res.data);
      setSelectedUser(null);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMemberSelection = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  /* -------------------------------- calling ------------------------------- */
  const createPeerConnection = (targetUserId: number) => {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            receiver_id: targetUserId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (targetUser: User) => {
    setCallState("calling");
    setCallPeerId(targetUser.id);
    setCallSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(targetUser.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current?.send(
        JSON.stringify({ type: "call-offer", receiver_id: targetUser.id, offer })
      );
    } catch {
      setLoadError("Could not access your camera or microphone.");
      teardownCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const from = incomingCall.from;
    setCallState("in-call");
    setCallPeerId(from);
    setCallSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(from);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsRef.current?.send(JSON.stringify({ type: "call-answer", receiver_id: from, answer }));
      setIncomingCall(null);
    } catch {
      setLoadError("Could not access your camera or microphone.");
      teardownCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    wsRef.current?.send(JSON.stringify({ type: "call-reject", receiver_id: incomingCall.from }));
    setIncomingCall(null);
    setCallState("idle");
    setCallPeerId(null);
  };

  const endCall = () => {
    // Hang up on whoever we are actually talking to - not whichever
    // conversation happens to be open on screen right now.
    if (callPeerId !== null) {
      wsRef.current?.send(JSON.stringify({ type: "call-end", receiver_id: callPeerId }));
    }
    teardownCall();
  };

  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !micOn;
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    const next = !camOn;
    tracks.forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  /* ------------------------------ derived data ---------------------------- */
  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser]
  );

  const filteredUsers = useMemo(
    () => otherUsers.filter((u) => u.username.toLowerCase().includes(search.toLowerCase())),
    [otherUsers, search]
  );

  const filteredGroups = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  const renderMessages: RenderMessage[] = useMemo(() => {
    if (selectedGroup) {
      return groupMessages
        .filter((m) => m.group_id === selectedGroup.id)
        .map((m, i) => ({
          key: `g-${i}-${m.created_at}`,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
        }));
    }
    if (selectedUser) {
      return messages
        .filter(
          (m) =>
            (m.sender_id === currentUser?.id && m.receiver_id === selectedUser.id) ||
            (m.sender_id === selectedUser.id && m.receiver_id === currentUser?.id)
        )
        .map((m, i) => ({
          key: `d-${i}-${m.created_at}`,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
        }));
    }
    return [];
  }, [selectedGroup, selectedUser, groupMessages, messages, currentUser]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [renderMessages.length, selectedUser, selectedGroup, isTyping]);

  const peer = callPeerId !== null ? users.find((u) => u.id === callPeerId) : undefined;
  const caller = incomingCall ? users.find((u) => u.id === incomingCall.from) : undefined;
  const nameOf = (id: number) => users.find((u) => u.id === id)?.username ?? "Unknown";

  const headerTitle = selectedGroup ? selectedGroup.name : selectedUser?.username ?? "";
  const isGroupView = Boolean(selectedGroup);

  /* --------------------------------- render -------------------------------- */
  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      {/* ============================== SIDEBAR ============================== */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-surface">
        {/* account row */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Avatar
            name={currentUser?.username ?? "?"}
            seed={currentUser?.id ?? "?"}
            size="md"
            online={connected}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {currentUser?.username ?? "Loading..."}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-online" : "bg-danger"}`}
              />
              {connected ? "Connected" : "Reconnecting..."}
            </p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-danger"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* search */}
        <div className="px-3 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people and groups"
              className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
            />
          </div>
        </div>

        {/* lists - one scroll region, not two fighting for space */}
        <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
          <SectionHeader icon={<UsersIcon className="h-3.5 w-3.5" />} label="Direct messages" />
          {filteredUsers.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No people found.</p>
          )}
          {filteredUsers.map((u) => {
            const active = selectedUser?.id === u.id;
            return (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setSelectedGroup(null);
                }}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-accent text-accent-fg" : "text-ink hover:bg-surface-2"
                  }`}
              >
                <Avatar name={u.username} seed={u.id} size="sm" online={!!onlineUsers[u.id]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{u.username}</span>
                  <span
                    className={`block truncate text-xs ${active ? "text-accent-fg/70" : "text-muted"}`}
                  >
                    {onlineUsers[u.id] ? "Online" : "Offline"}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="mt-4 flex items-center justify-between pr-1">
            <SectionHeader icon={<ChatBubbleIcon className="h-3.5 w-3.5" />} label="Groups" />
            <button
              onClick={() => setShowCreateGroup(true)}
              title="Create group"
              aria-label="Create group"
              className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-accent"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          {filteredGroups.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">
              {groups.length === 0 ? "No groups yet." : "No groups found."}
            </p>
          )}
          {filteredGroups.map((g) => {
            const active = selectedGroup?.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroup(g);
                  setSelectedUser(null);
                }}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-accent text-accent-fg" : "text-ink hover:bg-surface-2"
                  }`}
              >
                <Avatar name={g.name} seed={`group-${g.id}`} size="sm" square />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{g.name}</span>
                  <span
                    className={`block truncate text-xs ${active ? "text-accent-fg/70" : "text-muted"}`}
                  >
                    Group
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {loadError && (
          <p className="flex items-start gap-2 border-t border-line px-4 py-2.5 text-xs text-danger">
            <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            {loadError}
          </p>
        )}
      </aside>

      {/* ============================ CHAT WINDOW ============================ */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedUser && !selectedGroup ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-soft text-accent">
              <ChatBubbleIcon className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">No conversation selected</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted">
              Pick someone from the sidebar to start chatting, or create a group.
            </p>
          </div>
        ) : (
          <>
            {/* header */}
            <header className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3">
              <Avatar
                name={headerTitle}
                seed={selectedGroup ? `group-${selectedGroup.id}` : selectedUser!.id}
                size="md"
                square={isGroupView}
                online={isGroupView ? undefined : !!onlineUsers[selectedUser!.id]}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-ink">{headerTitle}</h2>
                {isGroupView ? (
                  <p className="text-xs text-muted">Group conversation</p>
                ) : isTyping ? (
                  <p className="flex items-center gap-1 text-xs text-accent">
                    typing
                    <span className="dot-1 inline-block h-1 w-1 rounded-full bg-accent" />
                    <span className="dot-2 inline-block h-1 w-1 rounded-full bg-accent" />
                    <span className="dot-3 inline-block h-1 w-1 rounded-full bg-accent" />
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    {onlineUsers[selectedUser!.id] ? "Online" : "Offline"}
                  </p>
                )}
              </div>

              {!isGroupView && callState === "idle" && (
                <button
                  onClick={() => startCall(selectedUser!)}
                  className="flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
                >
                  <VideoIcon className="h-4 w-4" />
                  Call
                </button>
              )}
              {isGroupView && (
                <button
                  onClick={() => router.push(`/call/${selectedGroup!.id}`)}
                  className="flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
                >
                  <VideoIcon className="h-4 w-4" />
                  Join call
                </button>
              )}

            </header>

            {/* messages */}
            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
              {renderMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-ink">No messages yet</p>
                  <p className="mt-1 text-sm text-muted">Say hello to get things started.</p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-0.5">
                  {renderMessages.map((m, i) => {
                    const prev = renderMessages[i - 1];
                    const isMine = m.senderId === currentUser?.id;
                    const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                    const startsRun = !prev || prev.senderId !== m.senderId || newDay;

                    return (
                      <div key={m.key}>
                        {newDay && (
                          <div className="my-4 flex items-center gap-3">
                            <span className="h-px flex-1 bg-line" />
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                              {dayLabel(m.createdAt)}
                            </span>
                            <span className="h-px flex-1 bg-line" />
                          </div>
                        )}

                        <div
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} ${startsRun ? "mt-2.5" : "mt-0.5"
                            }`}
                        >
                          {!isMine && isGroupView && (
                            <span className={startsRun ? "" : "invisible"}>
                              <Avatar name={nameOf(m.senderId)} seed={m.senderId} size="sm" />
                            </span>
                          )}

                          <div
                            className={`flex max-w-[min(75%,34rem)] flex-col ${isMine ? "items-end" : "items-start"
                              }`}
                          >
                            {startsRun && !isMine && isGroupView && (
                              <span className="mb-1 px-1 text-xs font-medium text-muted">
                                {nameOf(m.senderId)}
                              </span>
                            )}
                            <div
                              className={`animate-rise group relative px-3.5 py-2 text-sm leading-relaxed ${isMine
                                ? "bg-accent text-accent-fg"
                                : "bg-bubble-in text-bubble-in-text"
                                } ${isMine
                                  ? `rounded-2xl ${startsRun ? "rounded-br-md" : "rounded-br-md rounded-tr-md"}`
                                  : `rounded-2xl ${startsRun ? "rounded-bl-md" : "rounded-bl-md rounded-tl-md"}`
                                }`}
                            >
                              <span className="whitespace-pre-wrap break-words">{m.content}</span>
                              <span
                                className={`mt-1 block text-right text-[10px] tabular-nums ${isMine ? "text-accent-fg/60" : "text-muted"
                                  }`}
                              >
                                {timeOf(m.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* composer */}
            <div className="border-t border-line bg-surface px-5 py-3.5">
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (!isGroupView) handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={
                    isGroupView ? `Message ${selectedGroup!.name}` : `Message ${selectedUser!.username}`
                  }
                  className="scroll-thin max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                />
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
                >
                  <SendIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
              <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-muted">
                Enter to send &middot; Shift + Enter for a new line
              </p>
            </div>
          </>
        )}
      </main>

      {/* ========================== INCOMING CALL ========================== */}
      {incomingCall && callState === "ringing" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm animate-fade">
          <div className="animate-pop w-[20rem] rounded-2xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-lg)]">
            <div className="mx-auto w-fit rounded-full animate-ring">
              <Avatar
                name={caller?.username ?? nameOf(incomingCall.from)}
                seed={incomingCall.from}
                size="xl"
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink">
              {caller?.username ?? nameOf(incomingCall.from)}
            </h3>
            <p className="mt-1 text-sm text-muted">Incoming video call</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={rejectCall}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white transition hover:bg-danger-hover"
                aria-label="Reject call"
                title="Reject"
              >
                <PhoneOffIcon />
              </button>
              <button
                onClick={acceptCall}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-online text-white transition hover:brightness-110"
                aria-label="Accept call"
                title="Accept"
              >
                <PhoneIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================ CALL STAGE ============================ */}
      {(callState === "calling" || callState === "in-call") && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0d14] animate-fade">
          <div className="flex items-center justify-between px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <Avatar name={peer?.username ?? "Peer"} seed={callPeerId ?? "peer"} size="sm" />
              <div>
                <p className="text-sm font-semibold">{peer?.username ?? "Connecting..."}</p>
                <p className="text-xs text-white/50">
                  {callState === "calling" ? "Calling..." : callDuration(callSeconds)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full bg-black object-cover"
            />

            {callState === "calling" && (
              <div className="absolute inset-0 grid place-items-center bg-[#0a0d14]">
                <div className="text-center">
                  <div className="mx-auto w-fit rounded-full animate-ring">
                    <Avatar name={peer?.username ?? "?"} seed={callPeerId ?? "peer"} size="xl" />
                  </div>
                  <p className="mt-5 text-lg font-medium text-white">{peer?.username}</p>
                  <p className="mt-1 text-sm text-white/50">Ringing...</p>
                </div>
              </div>
            )}

            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 h-32 w-24 rounded-xl border border-white/15 bg-black object-cover shadow-lg sm:h-40 sm:w-56"
            />
          </div>

          <div className="flex items-center justify-center gap-3 py-6">
            <button
              onClick={toggleMic}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              className={`grid h-12 w-12 place-items-center rounded-full transition ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-[#0a0d14]"
                }`}
            >
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </button>
            <button
              onClick={toggleCam}
              title={camOn ? "Turn camera off" : "Turn camera on"}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              className={`grid h-12 w-12 place-items-center rounded-full transition ${camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-[#0a0d14]"
                }`}
            >
              {camOn ? <VideoIcon /> : <VideoOffIcon />}
            </button>
            <button
              onClick={endCall}
              title="End call"
              aria-label="End call"
              className="grid h-12 w-16 place-items-center rounded-full bg-danger text-white transition hover:bg-danger-hover"
            >
              <PhoneOffIcon />
            </button>
          </div>
        </div>
      )}

      {/* ========================== CREATE GROUP =========================== */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm animate-fade"
          onClick={() => setShowCreateGroup(false)}
        >
          <div
            className="animate-pop w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-ink">Create a group</h3>
            <p className="mt-1 text-sm text-muted">Pick a name and who should be in it.</p>

            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              autoFocus
              className="mt-5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
            />

            <p className="mb-2 mt-4 text-xs font-medium text-muted">
              Members {selectedMemberIds.length > 0 && `(${selectedMemberIds.length} selected)`}
            </p>
            <div className="scroll-thin max-h-52 overflow-y-auto rounded-xl border border-line p-1">
              {otherUsers.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted">
                  Nobody else has signed up yet.
                </p>
              )}
              {otherUsers.map((u) => {
                const checked = selectedMemberIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition ${checked ? "bg-accent-soft" : "hover:bg-surface-2"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMemberSelection(u.id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <Avatar name={u.username} seed={u.id} size="sm" />
                    <span className="truncate text-sm text-ink">{u.username}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || selectedMemberIds.length === 0 || creatingGroup}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
              >
                {creatingGroup ? "Creating..." : "Create group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h3 className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
      {icon}
      {label}
    </h3>
  );
}
