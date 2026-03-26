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
} from "lucide-react";
import { motion } from "framer-motion";

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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[#1A1F2E] transition-colors text-[#7A8099] hover:text-[#E8EAF0] mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#E8EAF0]">{hackathon.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(hackathon.status)}`}>
                {hackathon.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] pulse-dot" />
                )}
                {hackathon.status.charAt(0).toUpperCase() + hackathon.status.slice(1)}
              </span>
              {hackathon.platform && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(hackathon.platform)}`}>
                  {hackathon.platform}
                </span>
              )}
            </div>
            {hackathon.url && (
              <a href={hackathon.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00D4FF] hover:underline flex items-center gap-1">
                {hackathon.url.replace(/https?:\/\//, "").slice(0, 50)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Dialog open={showEditHackathon} onOpenChange={setShowEditHackathon}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setEditHackathonData(hackathon)} className="gap-1 border-[#1E2330] hover:bg-[#1A1F2E] text-[#E8EAF0]">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edit Hackathon Details</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editHackathonData.name || ""} onChange={(e) => setEditHackathonData({...editHackathonData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input value={editHackathonData.url || ""} onChange={(e) => setEditHackathonData({...editHackathonData, url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={editHackathonData.start_date?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, start_date: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={editHackathonData.end_date?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, end_date: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Deadline</Label>
                    <Input type="date" value={editHackathonData.registration_deadline?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, registration_deadline: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Submission Deadline</Label>
                    <Input type="date" value={editHackathonData.submission_deadline?.split("T")[0] || ""} onChange={(e) => setEditHackathonData({...editHackathonData, submission_deadline: e.target.value || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Team Size Min</Label>
                    <Input type="number" value={editHackathonData.team_size_min || 1} onChange={(e) => setEditHackathonData({...editHackathonData, team_size_min: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Team Size Max</Label>
                    <Input type="number" value={editHackathonData.team_size_max || 4} onChange={(e) => setEditHackathonData({...editHackathonData, team_size_max: parseInt(e.target.value) || 4})} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Prize Pool</Label>
                    <Input value={editHackathonData.prize_pool || ""} onChange={(e) => setEditHackathonData({...editHackathonData, prize_pool: e.target.value})} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Description</Label>
                    <textarea 
                      className="w-full bg-[#0F1117] border border-[#1E2330] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF87] min-h-[100px]"
                      value={editHackathonData.description || ""} 
                      onChange={(e) => setEditHackathonData({...editHackathonData, description: e.target.value})} 
                    />
                  </div>
                  <Button onClick={saveHackathonDetails} className="sm:col-span-2 w-full mt-2">Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-400 border-red-500/20 hover:bg-red-500/10 gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Countdown Bar */}
      {daysLeft !== null && (
        <div className="hack-card rounded-xl p-4 flex items-center gap-4">
          <Clock className="w-5 h-5 text-[#00FF87] shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-[#7A8099]">Submission Deadline</p>
            <p className={`text-lg font-bold font-mono ${countdownClass}`}>
              {daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? "Due today!" : "Deadline passed"}
            </p>
          </div>
          <div className="text-right text-sm text-[#7A8099] font-mono">
            {formatDate(hackathon.submission_deadline)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-[#1A1F2E] border border-[#1E2330]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team ({team.length})</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Banner */}
          {hackathon.banner_url && (
            <div className="rounded-xl overflow-hidden h-48 border border-[#1E2330]">
              <img src={hackathon.banner_url} alt={hackathon.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Description */}
          {hackathon.description && (
            <div className="hack-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[#7A8099] mb-2">Description</h3>
              <p className="text-sm leading-relaxed text-[#E8EAF0]">{hackathon.description}</p>
            </div>
          )}

          {/* Key Dates */}
          <div className="hack-card rounded-xl p-5">
            <h3 className="text-sm font-medium text-[#7A8099] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Key Dates
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Start", date: hackathon.start_date },
                { label: "End", date: hackathon.end_date },
                { label: "Registration", date: hackathon.registration_deadline },
                { label: "Submission", date: hackathon.submission_deadline },
                { label: "Results", date: hackathon.result_date },
              ].map((d) => (
                <div key={d.label} className="bg-[#151820] rounded-lg p-3 border border-[#1E2330]">
                  <p className="text-xs text-[#454D66] mb-1">{d.label}</p>
                  <p className="text-sm font-medium font-mono text-[#E8EAF0]">{formatDate(d.date)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prizes & Team Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hackathon.prize_pool && (
              <div className="hack-card rounded-xl p-5">
                <h3 className="text-sm font-medium text-[#7A8099] mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Prize Pool
                </h3>
                <p className="text-xl font-bold font-mono text-[#00FF87]">{hackathon.prize_pool}</p>
              </div>
            )}
            <div className="hack-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-[#7A8099] mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" /> Team Size
              </h3>
              <p className="text-xl font-bold font-mono text-[#E8EAF0]">
                {hackathon.team_size_min || 1} – {hackathon.team_size_max || 4} members
              </p>
            </div>
          </div>

          {/* Problem Statements */}
          {(problems.length > 0 || isOwner) && (
            <div className="hack-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#7A8099]">Problem Statements / Tracks</h3>
                {isOwner && (
                  <Dialog open={showAddProblem} onOpenChange={setShowAddProblem}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-[#00FF87] hover:text-[#00FF87] hover:bg-[#00FF87]/10"><Plus className="w-3 h-3"/> Add</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Problem Statement</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Title / Description *</Label>
                          <Input value={newProblemTitle} onChange={(e) => setNewProblemTitle(e.target.value)} placeholder="e.g. Build an AI-powered assistant" />
                        </div>
                        <div className="space-y-2">
                          <Label>Track (Optional)</Label>
                          <Input value={newProblemTrack} onChange={(e) => setNewProblemTrack(e.target.value)} placeholder="e.g. Web3, GenAI, Open Innovation" />
                        </div>
                        <Button onClick={addProblemStatement} className="w-full">Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {problems.length > 0 ? (
                <div className="space-y-2">
                  {problems.map((ps) => (
                    <div key={ps.id} className="flex items-center gap-3 bg-[#151820] rounded-lg px-4 py-3 text-sm border border-[#1E2330]">
                      {ps.track && <span className="text-[#00FF87] font-medium font-mono whitespace-nowrap">{ps.track}</span>}
                      <span className="text-[#E8EAF0] flex-1 min-w-0 break-words">{ps.title}</span>
                      {isOwner && (
                        <button onClick={() => deleteProblemStatement(ps.id)} className="text-[#454D66] hover:text-red-400 transition-colors p-1 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#454D66] italic">No problem statements added yet.</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#E8EAF0]">Team Members</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                team.length >= (hackathon?.team_size_max || 4)
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-[#1A1F2E] text-[#7A8099]'
              }`}>
                {team.length}/{hackathon?.team_size_max || 4} members
              </span>
            </div>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!isOwner || team.length >= (hackathon?.team_size_max || 4)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {!isOwner ? 'Owner Only' : team.length >= (hackathon?.team_size_max || 4) ? 'Team Full' : 'Add Member'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Member name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="member@email.com (sends invite)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addTeamMember} className="w-full">Save Member</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {team.length === 0 ? (
            <div className="text-center py-12 text-[#7A8099]">
              <Users className="w-12 h-12 mx-auto mb-3 text-[#1E2330]" />
              <p className="text-sm">No team members yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {team.map((m) => (
                <div key={m.id} className="hack-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00FF87]/10 flex items-center justify-center text-sm font-bold text-[#00FF87] shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#E8EAF0] truncate">{m.name}</p>
                    <p className="text-xs text-[#7A8099]">{m.role}</p>
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
                          <button className="text-[#454D66] hover:text-[#00FF87] transition-colors p-1">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input value={editMemberData?.name || ""} onChange={(e) => setEditMemberData(prev => prev ? {...prev, name: e.target.value} : null)} placeholder="Name" />
                            </div>
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select value={editMemberData?.role || ""} onValueChange={(val) => setEditMemberData(prev => prev ? {...prev, role: val} : null)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  <SelectItem value="Member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={saveMemberEdit} className="w-full">Save Changes</Button>
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
            <div className="mt-4">
              <h4 className="text-sm font-medium text-[#7A8099] mb-2">Pending Invites</h4>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div key={invite.id} className="bg-[#151820] rounded-lg border border-[#1E2330] px-3 py-2 text-sm flex items-center justify-between">
                    <div>
                      <p className="text-[#E8EAF0]">{invite.email}</p>
                      <p className="text-[#7A8099] text-xs">{invite.role || "Member"} • Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Progress Tab — Kanban */}
        <TabsContent value="progress" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-[#E8EAF0]">Progress Tracker</h3>
              <div className="flex items-center gap-2 text-sm text-[#7A8099]">
                <Progress value={taskProgress} className="w-32 h-2" />
                <span className="font-mono">{taskProgress}%</span>
              </div>
            </div>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Column</Label>
                    <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KANBAN_COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addTask} className="w-full">Add Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="flex-shrink-0 w-60">
                  <div className="frosted-glass rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#E8EAF0]">{col.label}</span>
                      <span className="text-xs text-[#7A8099] bg-[#0F1117]/50 px-2 py-0.5 rounded-full font-mono">{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {colTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        className="hack-card rounded-lg p-3 cursor-default"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium leading-snug text-[#E8EAF0]">{task.title}</p>
                          <button onClick={() => deleteTask(task.id)} className="text-[#454D66] hover:text-red-400 transition-colors shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {/* Move buttons */}
                          <div className="flex gap-1">
                            {KANBAN_COLUMNS.map((target) => {
                              if (target.key === col.key) return null;
                              return (
                                <button
                                  key={target.key}
                                  onClick={() => moveTask(task.id, target.key)}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#151820] text-[#7A8099] hover:bg-[#1E2330] hover:text-[#E8EAF0] transition-colors border border-[#1E2330]"
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2 text-[#E8EAF0]">
              <FileText className="w-4 h-4 text-[#00FF87]" /> Notes
            </h3>
            <Button size="sm" onClick={saveNote} disabled={savingNote} className="gap-1">
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
          <div className="hack-card rounded-xl overflow-hidden">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your notes here... Ideas, tech stack decisions, API keys, mentor feedback, etc."
              className="w-full min-h-[400px] bg-transparent p-5 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-[#454D66] text-[#E8EAF0] font-mono"
            />
          </div>
          {note && (
            <p className="text-xs text-[#454D66] text-right font-mono">
              Last saved: {formatDate(note.updated_at)}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
