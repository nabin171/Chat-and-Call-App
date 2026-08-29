"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { rtcConfig } from "@/lib/webrtc";

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


export default function ChatPage() {
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [callState, setCallState] = useState<"idle" | "calling" | "ringing" | "in-call">("idle");
const [incomingCall, setIncomingCall] = useState<{ from: number; offer: RTCSessionDescriptionInit } | null>(null);
const localStreamRef = useRef<MediaStream | null>(null);
const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
const [groups, setGroups] = useState<Group[]>([]);
const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
const [showCreateGroup, setShowCreateGroup] = useState(false);
const [newGroupName, setNewGroupName] = useState("");
const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  // Load current user + all users to pick from
  useEffect(() => {
    api.get("/users/me").then((res) => setCurrentUser(res.data));
    api.get("/users/").then((res) => setUsers(res.data));
      api.get("/groups/").then((res) => setGroups(res.data));
  }, []);



  // Open the WebSocket connection once we know who we are
  useEffect(() => {
    if (!currentUser) return;

    const token = localStorage.getItem("token");
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${token}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = async(event) => {
      const data = JSON.parse(event.data);

      if (data.type === "group_message") {
        setGroupMessages((prev) => [...prev, data]);
        return;
      }
      if (data.type === "typing") {
        if (data.sender_id === selectedUser?.id) {
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
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
        return;
      }
         if (data.type === "call-end" || data.type === "call-reject") {
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setCallState("idle");
        setIncomingCall(null);
        return;
      }

      setMessages((prev) => [...prev, data]);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, [currentUser, selectedUser]);

  // Load conversation history when a user is selected
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

  // Poll online status for all users
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

  useEffect(() => {
  if (!selectedGroup) return;

  api.get(`/groups/${selectedGroup.id}/messages`).then((res) => {
    setGroupMessages(res.data.map((m: any) => ({ ...m, type: "group_message" })));
  });
}, [selectedGroup]);

  const handleTyping = () => {
    if (!selectedUser || !wsRef.current) return;

    wsRef.current.send(
      JSON.stringify({
        type: "typing",
        receiver_id: selectedUser.id,
      })
    );
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedUser || !wsRef.current) return;

    wsRef.current.send(
      JSON.stringify({
        receiver_id: selectedUser.id,
        content: input,
      })
    );
    setInput("");
  };

  const sendGroupMessage = () => {
  if (!input.trim() || !selectedGroup || !wsRef.current) return;

  wsRef.current.send(
    JSON.stringify({
      type: "group_message",
      group_id: selectedGroup.id,
      content: input,
    })
  );
  setInput("");
};

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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    peerConnectionRef.current = pc;
    return pc;
  };


const createGroup = async () => {
  if (!newGroupName.trim() || selectedMemberIds.length === 0) return;

  const res = await api.post("/groups/", {
    name: newGroupName,
    member_ids: selectedMemberIds,
  });

  setGroups((prev) => [...prev, res.data]);
  setNewGroupName("");
  setSelectedMemberIds([]);
  setShowCreateGroup(false);
};

const toggleMemberSelection = (userId: number) => {
  setSelectedMemberIds((prev) =>
    prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
  );
};

  const startCall = async (targetUser: User) => {
    setCallState("calling");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true  });
    localStreamRef.current = stream;

     if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = createPeerConnection(targetUser.id);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsRef.current?.send(
      JSON.stringify({
        type: "call-offer",
        receiver_id: targetUser.id,
        offer,
      })
    );
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    setCallState("in-call");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true ,video:true});
    localStreamRef.current = stream;

       if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = createPeerConnection(incomingCall.from);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current?.send(
      JSON.stringify({
        type: "call-answer",
        receiver_id: incomingCall.from,
        answer,
      })
    );

    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    wsRef.current?.send(
      JSON.stringify({ type: "call-reject", receiver_id: incomingCall.from })
    );
    setIncomingCall(null);
    setCallState("idle");
  };

  const endCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setCallState("idle");

    if (selectedUser) {
      wsRef.current?.send(
        JSON.stringify({ type: "call-end", receiver_id: selectedUser.id })
      );
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const conversation = messages.filter(
    (m) =>
      selectedUser &&
      ((m.sender_id === currentUser?.id && m.receiver_id === selectedUser.id) ||
        (m.sender_id === selectedUser.id && m.receiver_id === currentUser?.id))
  );
  return (
    <div className="flex h-screen w-full bg-white">
      {/* Incoming call banner */}
      {incomingCall && callState === "ringing" && (
        <div className="fixed top-4 right-4 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50">
          <p className="font-medium mb-2">Incoming call...</p>
          <div className="flex gap-2">
            <button
              onClick={acceptCall}
              className="bg-green-600 text-white text-sm px-4 py-2 rounded-full"
            >
              Accept
            </button>
            <button
              onClick={rejectCall}
              className="bg-red-600 text-white text-sm px-4 py-2 rounded-full"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="font-semibold mb-4">Create Group</h3>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
            />
            <p className="text-xs text-gray-500 mb-2">Select members:</p>
            <div className="max-h-40 overflow-y-auto mb-4">
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(u.id)}
                      onChange={() => toggleMemberSelection(u.id)}
                    />
                    {u.username}
                  </label>
                ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createGroup}
                className="flex-1 bg-black text-white text-sm rounded px-3 py-2"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 border border-gray-300 text-sm rounded px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm font-medium">
            {connected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-500">● Disconnected</span>
            )}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
            Users
          </h2>
          {users
            .filter((u) => u.id !== currentUser?.id)
            .map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setSelectedGroup(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${
                  selectedUser?.id === u.id
                    ? "bg-black text-white"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    onlineUsers[u.id] ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                {u.username}
              </div>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2 border-t border-gray-200">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase">Groups</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-xs bg-black text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              +
            </button>
          </div>
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => {
                setSelectedGroup(g);
                setSelectedUser(null);
              }}
              className={`px-3 py-2 rounded-lg cursor-pointer text-sm mb-1 transition-colors ${
                selectedGroup?.id === g.id
                  ? "bg-black text-white"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              # {g.name}
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {!selectedUser && !selectedGroup ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a user or group to start chatting
          </div>
        ) : selectedGroup ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900"># {selectedGroup.name}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {groupMessages.filter((m) => m.group_id === selectedGroup.id).length === 0 && (
                <p className="text-gray-400 text-sm text-center mt-8">
                  No messages yet — say hi!
                </p>
              )}
              {groupMessages
                .filter((m) => m.group_id === selectedGroup.id)
                .map((m, i) => {
                  const isMine = m.sender_id === currentUser?.id;
                  const senderName = users.find((u) => u.id === m.sender_id)?.username || "Unknown";
                  return (
                    <div key={i} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {!isMine && <span className="text-xs text-gray-400 mb-1">{senderName}</span>}
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                          isMine
                            ? "bg-black text-white rounded-br-sm"
                            : "bg-gray-100 text-black rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendGroupMessage()}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Message the group..."
              />
              <button
                onClick={sendGroupMessage}
                className="bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-gray-800"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedUser!.username}</h2>
                {isTyping && <p className="text-xs text-gray-400">typing...</p>}
              </div>

              {callState === "idle" && (
                <button
                  onClick={() => startCall(selectedUser!)}
                  className="bg-green-600 text-white text-sm px-4 py-2 rounded-full"
                >
                  📞 Call
                </button>
              )}
              {callState === "calling" && (
                <span className="text-sm text-gray-500">Calling...</span>
              )}
              {callState === "in-call" && (
                <button
                  onClick={endCall}
                  className="bg-red-600 text-white text-sm px-4 py-2 rounded-full"
                >
                  End Call
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {conversation.length === 0 && (
                <p className="text-gray-400 text-sm text-center mt-8">
                  No messages yet — say hi!
                </p>
              )}
              {conversation.map((m, i) => {
                const isMine = m.sender_id === currentUser?.id;
                return (
                  <div
                    key={i}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        isMine
                          ? "bg-black text-white rounded-br-sm"
                          : "bg-gray-100 text-black rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-gray-800"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>

      {callState === "in-call" && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-40">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-64 h-48 bg-black rounded-lg object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-32 h-24 bg-black rounded-lg object-cover self-end"
          />
        </div>
      )}
    </div>
  );
}