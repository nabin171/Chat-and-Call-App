"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      if (mode === "register") {
        const res = await api.post("/users/register", { email, username, password });
        setMessage(`Registered! Welcome ${res.data.username}`);
      } else {
        const res = await api.post("/users/login", { email, password });
        localStorage.setItem("token", res.data.access_token);
        setMessage("Logged in! Token saved.");
      }
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-2xl font-bold">{mode === "register" ? "Register" : "Login"}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />

        {mode === "register" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-2"
          required
        />

        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          {mode === "register" ? "Register" : "Login"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "register" ? "login" : "register")}
        className="text-sm underline"
      >
        {mode === "register" ? "Already have an account? Login" : "Need an account? Register"}
      </button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}