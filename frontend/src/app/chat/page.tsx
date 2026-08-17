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
      const data: ChatMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    wsRef.current = ws;

    return () => ws.close();
  }, [currentUser]);

  useEffect(() => {
  if (!selectedUser) return;

  api.get(`/messages/${selectedUser.id}`).then((res) => {
    setMessages((prev) => {
      // avoid duplicating messages already loaded from a previous selection
      const others = prev.filter(
        (m) => m.sender_id !== selectedUser.id && m.receiver_id !== selectedUser.id
      );
      return [...others, ...res.data];
    });
  });
}, [selectedUser]);

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
    <div className="flex h-screen">
      {/* Sidebar: list of users to chat with */}
      <div className="w-64 border-r p-4">
        <p className="text-sm mb-2">
          {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
        <h2 className="font-bold mb-2">Users</h2>
        {users
          .filter((u) => u.id !== currentUser?.id)
          .map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`p-2 rounded cursor-pointer ${
                selectedUser?.id === u.id ? "bg-gray-200" : ""
              }`}
            >
              {u.username}
            </div>
          ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col p-4">
        {!selectedUser ? (
          <p>Select a user to start chatting</p>
        ) : (
          <>
            <h2 className="font-bold mb-4">Chat with {selectedUser.username}</h2>
            <div className="flex-1 overflow-y-auto border rounded p-3 mb-3">
              {conversation.map((m, i) => {
                  const isMine = m.sender_id === currentUser?.id;
                  return (
                <div
                  key={i}
                className={`mb-2 ${
                      isMine ? "text-right" : "text-left"
                    }`}
                >
     <div
                      className={`inline-block max-w-xs px-4 py-2 rounded-2xl text-sm ${
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
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 border rounded px-3 py-2"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-black text-white rounded px-4 py-2"
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