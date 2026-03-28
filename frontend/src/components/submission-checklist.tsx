"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Trophy,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChecklistItem {
  id: string;
  hackathon_id: string;
  label: string;
  checked: boolean;
  order_index: number;
  created_at: string;
}

interface SubmissionChecklistProps {
  hackathonId: string;
}

// ─── Sortable Item ──────────────────────────────────────────────────────────
function SortableChecklistItem({
  item,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{ duration: 0.2 }}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
        item.checked
          ? "bg-[#00FF87]/[0.04] border-[#00FF87]/15"
          : "bg-[#151820] border-[#1E2330] hover:border-[#2A3045]"
      } ${isDragging ? "shadow-xl shadow-[#00FF87]/5 ring-1 ring-[#00FF87]/20" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-[#2A3045] hover:text-[#454D66] cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.checked)}
        className="shrink-0 transition-transform duration-200 hover:scale-110"
        aria-label={item.checked ? "Uncheck item" : "Check item"}
      >
        {item.checked ? (
          <CheckCircle2 className="w-5 h-5 text-[#00FF87] drop-shadow-[0_0_6px_rgba(0,255,135,0.3)]" />
        ) : (
          <Circle className="w-5 h-5 text-[#2A3045] hover:text-[#454D66]" />
        )}
      </button>

      {/* Label */}
      <span
        className={`flex-1 text-sm transition-all duration-200 select-none ${
          item.checked
            ? "line-through text-[#00FF87]/60"
            : "text-[#E8EAF0]"
        }`}
      >
        {item.label}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[#2A3045] hover:text-red-400 transition-all duration-200 shrink-0 p-1"
        aria-label="Delete item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SubmissionChecklist({ hackathonId }: SubmissionChecklistProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCompleted = useRef(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, [supabase]);

  // Fetch checklist
  const fetchChecklist = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [apiUrl, hackathonId, getToken]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Computed values
  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const allComplete = totalCount > 0 && checkedCount === totalCount;

  // Show confetti when reaching 100%
  useEffect(() => {
    if (allComplete && prevCompleted.current < totalCount && totalCount > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = checkedCount;
  }, [allComplete, checkedCount, totalCount]);

  // Toggle checked — optimistic update
  const toggleItem = useCallback(
    async (itemId: string, checked: boolean) => {
      // Optimistic
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, checked } : i))
      );

      const token = await getToken();
      try {
        const res = await fetch(`${apiUrl}/api/checklist/${itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ checked }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, checked: !checked } : i))
        );
        toast({ title: "Failed to update", variant: "destructive" });
      }
    },
    [apiUrl, getToken, toast]
  );

  // Add custom item
  const addItem = useCallback(async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    const token = await getToken();
    try {
      const res = await fetch(`${apiUrl}/api/hackathons/${hackathonId}/checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => [...prev, data]);
        setNewLabel("");
        toast({ title: "Item added" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  }, [apiUrl, hackathonId, newLabel, getToken, toast]);

  // Delete item
  const deleteItem = useCallback(
    async (itemId: string) => {
      const prev = items;
      setItems((p) => p.filter((i) => i.id !== itemId));
      const token = await getToken();
      try {
        const res = await fetch(`${apiUrl}/api/checklist/${itemId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
      } catch {
        setItems(prev);
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    },
    [apiUrl, items, getToken, toast]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order_index: idx,
      }));

      setItems(reordered);

      // Persist reorder
      const token = await getToken();
      try {
        await fetch(`${apiUrl}/api/hackathons/${hackathonId}/checklist/reorder`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: reordered.map((i) => ({ id: i.id, order_index: i.order_index })),
          }),
        });
      } catch {
        fetchChecklist(); // revert by refetching
      }
    },
    [items, apiUrl, hackathonId, getToken, fetchChecklist]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#00FF87]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + Progress */}
      <div className="hack-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
              allComplete
                ? "bg-gradient-to-br from-[#00FF87] to-[#00D4FF] shadow-lg shadow-[#00FF87]/20"
                : "bg-[#00FF87]/10"
            }`}>
              {allComplete ? (
                <Trophy className="w-5 h-5 text-[#0F1117]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#00FF87]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#E8EAF0]">Submission Checklist</h3>
              <p className="text-xs text-[#454D66]">Track your hackathon progress</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold font-mono transition-colors duration-300 ${
              allComplete ? "text-[#00FF87]" : progressPercent > 50 ? "text-[#00D4FF]" : "text-[#E8EAF0]"
            }`}>
              {checkedCount}/{totalCount}
            </p>
            <p className="text-[10px] text-[#454D66]">completed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-2.5 bg-[#1A1F2E] rounded-full overflow-hidden border border-[#1E2330]">
            <motion.div
              className={`h-full rounded-full ${
                allComplete
                  ? "bg-gradient-to-r from-[#00FF87] to-[#00D4FF]"
                  : "bg-gradient-to-r from-[#00FF87] to-[#00FF87]/70"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-[#454D66] text-right mt-1.5 font-mono">
            {progressPercent}% complete
          </p>
        </div>

        {/* All complete celebration */}
        <AnimatePresence>
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 bg-gradient-to-r from-[#00FF87]/10 via-[#00D4FF]/10 to-[#00FF87]/10 border border-[#00FF87]/20 rounded-xl px-5 py-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <PartyPopper className="w-5 h-5 text-[#00FF87]" />
                <Trophy className="w-5 h-5 text-[#EF9F27]" />
                <Sparkles className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <p className="text-sm font-bold text-[#00FF87]">Ready to submit! 🚀</p>
              <p className="text-[11px] text-[#7A8099] mt-0.5">
                All checklist items completed. You&apos;re good to go!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {items.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-[#1E2330] mx-auto mb-3" />
            <p className="text-sm text-[#7A8099] mb-1">No checklist items yet</p>
            <p className="text-xs text-[#454D66]">
              Add your first item or create a new hackathon to get default items
            </p>
          </div>
        )}
      </div>

      {/* Add custom item */}
      <div className="hack-card rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#2A3045] flex items-center justify-center shrink-0">
            <Plus className="w-3 h-3 text-[#454D66]" />
          </div>
          <Input
            ref={inputRef}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) addItem();
            }}
            placeholder="Add a custom checklist item..."
            className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-[#E8EAF0] placeholder:text-[#2A3045] h-8 px-0"
          />
          <Button
            size="sm"
            onClick={addItem}
            disabled={adding || !newLabel.trim()}
            className="gap-1 h-8 text-xs bg-[#00FF87]/10 text-[#00FF87] hover:bg-[#00FF87]/20 border border-[#00FF87]/20 disabled:opacity-30"
          >
            {adding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
