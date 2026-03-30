"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Link2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Trophy,
  Users,
  FileText,
  ArrowLeft,
  Terminal,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ScrapedData {
  name: string;
  platform: string;
  banner_url: string;
  description: string;
  registration_deadline: string;
  submission_deadline: string;
  result_date?: string;
  prize_pool: string;
  team_size: { min: number; max: number };
  problem_statements: { track: string; title: string }[];
  resource_links?: { text: string; url: string; type: string }[];
  scrape_success: boolean;
  start_date?: string;
  end_date?: string;
}

export default function NewHackathonPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [teamMin, setTeamMin] = useState("1");
  const [teamMax, setTeamMax] = useState("4");
  const [status, setStatus] = useState("interested");
  const [problemStatements, setProblemStatements] = useState<{ track: string; title: string }[]>([]);
  const [resourceLinks, setResourceLinks] = useState<{ text: string; url: string; type: string }[]>([]);
  const [inviteEmails, setInviteEmails] = useState("");

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: ScrapedData = await res.json();

      if (data.scrape_success || data.name) {
        setName(data.name || "");
        setPlatform(data.platform || "");
        setBannerUrl(data.banner_url || "");
        setDescription(data.description || "");
        setRegistrationDeadline(data.registration_deadline?.split("T")[0] || "");
        setSubmissionDeadline(data.submission_deadline?.split("T")[0] || "");
        setResultDate(data.result_date?.split("T")[0] || "");
        setStartDate(data.start_date?.split("T")[0] || "");
        setEndDate(data.end_date?.split("T")[0] || "");
        setPrizePool(data.prize_pool || "");
        setTeamMin(String(data.team_size?.min || 1));
        setTeamMax(String(data.team_size?.max || 4));
        setProblemStatements(data.problem_statements || []);
        setResourceLinks(data.resource_links || []);
        setScraped(true);

        toast({
          title: data.scrape_success ? "Scraped successfully!" : "Partial data extracted",
          description: data.scrape_success
            ? "All fields have been auto-filled. Review and edit as needed."
            : "Some fields were extracted. Fill in the rest manually.",
        });
      } else {
        toast({
          title: "Scraping failed",
          description: "Could not extract data. Please fill in the fields manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Scraping failed",
        description: "Server error. Please fill in details manually.",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a hackathon name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: hack, error } = await supabase.from("hackathons").insert({
        user_id: user.id,
        name,
        url: url || null,
        platform: platform || null,
        banner_url: bannerUrl || null,
        description: description || null,
        start_date: startDate || null,
        end_date: endDate || null,
        registration_deadline: registrationDeadline || null,
        submission_deadline: submissionDeadline || null,
        result_date: resultDate || null,
        prize_pool: prizePool || null,
        team_size_min: parseInt(teamMin) || null,
        team_size_max: parseInt(teamMax) || null,
        status,
      }).select().single();

      if (error) throw error;

      // Insert problem statements
      if (problemStatements.length > 0 && hack) {
        await supabase.from("problem_statements").insert(
          problemStatements.map((ps) => ({
            hackathon_id: hack.id,
            title: ps.title,
            track: ps.track,
          }))
        );
      }

      const inviteList = inviteEmails
        .split(/[\n,]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      if (inviteList.length > 0 && hack) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

        if (token) {
          const inviteResults = await Promise.allSettled(
            inviteList.map((email) =>
              fetch(`${apiUrl}/api/hackathons/${hack.id}/invites`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email, role: "Member" }),
              })
            )
          );

          const successfulInvites = inviteResults.filter((result) => result.status === "fulfilled").length;
          if (successfulInvites > 0) {
            toast({
              title: "Team invites sent",
              description: `${successfulInvites} teammate(s) were invited by email.`,
            });
          }
        }
      }

      toast({ title: "Hackathon added!", description: `${name} has been added to your dashboard.` });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2.5 rounded-xl border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)] hover:bg-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] transition-all text-[var(--text-secondary)] hover:text-[var(--cyan-accent)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#E8EAF0] pixel tracking-wider flex items-center gap-2 drop-shadow-[0_0_8px_rgba(123,47,255,0.4)]">
            <span className="text-[var(--cyan-accent)]">/</span>ADD_HACKATHON
          </h1>
          <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase mt-1">
            Paste a link to auto-fill or enter details manually
          </p>
        </div>
      </div>

      {/* URL Scraper */}
      <div className="hack-card dash-card-glow rounded-xl p-6 space-y-4 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(0,255,135,0.05)] blur-[3xl] pointer-events-none" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,135,0.1)] border border-[rgba(0,255,135,0.2)] flex items-center justify-center shadow-[0_0_8px_rgba(0,255,135,0.15)] relative z-10 text-[#00FF87]">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <h2 className="font-mono font-bold text-sm text-[#00FF87] uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">//</span> Smart Link Scraper
            </h2>
            <p className="text-[10px] font-mono text-[#7A8099] uppercase tracking-widest mt-0.5">
              Supports Devfolio, Unstop, Devpost, DoraHacks
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          <div className="relative flex-1 w-full">
            <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-[#454D66]" />
            <Input
              placeholder="// Paste hackathon URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10 w-full bg-[#0F1117] border-[rgba(0,255,135,0.2)] focus-visible:ring-[#00FF87] text-sm font-mono text-[#E8EAF0] placeholder:text-[#454D66] selection:bg-[#00FF87] selection:text-black"
            />
          </div>
          <Button onClick={handleScrape} disabled={scraping || !url.trim()} className="gap-2 w-full sm:w-auto font-mono text-xs font-bold uppercase tracking-wider bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/30 hover:bg-[#00FF87]/20 shadow-[0_0_10px_rgba(0,255,135,0.1)] disabled:opacity-50">
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scraping...
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4" /> Extract
              </>
            )}
          </Button>
        </div>
        {scraped && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#00FF87] uppercase tracking-wider relative z-10">
            <CheckCircle2 className="w-4 h-4" />
            Data extracted! Review and edit below before saving.
          </div>
        )}
      </div>

      {/* Form */}
      <div className="hack-card dash-card-glow rounded-xl p-6 space-y-6 border border-[rgba(123,47,255,0.2)] bg-[rgba(6,3,18,0.5)]">
        <div className="flex items-center gap-3 border-b border-[rgba(123,47,255,0.2)] pb-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(123,47,255,0.1)] border border-[rgba(123,47,255,0.2)] flex items-center justify-center shadow-[0_0_10px_rgba(123,47,255,0.1)]">
            <FileText className="w-5 h-5 text-[var(--cyan-accent)]" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-sm text-[var(--cyan-accent)] uppercase tracking-wider flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">//</span> Event Details
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Hackathon Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HackIndia 2025" className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0] focus:ring-[var(--cyan-accent)] font-mono text-xs uppercase"><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                <SelectItem value="Devfolio" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Devfolio</SelectItem>
                <SelectItem value="Unstop" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Unstop</SelectItem>
                <SelectItem value="Devpost" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Devpost</SelectItem>
                <SelectItem value="DoraHacks" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">DoraHacks</SelectItem>
                <SelectItem value="Other" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] text-[#E8EAF0] focus:ring-[var(--cyan-accent)] font-mono text-xs uppercase"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0a0520] border-[rgba(123,47,255,0.2)]">
                <SelectItem value="interested" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Interested</SelectItem>
                <SelectItem value="registered" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Registered</SelectItem>
                <SelectItem value="ideating" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Ideating</SelectItem>
                <SelectItem value="building" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Building</SelectItem>
                <SelectItem value="submitted" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Submitted</SelectItem>
                <SelectItem value="won" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Won</SelectItem>
                <SelectItem value="lost" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Lost</SelectItem>
                <SelectItem value="withdrew" className="font-mono text-xs uppercase text-[#E8EAF0] focus:bg-[rgba(123,47,255,0.1)] focus:text-[var(--cyan-accent)]">Withdrew</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Banner Image URL</Label>
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Prize Pool</Label>
            <Input value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="e.g. ₹5,00,000" className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the hackathon..." rows={3} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] selection:bg-[var(--cyan-accent)] selection:text-black" />
          </div>
        </div>

        {/* Dates */}
        <div className="pt-2 border-t border-[rgba(123,47,255,0.2)]">
          <h3 className="font-mono font-bold text-sm mb-4 flex items-center gap-2 text-[var(--cyan-accent)] uppercase tracking-wider mt-4">
            <span className="text-[var(--text-secondary)]">//</span> Important Dates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Registration Deadline</Label>
              <Input type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Submission Deadline</Label>
              <Input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Result Date</Label>
              <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] [color-scheme:dark]" />
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div className="pt-2 border-t border-[rgba(123,47,255,0.2)]">
          <h3 className="font-mono font-bold text-sm mb-4 flex items-center gap-2 text-[var(--cyan-accent)] uppercase tracking-wider mt-4">
            <span className="text-[var(--text-secondary)]">//</span> Team Info
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Min Size</Label>
              <Input type="number" value={teamMin} onChange={(e) => setTeamMin(e.target.value)} min="1" className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono text-[var(--text-secondary)] uppercase">Max Size</Label>
              <Input type="number" value={teamMax} onChange={(e) => setTeamMax(e.target.value)} min="1" className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0]" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono text-[var(--cyan-accent)] uppercase">Invite Teammates by Email (optional)</Label>
          <Textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder="teammate1@email.com, teammate2@email.com"
            rows={3}
            className="bg-[#0F1117] border-[rgba(123,47,255,0.2)] focus-visible:ring-[var(--cyan-accent)] text-sm font-mono text-[#E8EAF0] selection:bg-[var(--cyan-accent)] selection:text-black"
          />
          <p className="text-[10px] font-mono text-[#454D66] uppercase">// Comma or new line separated. Invite emails are sent after save.</p>
        </div>

        {/* Problem Statements */}
        <div className="pt-4 border-t border-[rgba(123,47,255,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono font-bold text-sm flex items-center gap-2 text-[var(--cyan-accent)] uppercase tracking-wider">
              <span className="text-[var(--text-secondary)]">//</span> Problem Statements
            </h3>
            <button
              type="button"
              onClick={() => setProblemStatements([...problemStatements, { track: "", title: "" }])}
              className="text-xs text-[#00FF87] hover:text-[#00FF87]/80 transition-colors font-mono font-bold uppercase tracking-wider bg-[#00FF87]/10 px-2.5 py-1 rounded-sm border border-[#00FF87]/20 hover:bg-[#00FF87]/20"
            >
              + ADD
            </button>
          </div>
          {problemStatements.length === 0 ? (
            <p className="text-xs font-mono text-[#454D66] italic">// No problem statements added yet.</p>
          ) : (
            <div className="space-y-2">
              {problemStatements.map((ps, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-[#0F1117] rounded-lg px-3 py-2 border border-[rgba(123,47,255,0.2)]">
                  <Input
                    value={ps.track}
                    onChange={(e) => {
                      const updated = [...problemStatements];
                      updated[i] = { ...updated[i], track: e.target.value };
                      setProblemStatements(updated);
                    }}
                    placeholder="TRACK NAME"
                    className="w-full sm:w-32 h-8 text-xs font-mono uppercase bg-transparent border-[rgba(123,47,255,0.2)] text-[var(--cyan-accent)] focus-visible:ring-[var(--cyan-accent)]"
                  />
                  <Input
                    value={ps.title}
                    onChange={(e) => {
                      const updated = [...problemStatements];
                      updated[i] = { ...updated[i], title: e.target.value };
                      setProblemStatements(updated);
                    }}
                    placeholder="Problem statement detail..."
                    className="w-full sm:flex-1 h-8 text-xs font-mono bg-transparent border-[rgba(123,47,255,0.2)] text-[#E8EAF0] focus-visible:ring-[var(--cyan-accent)]"
                  />
                  <button
                    onClick={() => setProblemStatements(problemStatements.filter((_, j) => j !== i))}
                    className="text-[#454D66] hover:text-red-400 transition-colors shrink-0 p-1.5 rounded-md hover:bg-red-500/10 hover:border-red-500/30 border border-transparent self-end sm:self-auto"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Links */}
        {resourceLinks.length > 0 && (
          <div className="pt-4 border-t border-[rgba(123,47,255,0.2)]">
            <h3 className="font-mono font-bold text-sm mb-3 flex items-center gap-2 text-[var(--cyan-accent)] uppercase tracking-wider">
              <span className="text-[var(--text-secondary)]">//</span> Resource Links
            </h3>
            <div className="space-y-2">
              {resourceLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-[rgba(6,3,18,0.8)] rounded-lg px-3 py-2 text-sm hover:bg-[rgba(123,47,255,0.1)] transition-colors group border border-[rgba(123,47,255,0.2)] hover:border-[var(--cyan-accent)]"
                >
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm font-mono border ${
                    link.type === 'pdf' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    link.type === 'google_drive' ? 'bg-[rgba(0,212,255,0.1)] text-[var(--cyan-accent)] border-[rgba(0,212,255,0.2)]' :
                    link.type === 'dropbox' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20' :
                    'bg-[#454D66]/10 text-[#7A8099] border-[#454D66]/20'
                  }`}>
                    {link.type === 'google_drive' ? 'Drive' : link.type}
                  </span>
                  <span className="text-[#E8EAF0] font-mono truncate flex-1 group-hover:text-[var(--cyan-accent)] transition-colors">
                    {link.text || link.url}
                  </span>
                  <Link2 className="w-3.5 h-3.5 text-[#454D66] group-hover:text-[var(--cyan-accent)] shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3 pt-6 border-t border-[rgba(123,47,255,0.2)]">
          <Link href="/dashboard">
            <Button variant="outline" className="font-mono text-xs uppercase tracking-wider bg-[rgba(6,3,18,0.5)] border-[rgba(123,47,255,0.3)] hover:bg-[rgba(123,47,255,0.1)] hover:border-[var(--cyan-accent)] hover:text-[#E8EAF0]">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="gap-2 font-mono text-xs font-bold uppercase tracking-wider bg-[var(--cyan-accent)] text-black hover:bg-[var(--cyan-accent)]/80 shadow-[0_0_10px_rgba(0,212,255,0.3)] border border-transparent">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Hackathon"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
