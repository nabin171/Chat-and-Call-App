"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users/me")
      .then((res) => setUser(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Not logged in"));
  }, []);

  if (error) return <p className="p-8">{error}</p>;
  if (!user) return <p className="p-8">Loading...</p>;

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Your Profile</h1>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}