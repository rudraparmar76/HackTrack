"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Settings,
  Loader2,
  Github,
  Linkedin,
  Twitter,
  Globe,
  Check,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "profile">("account");

  // Account fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Profile fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [originalUsername, setOriginalUsername] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      try {
        const res = await fetch(`${apiUrl}/api/profile/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setName(profile.name || "");
          setAvatarUrl(profile.avatar_url || "");
          setUsername(profile.username || "");
          setOriginalUsername(profile.username || "");
          setDisplayName(profile.display_name || "");
          setBio(profile.bio || "");
          setGithubUrl(profile.github_url || "");
          setLinkedinUrl(profile.linkedin_url || "");
          setTwitterUrl(profile.twitter_url || "");
          setIsPublic(profile.is_public !== false);
        }
      } catch {}
      setLoading(false);
    };
    getProfile();
  }, []);

  // Username availability check with debounce
  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameStatus("idle");
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setUsernameStatus("invalid");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(username) && username.length > 2) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/public/profile/${username}`);
        setUsernameStatus(res.status === 404 ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, originalUsername]);

  const handleSaveAccount = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name, avatar_url: avatarUrl }).eq("id", user.id);
    await supabase.auth.updateUser({ data: { name, full_name: name, avatar_url: avatarUrl } });
    toast({ title: "Account updated" });
    setSaving(false);
  };

  const handleSaveProfile = async () => {
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      toast({ title: "Fix username issues before saving", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio,
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          twitter_url: twitterUrl,
          is_public: isPublic,
        }),
      });

      if (res.ok) {
        setOriginalUsername(username);
        setUsernameStatus("idle");
        toast({ title: "Profile updated" });
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="dash-terminal mb-2">
          <span>$ vi CONFIG</span>
          <span className="cursor"></span>
        </div>
        <h1 className="dash-heading flex items-center gap-3">
          <Settings className="w-5 h-5 text-purple-400" /> Settings
        </h1>
        <p className="text-sm text-[#8888bb] mt-2 mono">Manage your account and public profile</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[#0a0520] p-1 rounded-xl border border-purple-500/15 w-fit">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "account"
              ? "bg-purple-500/10 text-purple-400"
              : "text-[#7A8099] hover:text-[#E8EAF0]"
          }`}
        >
          <User className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Account
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "profile"
              ? "bg-purple-500/10 text-purple-400"
              : "text-[#7A8099] hover:text-[#E8EAF0]"
          }`}
        >
          <Globe className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Public Profile
        </button>
      </div>

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="hack-card dash-card-glow rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-purple-500/10 text-purple-400 text-xl font-bold">
                {(name || email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-[#E8EAF0]">{name || "User"}</p>
              <p className="text-sm text-[#7A8099] font-mono">{email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="opacity-50 font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <Button onClick={handleSaveAccount} disabled={saving} style={{ background: "var(--purple-primary)", color: "white" }} className="gap-2 font-mono text-xs hover:opacity-90 transition-opacity shadow-none">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
            
          </Button>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-5">
          {/* Visibility Toggle */}
          <div className="hack-card rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <div className="w-9 h-9 rounded-lg bg-[rgba(123,47,255,0.1)] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[var(--purple-primary)]" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-[#454D66]/20 flex items-center justify-center">
                  <EyeOff className="w-4 h-4 text-[#454D66]" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[#E8EAF0]">
                  Public Profile {isPublic ? "Enabled" : "Disabled"}
                </p>
                <p className="text-xs text-[#7A8099]">
                  {isPublic
                    ? "Anyone can view your profile and hackathon history"
                    : "Your profile is hidden from public view"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                isPublic ? "bg-[var(--purple-primary)]" : "bg-[#1E2330]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Profile Fields */}
          <div className="hack-card rounded-xl p-6 space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Username
                {usernameStatus === "checking" && (
                  <Loader2 className="w-3 h-3 animate-spin text-[#7A8099]" />
                )}
                {usernameStatus === "available" && (
                  <span className="flex items-center gap-1 text-xs text-[var(--purple-primary)]">
                    <Check className="w-3 h-3" /> Available
                  </span>
                )}
                {usernameStatus === "taken" && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <X className="w-3 h-3" /> Taken
                  </span>
                )}
                {usernameStatus === "invalid" && (
                  <span className="flex items-center gap-1 text-xs text-[#EF9F27]">
                    <X className="w-3 h-3" /> Invalid
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-[#454D66]">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="pl-7 font-mono"
                  placeholder="your-username"
                  maxLength={30}
                />
              </div>
              <p className="text-[11px] text-[#454D66]">
                hack-track.tech/u/{username || "..."}
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                Bio
                <span className={`text-[11px] font-mono ${bio.length > 200 ? "text-red-400" : "text-[#454D66]"}`}>
                  {bio.length}/200
                </span>
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="Builder, hacker, coffee enthusiast..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="hack-card rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-[#7A8099] uppercase tracking-wider flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5" /> Social Links
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </Label>
                <Input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </Label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Twitter className="w-3.5 h-3.5" /> Twitter / X
                </Label>
                <Input
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                  placeholder="https://twitter.com/username"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveProfile} disabled={saving || usernameStatus === "taken" || usernameStatus === "invalid"} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Profile
            </Button>
            {username && isPublic && (
              <a
                href={`/u/${username}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm text-[#7A8099] hover:text-[var(--purple-primary)] transition-colors"
              >
                View Public Profile <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
