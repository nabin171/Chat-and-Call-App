"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

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

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Record<number, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load current user + all users to pick from
  useEffect(() => {
    api.get("/users/me").then((res) => setCurrentUser(res.data));
    api.get("/users/").then((res) => setUsers(res.data));
  }, []);

  // Open the WebSocket connection once we know who we are
  useEffect(() => {
    if (!currentUser) return;

    const token = localStorage.getItem("token");
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${token}`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "typing") {
        if (data.sender_id === selectedUser?.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
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

  const conversation = messages.filter(
    (m) =>
      selectedUser &&
      ((m.sender_id === currentUser?.id && m.receiver_id === selectedUser.id) ||
        (m.sender_id === selectedUser.id && m.receiver_id === currentUser?.id))
  );

  return (
    <div className="flex h-screen w-full bg-white">
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
                onClick={() => setSelectedUser(u)}
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
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a user to start chatting
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{selectedUser.username}</h2>
              {isTyping && <p className="text-xs text-gray-400">typing...</p>}
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
    </div>
  );
}