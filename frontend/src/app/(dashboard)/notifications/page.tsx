"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  hackathon_id: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifications();
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="dash-terminal mb-2">
            <span>$ tail -f ALERTS</span>
            <span className="cursor"></span>
          </div>
          <h1 className="dash-heading">Notifications</h1>
          <p className="text-sm text-[#8888bb] mt-2 mono">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2 mono text-xs" style={{ borderColor: 'rgba(123,47,255,0.25)' }}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--purple-primary)]" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-16 h-16 text-[#1E2330] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#E8EAF0] mb-1">No notifications</h3>
          <p className="text-sm text-[#7A8099]">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`hack-card dash-card-glow rounded-xl p-4 flex items-center gap-3 ${!n.read ? "border-l-[3px] unread-purple" : "opacity-60"}`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-purple-400 pulse-dot" : "bg-[#454D66]"}`} />
              <div className="flex-1">
                <p className="text-sm text-[#E8EAF0]">{n.message}</p>
                <p className="text-xs text-[#454D66] mt-0.5 font-mono">{formatDate(n.created_at)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
