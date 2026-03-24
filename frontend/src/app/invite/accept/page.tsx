"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type InvitePayload = {
  id: string;
  email: string;
  role: string;
  status: string;
  is_expired: boolean;
  expires_at: string | null;
  hackathon_id: string;
  hackathon_name: string;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token") || "";
    setToken(nextToken);
  }, []);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/team-invites/${token}`);
        const data = await res.json();
        if (!res.ok) {
          toast({
            title: "Invalid invite",
            description: data.error || "Invite not found.",
            variant: "destructive",
          });
        } else {
          setInvite(data);
        }
      } catch {
        toast({
          title: "Failed to load invite",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token, toast]);

  const acceptInvite = async () => {
    if (!token || !invite) return;
    setAccepting(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      const nextPath = encodeURIComponent(`/invite/accept?token=${token}`);
      router.push(`/login?next=${nextPath}`);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      setAccepting(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/team-invites/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Could not accept invite",
          description: data.error || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Invite accepted", description: "You now have access to this hackathon." });
      router.push(`/hackathon/${data.hackathon_id || invite.hackathon_id}`);
    } catch {
      toast({ title: "Could not accept invite", description: "Please try again.", variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <div className="max-w-xl mx-auto py-20 text-center text-[#7A8099]">Loading invite...</div>;
  }

  if (!token || !invite) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Invite not available</h1>
        <p className="text-[#7A8099]">This invite link is invalid or has expired.</p>
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-20">
      <div className="hack-card rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-bold text-[#E8EAF0]">Team Invite</h1>
        <p className="text-[#7A8099]">
          You are invited to join <span className="text-[#E8EAF0] font-medium">{invite.hackathon_name}</span> as <span className="text-[#E8EAF0] font-medium">{invite.role || "Member"}</span>.
        </p>
        <p className="text-sm text-[#7A8099]">Invited email: {invite.email}</p>
        {invite.is_expired || invite.status !== "pending" ? (
          <p className="text-sm text-red-400">This invite is no longer active.</p>
        ) : (
          <Button onClick={acceptInvite} disabled={accepting} className="w-full">
            {accepting ? "Accepting..." : "Accept Invite"}
          </Button>
        )}
      </div>
    </div>
  );
}
