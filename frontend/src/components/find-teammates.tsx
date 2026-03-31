"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  MessageCircle,
  Trash2,
  Pencil,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ──────────────────────────────────────────────────────────────
const PRESET_SKILLS = [
  "React", "Next.js", "Vue", "Angular", "Svelte",
  "Node.js", "Express", "Python", "Django", "Flask", "FastAPI",
  "Java", "Go", "Rust", "C++",
  "TypeScript", "JavaScript",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
  "Flutter", "React Native", "Swift", "Kotlin",
  "UI/UX Design", "Figma", "Graphic Design",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes",
  "PostgreSQL", "MongoDB", "Firebase", "Supabase",
  "Solidity", "Web3", "Blockchain",
  "Data Science", "Data Engineering",
  "DevOps", "CI/CD",
];

const PRESET_ROLES = [
  "Frontend Dev", "Backend Dev", "Full Stack Dev",
  "ML Engineer", "Data Scientist", "AI/ML",
  "Designer", "UI/UX Designer",
  "Mobile Dev", "iOS Dev", "Android Dev",
  "DevOps Engineer", "Cloud Engineer",
  "Project Manager", "Presenter",
  "Blockchain Dev", "Smart Contract Dev",
  "Data Engineer", "QA/Tester",
];

interface LftPost {
  id: string;
  hackathon_id: string;
  user_id: string;
  skills: string[];
  looking_for: string[];
  message: string;
  discord_handle: string | null;
  twitter_handle: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_name: string;
  avatar_url: string | null;
  is_own: boolean;
}

interface FindTeammatesProps {
  hackathonId: string;
}

// ─── Tag Input Component ────────────────────────────────────────────────────
function TagInput({
  value,
  onChange,
  presets,
  placeholder,
  color = "teal",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  presets: string[];
  placeholder: string;
  color?: "teal" | "purple";
}) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      presets.filter(
        (p) =>
          p.toLowerCase().includes(input.toLowerCase()) &&
          !value.includes(p)
      ),
    [presets, input, value]
  );

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !value.includes(t)) {
      onChange([...value, t]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pillColor =
    color === "teal"
      ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20"
      : "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20";

  const pillHover =
    color === "teal"
      ? "hover:bg-[#00D4FF]/20"
      : "hover:bg-[#A855F7]/20";

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${pillColor}`}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === "Backspace" && !input && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
          placeholder={placeholder}
          className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono pr-8 text-[#E8EAF0] placeholder:text-[#454D66]"
        />
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#454D66]" />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-xl border border-[rgba(123,47,255,0.3)] bg-[#0a0520] shadow-xl shadow-black/50"
          >
            {filtered.slice(0, 15).map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  addTag(opt);
                  setShowDropdown(false);
                }}
                className={`w-full font-mono text-left px-3 py-2 text-xs text-[#E8EAF0] ${pillHover} focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)] transition-colors`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Time Ago ───────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// ─── Post Card ──────────────────────────────────────────────────────────────
function LftPostCard({
  post,
  onEdit,
  onDelete,
}: {
  post: LftPost;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.25 }}
      className={`hack-card dash-card-glow rounded-xl p-5 border transition-all ${
        post.is_own 
        ? "border-[rgba(123,47,255,0.35)] bg-[rgba(123,47,255,0.05)] shadow-[0_0_8px_rgba(123,47,255,0.18)]" 
        : "border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)] hover:border-[var(--cyan-accent)] hover:shadow-[0_0_10px_rgba(0,212,255,0.1)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center text-sm font-bold text-[var(--cyan-accent)] shrink-0 border border-[rgba(0,212,255,0.2)] shadow-[0_0_8px_rgba(0,212,255,0.1)] pixel">
            {post.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--cyan-accent)] truncate">
              {post.display_name}
              {post.is_own && (
                <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(123,47,255,0.15)] text-[var(--purple-primary)] border border-[rgba(123,47,255,0.3)]">
                  You
                </span>
              )}
            </p>
            <p className="text-[11px] text-[#454D66] font-mono">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.is_own && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-[#454D66] hover:text-[var(--purple-primary)] hover:bg-[rgba(123,47,255,0.1)] transition-all"
              title="Edit post"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 rounded-lg text-[#454D66] hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Remove post"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      <p className="text-sm text-[#C0C5D4] leading-relaxed mb-4">{post.message}</p>

      {/* Skills */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-[#454D66] font-semibold mb-1.5">My Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {post.skills.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/15"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Looking for */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-[#454D66] font-semibold mb-1.5">Looking For</p>
        <div className="flex flex-wrap gap-1.5">
          {post.looking_for.map((r) => (
            <span
              key={r}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/15"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Contact */}
      {(post.discord_handle || post.twitter_handle) && (
        <div className="flex items-center gap-2 pt-3 border-t border-[#1E2330]">
          {post.discord_handle && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/15 hover:bg-[#5865F2]/20 transition-colors cursor-default">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              {post.discord_handle}
            </span>
          )}
          {post.twitter_handle && (
            <a
              href={`https://twitter.com/${post.twitter_handle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/15 hover:bg-[#1DA1F2]/20 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @{post.twitter_handle.replace("@", "")}
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function FindTeammates({ hackathonId }: FindTeammatesProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [posts, setPosts] = useState<LftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSkill, setFilterSkill] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [formLookingFor, setFormLookingFor] = useState<string[]>([]);
  const [formMessage, setFormMessage] = useState("");
  const [formDiscord, setFormDiscord] = useState("");
  const [formTwitter, setFormTwitter] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, [supabase]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/lft`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [apiUrl, hackathonId, getToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Check if user already has a post
  const ownPost = useMemo(() => posts.find((p) => p.is_own), [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (!filterSkill.trim()) return posts;
    const q = filterSkill.toLowerCase();
    return posts.filter(
      (p) =>
        p.skills.some((s) => s.toLowerCase().includes(q)) ||
        p.looking_for.some((r) => r.toLowerCase().includes(q))
    );
  }, [posts, filterSkill]);

  // Open form for editing
  const startEdit = useCallback(() => {
    if (ownPost) {
      setFormSkills(ownPost.skills);
      setFormLookingFor(ownPost.looking_for);
      setFormMessage(ownPost.message);
      setFormDiscord(ownPost.discord_handle || "");
      setFormTwitter(ownPost.twitter_handle || "");
      setEditingPostId(ownPost.id);
    }
    setShowForm(true);
  }, [ownPost]);

  // Reset form
  const resetForm = () => {
    setFormSkills([]);
    setFormLookingFor([]);
    setFormMessage("");
    setFormDiscord("");
    setFormTwitter("");
    setEditingPostId(null);
    setShowForm(false);
  };

  // Submit (upsert)
  const handleSubmit = async () => {
    if (formSkills.length === 0) {
      toast({ title: "Add at least one skill", variant: "destructive" });
      return;
    }
    if (formLookingFor.length === 0) {
      toast({ title: "Add at least one role you're looking for", variant: "destructive" });
      return;
    }
    if (!formMessage.trim()) {
      toast({ title: "Write a short message", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const token = await getToken();
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/lft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skills: formSkills,
          looking_for: formLookingFor,
          message: formMessage.trim().slice(0, 300),
          discord_handle: formDiscord.trim() || null,
          twitter_handle: formTwitter.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: editingPostId ? "Post updated!" : "Post published!",
          description: "Your profile is now visible to other participants.",
        });
        resetForm();
        fetchPosts();
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete post
  const deletePost = async (postId: string) => {
    if (!confirm("Remove your LFT post? Others won't be able to see it anymore.")) return;
    const token = await getToken();
    try {
      const res = await fetch(`${apiUrl}/api/lft/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPosts((p) => p.filter((pp) => pp.id !== postId));
        toast({ title: "Post removed" });
        resetForm();
      }
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--purple-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="hack-card dash-card-glow rounded-xl p-5 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(123,47,255,0.1)] border border-[rgba(123,47,255,0.2)] shadow-[0_0_10px_rgba(123,47,255,0.1)]">
              <Users className="w-5 h-5 text-[var(--cyan-accent)]" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider mb-0.5 flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">//</span> Find Teammates
              </h3>
              <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                {posts.length} {posts.length === 1 ? "PERSON" : "PEOPLE"} LOOKING FOR TEAMMATES
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={ownPost ? startEdit : () => setShowForm(!showForm)}
            className={`gap-1.5 text-xs h-8 font-mono shrink-0 ${
              ownPost
                ? "bg-[rgba(123,47,255,0.12)] text-[var(--purple-primary)] hover:bg-[rgba(123,47,255,0.2)] border border-[rgba(123,47,255,0.3)] uppercase tracking-wider font-bold"
                : "bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black border border-transparent uppercase tracking-wider font-bold"
            }`}
          >
            {ownPost ? (
              <>
                <Pencil className="w-3 h-3" /> Edit Your Post
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" /> Post Your Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Post Form (collapsible) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="hack-card dash-card-glow rounded-xl p-5 space-y-4 border border-[rgba(123,47,255,0.4)] bg-[rgba(6,3,18,0.8)] shadow-lg shadow-black/50">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-[#E8EAF0] uppercase flex items-center gap-2 tracking-wider">
                  <span className="text-[var(--cyan-accent)]"><MessageCircle className="w-4 h-4" /></span>
                  {editingPostId ? "Edit Your Post" : "Post Your Profile"}
                </h4>
                <button
                  onClick={resetForm}
                  className="p-1 rounded-lg text-[#454D66] hover:text-[#E8EAF0] hover:bg-[rgba(123,47,255,0.1)] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Your Skills *</Label>
                <TagInput
                  value={formSkills}
                  onChange={setFormSkills}
                  presets={PRESET_SKILLS}
                  placeholder="// Search or type a skill, press Enter..."
                  color="teal"
                />
              </div>

              {/* Looking for */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Looking For *</Label>
                <TagInput
                  value={formLookingFor}
                  onChange={setFormLookingFor}
                  presets={PRESET_ROLES}
                  placeholder="// Search or type a role, press Enter..."
                  color="purple"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Message *</Label>
                  <span
                    className={`text-[10px] font-mono ${
                      formMessage.length > 280
                        ? "text-red-400"
                        : formMessage.length > 200
                        ? "text-[#EF9F27]"
                        : "text-[#454D66]"
                    }`}
                  >
                    {formMessage.length}/300
                  </span>
                </div>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value.slice(0, 300))}
                  placeholder="// Tell others about yourself and what you're looking for..."
                  className="w-full bg-[#0F1117] border border-[rgba(123,47,255,0.2)] rounded-xl px-3 py-2.5 text-sm font-mono text-[#E8EAF0] placeholder:text-[#454D66] focus:outline-none focus:ring-1 focus:ring-[var(--cyan-accent)] min-h-[80px] resize-none transition-all selection:bg-[var(--cyan-accent)] selection:text-black"
                  maxLength={300}
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Discord Handle</Label>
                  <Input
                    value={formDiscord}
                    onChange={(e) => setFormDiscord(e.target.value)}
                    placeholder="username#0000"
                    className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Twitter/X Handle</Label>
                  <Input
                    value={formTwitter}
                    onChange={(e) => setFormTwitter(e.target.value)}
                    placeholder="@username"
                    className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gap-2 font-mono text-xs bg-[var(--cyan-accent)] text-black hover:bg-[var(--cyan-accent)]/80 font-bold uppercase tracking-wider disabled:opacity-50 border border-transparent"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {editingPostId ? "Update Post" : "Publish Post"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search / Filter */}
      {posts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#454D66]" />
          <Input
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            placeholder="// Filter by skill or role..."
            className="pl-9 bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono h-10 text-[#E8EAF0] placeholder:text-[#454D66]"
          />
          {filterSkill && (
            <button
              onClick={() => setFilterSkill("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454D66] hover:text-[#E8EAF0] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredPosts.map((post) => (
            <LftPostCard
              key={post.id}
              post={post}
              onEdit={startEdit}
              onDelete={deletePost}
            />
          ))}
        </AnimatePresence>

        {/* Filter no results */}
        {filterSkill && filteredPosts.length === 0 && posts.length > 0 && (
          <div className="text-center py-10">
            <Search className="w-10 h-10 text-[#1E2330] mx-auto mb-3" />
            <p className="text-sm text-[#7A8099]">No results for &quot;{filterSkill}&quot;</p>
            <p className="text-xs text-[#454D66] mt-1">Try a different skill or role name</p>
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-14">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(123,47,255,0.1)] flex items-center justify-center border border-[rgba(123,47,255,0.2)] shadow-[0_0_15px_rgba(123,47,255,0.1)]">
              <Users className="w-8 h-8 text-[var(--cyan-accent)] opacity-80" />
            </div>
            <p className="text-sm text-[#E8EAF0] font-mono mb-1 uppercase tracking-wider font-bold">No one&apos;s looking for teammates yet</p>
            <p className="text-xs text-[#454D66] font-mono mb-4 uppercase">// Be the first to post your profile!</p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="gap-1.5 font-mono text-xs bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold uppercase tracking-wider border border-transparent"
            >
              <Plus className="w-3 h-3" /> Post Your Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
