"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate } from "@/lib/utils";
import { Clock, Bell, Trash2, Plus, Calendar, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Reminder {
  id: string;
  hackathon_id: string;
  message: string;
  remind_at: string;
  type: string;
  sent: boolean;
  hackathons?: { name: string };
}

export default function RemindersPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [hackathons, setHackathons] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newHackathonId, setNewHackathonId] = useState("");
  const [newType, setNewType] = useState("in-app");

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [remRes, hackRes] = await Promise.all([
      supabase.from("reminders").select("*, hackathons(name)").eq("user_id", user.id).order("remind_at"),
      supabase.from("hackathons").select("id, name").eq("user_id", user.id),
    ]);
    setReminders(remRes.data || []);
    setHackathons(hackRes.data || []);
    setLoading(false);
  };

  const addReminder = async () => {
    if (!newMessage.trim() || !newDate || !newHackathonId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("reminders").insert({
      hackathon_id: newHackathonId,
      user_id: user.id,
      message: newMessage,
      remind_at: newDate,
      type: newType,
    });
    setNewMessage(""); setNewDate(""); setNewHackathonId(""); setNewType("in-app");
    setShowAdd(false);
    fetchReminders();
    toast({ title: "Reminder created" });
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    fetchReminders();
    toast({ title: "Reminder deleted" });
  };

  const upcoming = reminders.filter((r) => !r.sent && new Date(r.remind_at) > new Date());
  const past = reminders.filter((r) => r.sent || new Date(r.remind_at) <= new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="dash-terminal mb-2">
            <span>$ crontab -l</span>
            <span className="cursor"></span>
          </div>
          <h1 className="dash-heading">Reminders</h1>
          <p className="text-sm text-[#8888bb] mt-2 mono">Stay on top of your hackathon deadlines</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono text-xs hover:opacity-90 transition-opacity shadow-none" style={{ background: "var(--purple-primary)", color: "white" }}><Plus className="w-4 h-4" /> New Reminder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Reminder</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Hackathon</Label>
                <Select value={newHackathonId} onValueChange={setNewHackathonId}>
                  <SelectTrigger><SelectValue placeholder="Select hackathon" /></SelectTrigger>
                  <SelectContent>
                    {hackathons.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="What should we remind you about?" />
              </div>
              <div className="space-y-2">
                <Label>Remind At</Label>
                <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-app">In-App</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addReminder} className="w-full">Create Reminder</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="hack-card rounded-xl h-20 animate-pulse" />)}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#7A8099] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hack-card dash-card-glow rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#E8EAF0]">{r.message}</p>
                      <div className="flex items-center gap-2 text-xs text-[#7A8099] mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span className="font-mono">{formatDate(r.remind_at)}</span>
                        {r.hackathons && <span>· {(r.hackathons as any).name}</span>}
                        <span className="px-1.5 py-0.5 rounded bg-[#151820] text-[10px] font-mono border border-[#1E2330]">{r.type}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteReminder(r.id)} className="text-[#454D66] hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[#7A8099] mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Past ({past.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {past.map((r) => (
                  <div key={r.id} className="hack-card rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#454D66]/15 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5 text-[#454D66]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#7A8099]">{r.message}</p>
                      <p className="text-xs text-[#454D66] font-mono">{formatDate(r.remind_at)}</p>
                    </div>
                    <button onClick={() => deleteReminder(r.id)} className="text-[#454D66] hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reminders.length === 0 && (
            <div className="text-center py-20">
              <Bell className="w-16 h-16 text-[#1E2330] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#E8EAF0] mb-1">No reminders yet</h3>
              <p className="text-sm text-[#7A8099]">
                Reminders are auto-created when you add a hackathon with deadlines.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
