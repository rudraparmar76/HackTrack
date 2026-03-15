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
  const [status, setStatus] = useState("upcoming");
  const [problemStatements, setProblemStatements] = useState<{ track: string; title: string }[]>([]);
  const [resourceLinks, setResourceLinks] = useState<{ text: string; url: string; type: string }[]>([]);

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
          className="p-2 rounded-lg hover:bg-[#1A1F2E] transition-colors text-[#7A8099] hover:text-[#E8EAF0]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#E8EAF0]">Add Hackathon</h1>
          <p className="text-sm text-[#7A8099]">
            Paste a link to auto-fill or enter details manually
          </p>
        </div>
      </div>

      {/* URL Scraper */}
      <div className="hack-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF87]/10 border border-[#00FF87]/20 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#00FF87]" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-[#E8EAF0]">Smart Link Scraper</h2>
            <p className="text-xs text-[#7A8099]">
              Supports Devfolio, Unstop, Devpost, DoraHacks
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-[#454D66]" />
            <Input
              placeholder="Paste hackathon URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleScrape} disabled={scraping || !url.trim()} className="gap-2">
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
          <div className="flex items-center gap-2 text-sm text-[#00FF87]">
            <CheckCircle2 className="w-4 h-4" />
            Data extracted! Review and edit below before saving.
          </div>
        )}
      </div>

      {/* Form */}
      <div className="hack-card rounded-xl p-6 space-y-6">
        <h2 className="font-semibold flex items-center gap-2 text-[#E8EAF0]">
          <FileText className="w-4 h-4 text-[#00FF87]" />
          Event Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Hackathon Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HackIndia 2025" />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Devfolio">Devfolio</SelectItem>
                <SelectItem value="Unstop">Unstop</SelectItem>
                <SelectItem value="Devpost">Devpost</SelectItem>
                <SelectItem value="DoraHacks">DoraHacks</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Banner Image URL</Label>
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>Prize Pool</Label>
            <Input value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="e.g. ₹5,00,000" className="font-mono" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the hackathon..." rows={3} />
          </div>
        </div>

        {/* Dates */}
        <div>
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-[#E8EAF0]">
            <Calendar className="w-4 h-4 text-[#00FF87]" /> Important Dates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Registration Deadline</Label>
              <Input type="date" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Submission Deadline</Label>
              <Input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Result Date</Label>
              <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} className="font-mono" />
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div>
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-[#E8EAF0]">
            <Users className="w-4 h-4 text-[#00FF87]" /> Team Size
          </h3>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Min</Label>
              <Input type="number" value={teamMin} onChange={(e) => setTeamMin(e.target.value)} min="1" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#7A8099]">Max</Label>
              <Input type="number" value={teamMax} onChange={(e) => setTeamMax(e.target.value)} min="1" className="font-mono" />
            </div>
          </div>
        </div>

        {/* Problem Statements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm flex items-center gap-2 text-[#E8EAF0]">
              <Trophy className="w-4 h-4 text-[#00FF87]" /> Problem Statements / Tracks
            </h3>
            <button
              type="button"
              onClick={() => setProblemStatements([...problemStatements, { track: "", title: "" }])}
              className="text-xs text-[#00FF87] hover:text-[#00FF87]/80 transition-colors font-medium"
            >
              + Add Problem Statement
            </button>
          </div>
          {problemStatements.length === 0 ? (
            <p className="text-xs text-[#454D66]">No problem statements added yet. Click &quot;+ Add&quot; above to add one.</p>
          ) : (
            <div className="space-y-2">
              {problemStatements.map((ps, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#151820] rounded-lg px-3 py-2 border border-[#1E2330]">
                  <Input
                    value={ps.track}
                    onChange={(e) => {
                      const updated = [...problemStatements];
                      updated[i] = { ...updated[i], track: e.target.value };
                      setProblemStatements(updated);
                    }}
                    placeholder="Track name"
                    className="w-32 h-8 text-xs font-mono"
                  />
                  <Input
                    value={ps.title}
                    onChange={(e) => {
                      const updated = [...problemStatements];
                      updated[i] = { ...updated[i], title: e.target.value };
                      setProblemStatements(updated);
                    }}
                    placeholder="Problem statement title"
                    className="flex-1 h-8 text-xs"
                  />
                  <button
                    onClick={() => setProblemStatements(problemStatements.filter((_, j) => j !== i))}
                    className="text-[#454D66] hover:text-red-400 transition-colors text-xs shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Links */}
        {resourceLinks.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-[#E8EAF0]">
              <Link2 className="w-4 h-4 text-[#00D4FF]" /> Related Links &amp; Documents
            </h3>
            <div className="space-y-2">
              {resourceLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-[#151820] rounded-lg px-3 py-2 text-sm hover:bg-[#1E2330] transition-colors group border border-[#1E2330]"
                >
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                    link.type === 'pdf' ? 'bg-red-500/20 text-red-400' :
                    link.type === 'google_drive' ? 'bg-[#00D4FF]/20 text-[#00D4FF]' :
                    link.type === 'dropbox' ? 'bg-[#00D4FF]/20 text-[#00D4FF]' :
                    'bg-[#454D66]/20 text-[#7A8099]'
                  }`}>
                    {link.type === 'google_drive' ? 'Drive' : link.type}
                  </span>
                  <span className="text-[#E8EAF0] truncate flex-1 group-hover:text-[#00D4FF] transition-colors">
                    {link.text || link.url}
                  </span>
                  <svg className="w-3.5 h-3.5 text-[#454D66] group-hover:text-[#7A8099] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#1E2330]">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
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
