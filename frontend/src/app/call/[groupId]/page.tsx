
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "@/lib/api";

type CallConfig = { token: string; url: string; room: string };

export default function GroupCallPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = use(params);
    const router = useRouter();
    const [cfg, setCfg] = useState<CallConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api
            .get<CallConfig>(`/livekit/token/${groupId}`)
            .then((res) => setCfg(res.data))
            .catch((err) =>
                setError(err.response?.data?.detail ?? "Could not join this call")
            );
    }, [groupId]);

    if (error) return <div className="p-6 text-red-400">{error}</div>;
    if (!cfg) return <div className="p-6 text-gray-300">Joining call…</div>;

    return (
        <div className="h-screen w-screen bg-black">
            <LiveKitRoom
                token={cfg.token}
                serverUrl={cfg.url}
                connect
                video
                audio
                onDisconnected={() => router.push("/chat")}
                style={{ height: "100%" }}
            >
                <VideoConference />
            </LiveKitRoom>
        </div>
    );
}
