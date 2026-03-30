"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import CountdownTimer from "@/components/countdown-timer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate, daysUntil, getStatusColor, getPlatformColor, getPriorityColor, getCountdownClass } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  Clock,
  ExternalLink,
  Trash2,
  Plus,
  GripVertical,
  FileText,
  Loader2,
  Edit,
  Pencil,
  Sparkles,
  RefreshCw,
  Save,
  Zap,
  Brain,
  Lightbulb,
  Play,
  Flag,
  ClipboardCheck,
  Send,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import SubmissionChecklist from "@/components/submission-checklist";
import FindTeammates from "@/components/find-teammates";
import { HackathonPipeline, PipelineStatus } from "@/components/hackathon-pipeline";

interface Hackathon {
  id: string; name: string; url: string | null; platform: string | null;
  banner_url: string | null; description: string | null;
  start_date: string | null; end_date: string | null;
  registration_deadline: string | null; submission_deadline: string | null;
  result_date: string | null; prize_pool: string | null;
  team_size_min: number | null; team_size_max: number | null;
  status: string; created_at: string; user_id: string;
}

interface TeamMember {
  id: string; name: string; email: string | null; role: string;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
}

interface Task {
  id: string; title: string; description: string | null;
  status: string; priority: string; due_date: string | null;
  assignee_id: string | null; position: number;
}

interface ProblemStatement {
  id: string; title: string; description: string | null; track: string | null;
}

interface Note {
  id: string; content: string; updated_at: string;
}

interface GeneratedIdea {
  title: string;
  tagline: string;
  track: string;
  tech_stack: string[];
  wow_factor: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  feasibility_hours: number;
}

interface IdeaGeneration {
  id: string;
  hackathon_id: string;
  user_id: string;
  ideas: GeneratedIdea[];
  created_at: string;
}

const KANBAN_COLUMNS = [
  { key: "idea", label: "💡 Idea" },
  { key: "design", label: "🎨 Design" },
  { key: "building", label: "🔨 Building" },
  { key: "testing", label: "🧪 Testing" },
  { key: "submitted", label: "🚀 Submitted" },
];

const ROLES = ["Leader", "Developer", "Designer", "ML Engineer", "Data Scientist", "DevOps", "Presenter"];

export default function HackathonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const hackathonId = params.id as string;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [note, setNote] = useState<Note | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // AI Ideas state
  const [aiIdeas, setAiIdeas] = useState<GeneratedIdea[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [ideasError, setIdeasError] = useState("");
  const [generationCount, setGenerationCount] = useState(0);
  const [savingIdeaIdx, setSavingIdeaIdx] = useState<number | null>(null);

  // Dialogs
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Developer");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStatus, setNewTaskStatus] = useState("idea");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Edit States
  const [showEditHackathon, setShowEditHackathon] = useState(false);
  const [editHackathonData, setEditHackathonData] = useState<Partial<Hackathon>>({});
  const [showEditMember, setShowEditMember] = useState(false);
  const [editMemberData, setEditMemberData] = useState<{id: string, name: string, role: string} | null>(null);
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [newProblemTitle, setNewProblemTitle] = useState("");
  const [newProblemTrack, setNewProblemTrack] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData.user;
    if (!currentUser) {
      router.push("/login");
      return;
    }

    const hackRes = await supabase.from("hackathons").select("*").eq("id", hackathonId).single();
    if (!hackRes.data) {
      setHackathon(null);
      setLoading(false);
      return;
    }

    const getDynamicStatus = (hack: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const getNormalizedTime = (dateStr: string | null) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const localD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return localD.getTime();
      };

      const start = getNormalizedTime(hack.start_date);
      const end = getNormalizedTime(hack.end_date) || getNormalizedTime(hack.submission_deadline);

      if (end !== null && todayTime > end) return "completed";
      if (start !== null && start > todayTime) return "upcoming";
      if (start === null && end === null) return hack.status;
      return "active";
    };

    const hackathonData = hackRes.data;
    hackathonData.status = getDynamicStatus(hackathonData);

    const ownerAccess = hackathonData.user_id === currentUser.id;
    let memberAccess = false;
    if (!ownerAccess && currentUser.email) {
      const membership = await supabase
        .from("team_members")
        .select("id")
        .eq("hackathon_id", hackathonId)
        .eq("email", currentUser.email.toLowerCase())
        .maybeSingle();
      memberAccess = Boolean(membership.data);
    }

    if (!ownerAccess && !memberAccess) {
      toast({ title: "Access denied", description: "You are not part of this hackathon team.", variant: "destructive" });
      router.push("/dashboard");
      return;
    }

    setIsOwner(ownerAccess);

    const [teamRes, taskRes, psRes, noteRes, inviteRes] = await Promise.all([
      supabase.from("team_members").select("*").eq("hackathon_id", hackathonId),
      supabase.from("tasks").select("*").eq("hackathon_id", hackathonId).order("position"),
      supabase.from("problem_statements").select("*").eq("hackathon_id", hackathonId),
      supabase.from("notes").select("*").eq("hackathon_id", hackathonId).limit(1),
      ownerAccess
        ? supabase.from("team_invites").select("id, email, role, status, created_at").eq("hackathon_id", hackathonId).eq("status", "pending")
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    setHackathon(hackathonData);
    setTeam(teamRes.data || []);
    setTasks(taskRes.data || []);
    setProblems(psRes.data || []);
    setInvites((inviteRes.data || []) as TeamInvite[]);
    if (noteRes.data && noteRes.data.length > 0) {
      setNote(noteRes.data[0]);
      setNoteContent(noteRes.data[0].content);
    }
    setLoading(false);
  }, [hackathonId, router, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (hackathonId) fetchIdeas(); }, [hackathonId]);

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!confirm("Delete this hackathon? This cannot be undone.")) return;
    await supabase.from("hackathons").delete().eq("id", hackathonId);
    toast({ title: "Deleted", description: "Hackathon has been removed." });
    router.push("/dashboard");
  };

  const addTeamMember = async () => {
    if (!isOwner) return;
    if (!newMemberName.trim()) return;
    const maxSize = hackathon?.team_size_max || 4;
    if (team.length >= maxSize) {
      toast({
        title: "Team is full",
        description: `Maximum team size is ${maxSize} members. Remove a member first.`,
        variant: "destructive",
      });
      return;
    }

    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    if (trimmedEmail) {
      // Prevent self-invite
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email && trimmedEmail === currentUser.email.toLowerCase()) {
        toast({
          title: "Cannot invite yourself",
          description: "You are already part of this team.",
          variant: "destructive",
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      if (!token) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }

      const response = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: trimmedEmail,
          name: newMemberName,
          role: newMemberRole,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: "Invite failed",
          description: payload.error || "Could not send team invite.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Invite sent", description: `Invite email sent to ${trimmedEmail}.` });
    } else {
      await supabase.from("team_members").insert({
        hackathon_id: hackathonId,
        name: newMemberName,
        email: null,
        role: newMemberRole,
      });
      toast({ title: "Member added" });
    }

    setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("Developer");
    setShowAddMember(false);
    fetchAll();
  };

  const removeMember = async (id: string) => {
    if (!isOwner) return;
    await supabase.from("team_members").delete().eq("id", id);
    fetchAll();
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    await supabase.from("tasks").insert({
      hackathon_id: hackathonId,
      title: newTaskTitle,
      status: newTaskStatus,
      priority: newTaskPriority,
      position: tasks.length,
    });
    setNewTaskTitle(""); setNewTaskPriority("medium"); setNewTaskStatus("idea");
    setShowAddTask(false);
    fetchAll();
    toast({ title: "Task added" });
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    fetchAll();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchAll();
  };

  const saveHackathonDetails = async () => {
    if (!isOwner) return;
    const { error } = await supabase.from("hackathons").update(editHackathonData).eq("id", hackathonId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setShowEditHackathon(false);
    fetchAll();
    toast({ title: "Hackathon updated" });
  };

  const saveMemberEdit = async () => {
    if (!isOwner || !editMemberData) return;
    const { error } = await supabase.from("team_members").update({ name: editMemberData.name, role: editMemberData.role }).eq("id", editMemberData.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setShowEditMember(false);
    fetchAll();
    toast({ title: "Member updated" });
  };

  const addProblemStatement = async () => {
    if (!isOwner || !newProblemTitle.trim()) return;
    const { error } = await supabase.from("problem_statements").insert({ hackathon_id: hackathonId, title: newProblemTitle, track: newProblemTrack });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewProblemTitle(""); setNewProblemTrack("");
    setShowAddProblem(false);
    fetchAll();
    toast({ title: "Problem statement added" });
  };

  const deleteProblemStatement = async (psId: string) => {
    if (!isOwner) return;
    await supabase.from("problem_statements").delete().eq("id", psId);
    fetchAll();
  };

  const saveNote = async () => {
    setSavingNote(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (note) {
      await supabase.from("notes").update({ content: noteContent, updated_at: new Date().toISOString() }).eq("id", note.id);
    } else {
      const { data } = await supabase.from("notes").insert({
        hackathon_id: hackathonId,
        user_id: user.id,
        content: noteContent,
      }).select().single();
      if (data) setNote(data);
    }
    setSavingNote(false);
    toast({ title: "Note saved" });
  };

  // AI Ideas
  const fetchIdeas = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/ideas`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setGenerationCount(data.length);
        if (data.length > 0 && data[0].ideas) {
          setAiIdeas(data[0].ideas);
        }
      }
    } catch {}
  };

  const generateIdeas = async () => {
    setGeneratingIdeas(true);
    setIdeasError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setGeneratingIdeas(false); return; }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/generate-ideas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setIdeasError(data.error || "Failed to generate ideas");
      } else {
        setAiIdeas(data.ideas || []);
        setGenerationCount(data.generation || generationCount + 1);
        toast({ title: "Ideas generated!", description: "AI has suggested 4 project ideas for you." });
      }
    } catch (err: any) {
      setIdeasError(err.message || "Failed to generate ideas");
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const saveIdeaToNotes = async (idea: GeneratedIdea, idx: number) => {
    setSavingIdeaIdx(idx);
    const ideaText = `\n\n--- AI Idea: ${idea.title} ---\n${idea.tagline}\nTrack: ${idea.track}\nTech: ${idea.tech_stack.join(", ")}\nWow Factor: ${idea.wow_factor}\nDifficulty: ${idea.difficulty} | ~${idea.feasibility_hours}h to build\n`;
    const newContent = (noteContent || "") + ideaText;
    setNoteContent(newContent);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingIdeaIdx(null); return; }
    if (note) {
      await supabase.from("notes").update({ content: newContent, updated_at: new Date().toISOString() }).eq("id", note.id);
    } else {
      const { data } = await supabase.from("notes").insert({
        hackathon_id: hackathonId, user_id: user.id, content: newContent,
      }).select().single();
      if (data) setNote(data);
    }
    setSavingIdeaIdx(null);
    toast({ title: "Idea saved to notes!", description: `"${idea.title}" added to your notes.` });
  };

  const updateHackathonStatus = async (statusData: { status: PipelineStatus; won?: boolean; placement?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    
    // Optimistic update
    setHackathon(prev => prev ? { ...prev, ...statusData } : null);

    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(statusData),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      const updated = await res.json();
      setHackathon(updated);
      toast({ title: "Status updated", description: `Hackathon marked as ${statusData.status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      fetchAll(); // Revert
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00FF87]" />
      </div>
    );
  }

  if (!hackathon) {
    return <div className="text-center py-20 text-[#7A8099]">Hackathon not found.</div>;
  }

  const daysLeft = daysUntil(hackathon.submission_deadline);
  const countdownClass = getCountdownClass(hackathon.submission_deadline);
  const taskProgress = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.status === "submitted").length / tasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <HackathonPipeline 
        currentStatus={hackathon.status as PipelineStatus} 
        onUpdate={updateHackathonStatus} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4 shrink-0 max-w-full">
          <Link href="/dashboard" className="p-2 rounded-lg bg-[rgba(123,47,255,0.05)] text-[var(--text-secondary)] hover:text-[#fff] hover:bg-[rgba(123,47,255,0.15)] mt-1 shrink-0 border border-[rgba(123,47,255,0.2)] transition-all shadow-[0_0_10px_rgba(123,47,255,0.05)] hover:shadow-[0_0_15px_rgba(123,47,255,0.2)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "16px", color: "white", textShadow: '0 0 20px rgba(123,47,255,0.35)' }} className="uppercase break-words line-clamp-2 leading-tight">
                {hackathon.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-sm font-mono text-[10px] uppercase font-bold border flex items-center gap-1.5 ${getStatusColor(hackathon.status)}`}>
                {hackathon.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] pulse-dot" />
                )}
                {hackathon.status}
              </span>
              {hackathon.platform && (
                <span className={`px-2.5 py-0.5 rounded-sm font-mono text-[10px] uppercase font-bold ${getPlatformColor(hackathon.platform)}`}>
                  {hackathon.platform}
                </span>
              )}
            </div>
            {hackathon.url && (
              <a href={hackathon.url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[var(--cyan-accent)] hover:text-[#00D4FF] hover:underline flex items-center gap-1 transition-colors">
                <span className="text-[var(--purple-primary)]">//</span> {hackathon.url.replace(/https?:\/\//, "").slice(0, 50)}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Dialog open={showEditHackathon} onOpenChange={setShowEditHackathon}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setEditHackathonData(hackathon)} className="gap-1 font-mono text-xs border-[rgba(123,47,255,0.3)] bg-[rgba(6,3,18,0.5)] hover:bg-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] text-[#E8EAF0] transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "12px", color: "var(--cyan-accent)" }}>EDIT HACKATHON</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 font-mono text-xs">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Name</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" value={editHackathonData.name || ""} onChange={(e) => setEditHackathonData({...editHackathonData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">URL</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" value={editHackathonData.url || ""} onChange={(e) => setEditHackathonData({...editHackathonData, url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Start Date</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="date" value={editHackathonData.start_date?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, start_date: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">End Date</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="date" value={editHackathonData.end_date?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, end_date: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Registration Deadline</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="date" value={editHackathonData.registration_deadline?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, registration_deadline: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Submission Deadline</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="date" value={editHackathonData.submission_deadline?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, submission_deadline: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Team Size Min</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="number" value={editHackathonData.team_size_min || 1} onChange={(e) => setEditHackathonData({...editHackathonData, team_size_min: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Team Size Max</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" type="number" value={editHackathonData.team_size_max || 4} onChange={(e) => setEditHackathonData({...editHackathonData, team_size_max: parseInt(e.target.value) || 4})} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Prize Pool</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-white" value={editHackathonData.prize_pool || ""} onChange={(e) => setEditHackathonData({...editHackathonData, prize_pool: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-wider">Description</Label>
                    <textarea 
                      className="w-full bg-[#0F1117] border border-[rgba(123,47,255,0.2)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--cyan-accent)] min-h-[100px] text-white"
                      value={editHackathonData.description || ""} 
                      onChange={(e) => setEditHackathonData({...editHackathonData, description: e.target.value})} 
                    />
                  </div>
                  <Button onClick={saveHackathonDetails} className="sm:col-span-2 w-full mt-2 bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold">SAVE CHANGES</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleDelete} className="font-mono text-xs text-red-400 border-red-500/20 bg-[rgba(6,3,18,0.5)] hover:bg-red-500/10 hover:border-red-500 gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Countdown Bar */}
      {daysLeft !== null && (
        <div className="hack-card dash-card-glow rounded-xl p-4 sm:p-5 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(123,47,255,0.1)] flex items-center justify-center shrink-0 border border-[rgba(123,47,255,0.2)] shadow-[0_0_10px_rgba(123,47,255,0.1)]">
            <Clock className="w-5 h-5 text-[var(--cyan-accent)]" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">Submission Deadline</p>
            <p className={`text-xl font-bold font-mono ${countdownClass}`}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? "Due today!" : "Deadline passed"}
            </p>
          </div>
          <div className="text-right text-[11px] text-[#7A8099] font-mono hidden sm:block pt-4">
            {formatDate(hackathon.submission_deadline)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="purple-tabs w-full">
        <div className="w-full overflow-x-auto pb-1 no-scrollbar">
          <TabsList className="bg-[rgba(6,3,18,0.8)] border border-[rgba(123,47,255,0.15)] flex w-max sm:w-auto h-auto min-h-11 font-mono text-xs shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <TabsTrigger value="overview" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Overview</TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Checklist</TabsTrigger>
            <TabsTrigger value="teammates" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Find Teammates</TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Team ({team.length})</TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Progress</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:text-[var(--cyan-accent)] data-[state=active]:bg-[rgba(0,229,255,0.05)] data-[state=active]:shadow-[inset_0_-2px_0_var(--cyan-accent)] rounded-none px-4 md:px-6">Notes</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Banner */}
          {hackathon.banner_url && (
            <div className="rounded-xl overflow-hidden h-48 border border-[rgba(123,47,255,0.2)] shadow-[0_0_20px_rgba(123,47,255,0.1)]">
              <img src={hackathon.banner_url} alt={hackathon.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Description */}
          {hackathon.description && (
            <div className="hack-card dash-card-glow rounded-xl p-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] shadow-[0_0_20px_rgba(123,47,255,0.03)]">
              <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-[var(--purple-primary)]">//</span> Description
              </h3>
              <p className="text-sm font-mono leading-relaxed text-[#E8EAF0] whitespace-pre-wrap">{hackathon.description}</p>
            </div>
          )}

          {/* Live Timeline */}
          <div className="hack-card dash-card-glow rounded-xl p-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] shadow-[0_0_20px_rgba(123,47,255,0.03)]">
            <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="text-[var(--purple-primary)]">//</span> Timeline
            </h3>
            <div className="space-y-2">
              {[
                { label: "Start Date", date: hackathon.start_date, Icon: Play },
                { label: "Registration Deadline", date: hackathon.registration_deadline, Icon: ClipboardCheck },
                { label: "End Date", date: hackathon.end_date, Icon: Flag },
                { label: "Submission Deadline", date: hackathon.submission_deadline, Icon: Send },
                { label: "Results", date: hackathon.result_date, Icon: Award },
              ]
                .filter((d) => d.date)
                .sort((a, b) => {
                  const aDiff = Math.abs(new Date(a.date!).getTime() - Date.now());
                  const bDiff = Math.abs(new Date(b.date!).getTime() - Date.now());
                  return aDiff - bDiff;
                })
                .map((d) => {
                  const isPast = new Date(d.date!).getTime() < Date.now();
                  return (
                    <div
                      key={d.label}
                      className={`flex items-center gap-3 bg-[rgba(6,3,18,0.3)] rounded-lg px-4 py-3 border border-[rgba(123,47,255,0.1)] transition-colors hover:border-[rgba(123,47,255,0.3)] ${isPast ? "opacity-50" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isPast ? "bg-[#1E2330] border-[#2A3045]" : "bg-[rgba(0,212,255,0.1)] border-[#00D4FF]/20 shadow-[0_0_8px_rgba(0,212,255,0.2)]"}`}>
                        <d.Icon className={`w-3.5 h-3.5 ${isPast ? "text-[#454D66]" : "text-[var(--cyan-accent)]"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-mono uppercase tracking-wider ${isPast ? "text-[#454D66] font-normal" : "text-[var(--text-secondary)] font-bold"}`}>{d.label}</p>
                        <p className={`text-sm font-medium font-mono ${isPast ? "text-[#454D66] line-through decoration-[#454D66]" : "text-[#E8EAF0]"}`}>{formatDate(d.date)}</p>
                      </div>
                      <CountdownTimer deadline={d.date} compact />
                    </div>
                  );
                })}
              {/* Show dates with no value */}
              {[
                { label: "Start Date", date: hackathon.start_date },
                { label: "Registration", date: hackathon.registration_deadline },
                { label: "End Date", date: hackathon.end_date },
                { label: "Submission", date: hackathon.submission_deadline },
                { label: "Results", date: hackathon.result_date },
              ].filter((d) => !d.date).length > 0 && (
                <p className="text-[10px] text-[#454D66] text-right font-mono pt-2">
                  {[
                    { label: "Start Date", date: hackathon.start_date },
                    { label: "Registration", date: hackathon.registration_deadline },
                    { label: "End Date", date: hackathon.end_date },
                    { label: "Submission", date: hackathon.submission_deadline },
                    { label: "Results", date: hackathon.result_date },
                  ].filter((d) => !d.date).map((d) => d.label).join(", ")} — TBD
                </p>
              )}
            </div>
          </div>

          {/* Prizes & Team Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {hackathon.prize_pool && (
              <div className="hack-card dash-card-glow rounded-xl p-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] shadow-[0_0_20px_rgba(123,47,255,0.03)]">
                <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-[var(--purple-primary)]">//</span> Prize Pool
                </h3>
                <p className="text-2xl font-bold font-mono text-[var(--gold)] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] mt-1">{hackathon.prize_pool}</p>
              </div>
            )}
            <div className="hack-card dash-card-glow rounded-xl p-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] shadow-[0_0_20px_rgba(123,47,255,0.03)]">
              <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="text-[var(--purple-primary)]">//</span> Team Size
              </h3>
              <p className="text-2xl font-bold font-mono text-[#E8EAF0] mt-1">
                {hackathon.team_size_min || 1} – {hackathon.team_size_max || 4} <span className="text-sm text-[var(--text-secondary)]">members</span>
              </p>
            </div>
          </div>

          {/* Problem Statements */}
          {(problems.length > 0 || isOwner) && (
            <div className="hack-card dash-card-glow rounded-xl p-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(10,5,32,0.6)] shadow-[0_0_20px_rgba(123,47,255,0.03)]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-widest flex items-center gap-2">
                  <span className="text-[var(--purple-primary)]">//</span> Problem Statements
                </h3>
                {isOwner && (
                  <Dialog open={showAddProblem} onOpenChange={setShowAddProblem}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 font-mono text-[var(--cyan-accent)] hover:text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)] border border-transparent hover:border-[rgba(0,212,255,0.2)]"><Plus className="w-3 h-3"/> Add</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                      <DialogHeader><DialogTitle className="pixel text-sm text-[var(--cyan-accent)]">ADD PROBLEM STATEMENT</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2 font-mono text-xs">
                        <div className="space-y-2">
                          <Label className="text-[var(--text-secondary)]">Title / Description *</Label>
                          <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={newProblemTitle} onChange={(e) => setNewProblemTitle(e.target.value)} placeholder="e.g. Build an AI-powered assistant" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[var(--text-secondary)]">Track (Optional)</Label>
                          <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={newProblemTrack} onChange={(e) => setNewProblemTrack(e.target.value)} placeholder="e.g. Web3, GenAI, Open Innovation" />
                        </div>
                        <Button onClick={addProblemStatement} className="w-full bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold">SAVE</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {problems.length > 0 ? (
                <div className="space-y-2">
                  {problems.map((ps) => (
                    <div key={ps.id} className="flex items-center gap-3 bg-[rgba(6,3,18,0.3)] rounded-lg px-4 py-3 text-sm border border-[rgba(123,47,255,0.1)] transition-colors hover:border-[rgba(123,47,255,0.3)]">
                      {ps.track && <span className="text-[var(--cyan-accent)] font-bold font-mono text-[10px] uppercase whitespace-nowrap px-2 py-0.5 rounded-sm bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] shadow-[0_0_5px_rgba(0,212,255,0.1)]">{ps.track}</span>}
                      <span className="text-[#E8EAF0] flex-1 min-w-0 break-words">{ps.title}</span>
                      {isOwner && (
                        <button onClick={() => deleteProblemStatement(ps.id)} className="text-[#454D66] hover:text-red-400 transition-colors p-1 shrink-0 bg-[rgba(6,3,18,0.5)] rounded-md border border-transparent hover:border-red-500/30 hover:bg-red-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-[#454D66] italic">// No problem statements added yet.</p>
              )}
            </div>
          )}
          {/* AI Project Ideas */}
          <div className="hack-card dash-card-glow rounded-xl p-5 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center border border-[rgba(0,212,255,0.2)] shadow-[0_0_8px_rgba(0,212,255,0.2)]">
                  <Brain className="w-4 h-4 text-[var(--cyan-accent)]" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider mb-0.5 flex items-center gap-2">
                    <span className="text-[var(--text-secondary)]">//</span> AI Project Ideas
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono">POWERED BY LLAMA 3.3</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {generationCount > 0 && (
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] px-2 py-0.5 rounded-sm bg-[rgba(6,3,18,0.5)] border border-[rgba(123,47,255,0.2)]">
                    {generationCount}/3 used
                  </span>
                )}
                {problems.length > 0 ? (
                  <Button
                    size="sm"
                    onClick={generateIdeas}
                    disabled={generatingIdeas || generationCount >= 3}
                    className="gap-1.5 text-xs h-8 font-mono bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold border border-transparent disabled:opacity-50"
                  >
                    {generatingIdeas ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> THINKING...</>
                    ) : generationCount >= 3 ? (
                      <>LIMIT REACHED</>
                    ) : aiIdeas.length > 0 ? (
                      <><RefreshCw className="w-3.5 h-3.5" /> REGENERATE</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> GENERATE IDEAS</>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* No problem statements message */}
            {problems.length === 0 && (
              <div className="text-center py-8">
                <Lightbulb className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-1">ADD PROBLEM STATEMENTS FIRST</p>
                <p className="text-[10px] font-mono text-[#454D66]">// AI needs your hackathon's tracks to generate targeted ideas</p>
              </div>
            )}

            {/* Error */}
            {ideasError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-red-400">{ideasError}</p>
              </div>
            )}

            {/* Loading skeleton */}
            {generatingIdeas && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[rgba(6,3,18,0.3)] rounded-xl p-4 border border-[rgba(123,47,255,0.1)] animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(123,47,255,0.1)] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-[rgba(123,47,255,0.1)] rounded" />
                        <div className="h-3 w-full bg-[rgba(123,47,255,0.05)] rounded" />
                        <div className="flex gap-2">
                          <div className="h-5 w-16 bg-[rgba(123,47,255,0.1)] rounded" />
                          <div className="h-5 w-20 bg-[rgba(123,47,255,0.1)] rounded" />
                          <div className="h-5 w-14 bg-[rgba(123,47,255,0.1)] rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-[#454D66] font-mono animate-pulse">// THINKING OF WINNING IDEAS...</p>
              </div>
            )}

            {/* Idea cards */}
            {!generatingIdeas && aiIdeas.length > 0 && (
              <div className="space-y-3">
                {aiIdeas.map((idea, idx) => {
                  const difficultyColors: Record<string, string> = {
                    beginner: "bg-[rgba(0,255,135,0.1)] text-[#00FF87] border-[rgba(0,255,135,0.2)]",
                    intermediate: "bg-[rgba(239,159,39,0.1)] text-[#EF9F27] border-[rgba(239,159,39,0.2)]",
                    advanced: "bg-red-500/10 text-red-400 border-red-500/20",
                  };
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                      className="bg-[rgba(6,3,18,0.5)] rounded-xl p-4 border border-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] transition-all group shadow-sm hover:shadow-[0_0_10px_rgba(0,212,255,0.1)]"
                    >
                      <div className="flex items-start gap-3">
                        {/* Number badge */}
                        <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center text-xs font-mono font-bold text-[var(--cyan-accent)] shrink-0 border border-[rgba(0,212,255,0.2)]">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Title + tagline */}
                          <h4 className="text-sm font-semibold text-[#E8EAF0] mb-1 leading-snug pixel" style={{ textShadow: "0 0 10px rgba(123,47,255,0.3)" }}>{idea.title}</h4>
                          <p className="text-xs text-[#7A8099] font-mono mb-3 leading-relaxed">// {idea.tagline}</p>

                          {/* Track */}
                          {idea.track && (
                            <div className="mb-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/20">
                                <Zap className="w-2.5 h-2.5" />
                                {idea.track}
                              </span>
                            </div>
                          )}

                          {/* Tech stack pills */}
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {(idea.tech_stack || []).map((tech, ti) => (
                              <span
                                key={ti}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#252A3A] text-[#7A8099] border border-[#2A3045]"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>

                          {/* Wow factor */}
                          {idea.wow_factor && (
                            <div className="flex items-start gap-1.5 mb-2.5 bg-[#EF9F27]/[0.06] rounded-lg px-3 py-2 border border-[#EF9F27]/10">
                              <Sparkles className="w-3 h-3 text-[#EF9F27] mt-0.5 shrink-0" />
                              <p className="text-[11px] text-[#EF9F27]/90 leading-relaxed">{idea.wow_factor}</p>
                            </div>
                          )}

                          {/* Bottom row: difficulty + hours + save */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${difficultyColors[idea.difficulty] || difficultyColors.intermediate}`}>
                                {idea.difficulty}
                              </span>
                              <span className="text-[10px] text-[#454D66] font-mono">
                                ~{idea.feasibility_hours}h to build
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveIdeaToNotes(idea, idx)}
                              disabled={savingIdeaIdx === idx}
                              className="h-7 text-[10px] gap-1 text-[#7A8099] hover:text-[#00FF87] hover:bg-[#00FF87]/10"
                            >
                              {savingIdeaIdx === idx ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save to Notes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Empty state after load (no previous ideas, has problems) */}
            {!generatingIdeas && aiIdeas.length === 0 && problems.length > 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-[#1E2330] mx-auto mb-3" />
                <p className="text-sm text-[#7A8099] mb-1">No ideas generated yet</p>
                <p className="text-xs text-[#454D66]">Click &quot;Generate Ideas&quot; to get AI-powered project suggestions</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="mt-6">
          <SubmissionChecklist hackathonId={hackathonId} />
        </TabsContent>

        {/* Find Teammates Tab */}
        <TabsContent value="teammates" className="mt-6">
          <FindTeammates hackathonId={hackathonId} />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">//</span> Team Members
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono border ${
                team.length >= (hackathon?.team_size_max || 4)
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-[rgba(6,3,18,0.5)] text-[#E8EAF0] border-[rgba(123,47,255,0.2)]'
              }`}>
                {team.length}/{hackathon?.team_size_max || 4}
              </span>
            </div>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 font-mono text-xs border-[rgba(123,47,255,0.3)] bg-[rgba(6,3,18,0.5)] hover:bg-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] text-[#E8EAF0] transition-colors"
                  disabled={!isOwner || team.length >= (hackathon?.team_size_max || 4)}
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--cyan-accent)]" />
                  {!isOwner ? 'OWNER ONLY' : team.length >= (hackathon?.team_size_max || 4) ? 'TEAM FULL' : 'ADD MEMBER'}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                <DialogHeader><DialogTitle className="pixel text-sm text-[var(--cyan-accent)]">ADD TEAM MEMBER</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2 font-mono text-xs">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Name *</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Email</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="member@email.com (sends invite)" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Role</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                        {ROLES.map((r) => <SelectItem key={r} value={r} className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addTeamMember} className="w-full bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold">SAVE MEMBER</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {team.length === 0 ? (
            <div className="text-center py-12 text-[#454D66]">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-xs font-mono">// NO TEAM MEMBERS YET</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {team.map((m) => (
                <div key={m.id} className="hack-card dash-card-glow rounded-xl p-4 flex items-center gap-3 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)]">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(123,47,255,0.1)] flex items-center justify-center text-sm font-bold text-[#E8EAF0] shrink-0 border border-[rgba(123,47,255,0.2)] shadow-[0_0_8px_rgba(123,47,255,0.1)] pixel">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--cyan-accent)] truncate">{m.name}</p>
                    <p className="text-[10px] font-mono font-medium text-[var(--text-secondary)] uppercase tracking-wide">{m.role}</p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Dialog open={showEditMember && editMemberData?.id === m.id} onOpenChange={(open) => {
                        if (open) {
                          setEditMemberData({ id: m.id, name: m.name, role: m.role || "Member" });
                          setShowEditMember(true);
                        } else {
                          setShowEditMember(false);
                          setEditMemberData(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <button className="text-[var(--text-secondary)] hover:text-[var(--cyan-accent)] transition-colors p-1.5 hover:bg-[rgba(123,47,255,0.1)] rounded-md">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                          <DialogHeader><DialogTitle className="pixel text-sm text-[var(--cyan-accent)]">EDIT MEMBER</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2 font-mono text-xs">
                            <div className="space-y-2">
                              <Label className="text-[var(--text-secondary)]">Name *</Label>
                              <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={editMemberData?.name || ""} onChange={(e) => setEditMemberData(prev => prev ? {...prev, name: e.target.value} : null)} placeholder="Name" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[var(--text-secondary)]">Role</Label>
                              <Select value={editMemberData?.role || ""} onValueChange={(val) => setEditMemberData(prev => prev ? {...prev, role: val} : null)}>
                                <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0]"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                                  {ROLES.map((r) => <SelectItem key={r} value={r} className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">{r}</SelectItem>)}
                                  <SelectItem value="Member" className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={saveMemberEdit} className="w-full bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold">SAVE CHANGES</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <button onClick={() => removeMember(m.id)} className="text-[#454D66] hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {invites.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[rgba(123,47,255,0.2)]">
              <h4 className="text-sm font-mono font-bold text-[var(--cyan-accent)] mb-3 flex items-center gap-2 uppercase tracking-wider">
                <span className="text-[var(--text-secondary)]">//</span> Pending Invites
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {invites.map((invite) => (
                  <div key={invite.id} className="hack-card dash-card-glow rounded-xl p-3 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)] flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-mono text-[#E8EAF0] truncate">{invite.email}</p>
                      <p className="text-[10px] text-[#454D66] font-mono uppercase mt-0.5 tracking-wider">{invite.role || "Member"} // Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Progress Tab — Kanban */}
        <TabsContent value="progress" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">//</span> Progress Tracker
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)] bg-[rgba(6,3,18,0.5)] px-3 py-1.5 rounded-sm border border-[rgba(123,47,255,0.2)]">
                <Progress value={taskProgress} className="w-24 sm:w-32 h-1.5 bg-[rgba(123,47,255,0.1)] [&>div]:bg-[var(--cyan-accent)]" />
                <span>{taskProgress}%</span>
              </div>
            </div>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 font-mono text-xs border-[rgba(123,47,255,0.3)] bg-[rgba(6,3,18,0.5)] hover:bg-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] text-[#E8EAF0] transition-colors">
                  <Plus className="w-3.5 h-3.5 text-[var(--cyan-accent)]" /> ADD TASK
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                <DialogHeader><DialogTitle className="pixel text-sm text-[var(--cyan-accent)]">ADD TASK</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2 font-mono text-xs">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Title *</Label>
                    <Input className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-[#E8EAF0]" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Column</Label>
                    <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                      <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                        {KANBAN_COLUMNS.map((c) => <SelectItem key={c.key} value={c.key} className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Priority</Label>
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                        <SelectItem value="low" className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Low</SelectItem>
                        <SelectItem value="medium" className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Medium</SelectItem>
                        <SelectItem value="high" className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">High</SelectItem>
                        <SelectItem value="urgent" className="font-mono text-xs text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addTask} className="w-full bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold">SAVE TASK</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[rgba(123,47,255,0.3)] scrollbar-track-[rgba(6,3,18,0.5)]">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="flex-shrink-0 w-72">
                  <div className="bg-[rgba(6,3,18,0.8)] border-b border-[rgba(123,47,255,0.3)] rounded-t-lg p-3 mb-3 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider">{col.label}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] bg-[rgba(123,47,255,0.1)] px-2 py-0.5 rounded-sm font-mono border border-[rgba(123,47,255,0.2)]">{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="space-y-3 min-h-[200px] p-1">
                    {colTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        className="hack-card dash-card-glow rounded-lg p-3 cursor-default border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)] shadow-sm hover:shadow-[0_0_8px_rgba(123,47,255,0.2)] transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-medium leading-snug text-[#E8EAF0]">{task.title}</p>
                          <button onClick={() => deleteTask(task.id)} className="text-[#454D66] hover:text-red-400 transition-colors shrink-0 p-1 bg-[rgba(6,3,18,0.5)] rounded-md border border-transparent hover:border-red-500/30 hover:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {/* Move buttons */}
                          <div className="flex gap-1.5">
                            {KANBAN_COLUMNS.map((target) => {
                              if (target.key === col.key) return null;
                              return (
                                <button
                                  key={target.key}
                                  onClick={() => moveTask(task.id, target.key)}
                                  className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[rgba(6,3,18,0.8)] text-[var(--text-secondary)] hover:bg-[rgba(123,47,255,0.1)] hover:text-[var(--cyan-accent)] hover:border-[var(--cyan-accent)] transition-colors border border-[rgba(123,47,255,0.2)] font-mono uppercase"
                                  title={`Move to ${target.label}`}
                                >
                                  {target.label.split(" ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-[var(--cyan-accent)] uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">//</span> Notes & Scratchpad
            </h3>
            <Button size="sm" onClick={saveNote} disabled={savingNote} className="gap-1.5 font-mono text-xs bg-[var(--cyan-accent)] hover:bg-[var(--cyan-accent)]/80 text-black font-bold border border-transparent disabled:opacity-50">
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              SAVE NOTES
            </Button>
          </div>
          <div className="hack-card dash-card-glow rounded-xl overflow-hidden border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)]">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="// Write your notes here... Ideas, tech stack decisions, API keys, mentor feedback, etc."
              className="w-full min-h-[400px] bg-transparent p-5 text-sm leading-relaxed resize-y focus:outline-none placeholder:text-[#454D66] text-[#E8EAF0] font-mono selection:bg-[var(--cyan-accent)] selection:text-black"
            />
          </div>
          {note && (
            <p className="text-[10px] text-[#454D66] text-right font-mono uppercase">
              LAST SAVED: {formatDate(note.updated_at)}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
