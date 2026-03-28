"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Trophy,
  XCircle,
  LogOut,
  ChevronRight,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type PipelineStatus =
  | "interested"
  | "registered"
  | "ideating"
  | "building"
  | "submitted"
  | "won"
  | "lost"
  | "withdrew";

interface HackathonPipelineProps {
  currentStatus: PipelineStatus;
  onUpdate: (data: { status: PipelineStatus; won?: boolean; placement?: string }) => Promise<void>;
}

const STAGES = [
  { id: "interested", label: "Interested" },
  { id: "registered", label: "Registered" },
  { id: "ideating", label: "Ideating" },
  { id: "building", label: "Building" },
  { id: "submitted", label: "Submitted" },
  { id: "result", label: "Result" },
];

export function HackathonPipeline({ currentStatus, onUpdate }: HackathonPipelineProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [placement, setPlacement] = useState("");
  const [resultType, setResultType] = useState<"won" | "lost" | "withdrew" | null>(null);

  // Map backend status to pipeline stage index
  const getStageIndex = (status: PipelineStatus) => {
    switch (status) {
      case "interested": return 0;
      case "registered": return 1;
      case "ideating": return 2;
      case "building": return 3;
      case "submitted": return 4;
      case "won":
      case "lost":
      case "withdrew":
        return 5;
      default:
        return 0; // fallback to interested
    }
  };

  const currentIndex = getStageIndex(currentStatus);

  const handleStageClick = async (stageId: string, idx: number) => {
    if (loading) return;

    if (stageId === "result") {
      setResultDialogOpen(true);
      return;
    }

    setLoading(stageId);
    try {
      await onUpdate({ status: stageId as PipelineStatus });
    } finally {
      setLoading(null);
    }
  };

  const submitResult = async () => {
    if (!resultType) return;
    setLoading("result");
    
    try {
      if (resultType === "won") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#00FF87', '#00D4FF']
        });
      }

      await onUpdate({
        status: resultType,
        won: resultType === "won",
        placement: resultType === "won" ? placement : undefined,
      });
      setResultDialogOpen(false);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-[#1A1F2E] border-b border-[#252A3A] sticky top-0 z-40 relative shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between overflow-x-auto py-4 scrollbar-hide">
          <div className="flex items-center min-w-max gap-1">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx <= currentIndex;
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              
              let StatusIcon = Circle;
              let iconColor = "text-[#454D66]";
              let textColor = "text-[#7A8099]";
              let bgColor = "bg-transparent";

              if (isCompleted) {
                StatusIcon = CheckCircle2;
                iconColor = "text-[#00FF87]";
                textColor = isCurrent ? "text-[#E8EAF0] font-bold" : "text-[#E8EAF0]";
              }

              // Special handling for result stage
              if (stage.id === "result" && isCompleted) {
                if (currentStatus === "won") {
                  StatusIcon = Trophy;
                  iconColor = "text-[#FFD700]";
                  bgColor = "bg-[#FFD700]/10 border-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.15)]";
                  textColor = "text-[#FFD700] font-bold";
                } else if (currentStatus === "lost") {
                  StatusIcon = XCircle;
                  iconColor = "text-[#EF4444]";
                  textColor = "text-[#EF4444]";
                } else if (currentStatus === "withdrew") {
                  StatusIcon = LogOut;
                  iconColor = "text-[#EF9F27]";
                  textColor = "text-[#EF9F27]";
                }
              }

              return (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => handleStageClick(stage.id, idx)}
                    disabled={loading !== null}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border border-transparent whitespace-nowrap ${
                      isCurrent && stage.id !== "result"
                        ? "bg-[#252A3A] border-[#2A3045] shadow-sm"
                        : "hover:bg-[#252A3A]"
                    } ${bgColor}`}
                  >
                    {loading === stage.id ? (
                      <Loader2 className={`w-4 h-4 animate-spin ${iconColor}`} />
                    ) : (
                      <StatusIcon className={`w-4 h-4 ${iconColor}`} />
                    )}
                    <span className={`text-sm tracking-wide ${textColor}`}>
                      {stage.id === "result" && isCompleted && currentStatus !== "submitted"
                        ? currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)
                        : stage.label}
                    </span>
                  </button>

                  {idx < STAGES.length - 1 && (
                    <ChevronRight className={`w-4 h-4 mx-2 ${isPast ? "text-[#00FF87]/50" : "text-[#2A3045]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="bg-[#1A1F2E] border-[#2A3045] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#E8EAF0]">Hackathon Result</DialogTitle>
            <DialogDescription className="text-[#7A8099]">
              How did the hackathon go? Update your final status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-4">
            <button
              onClick={() => setResultType("won")}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                resultType === "won"
                  ? "bg-[#FFD700]/10 border-[#FFD700] text-[#FFD700]"
                  : "bg-[#0F1117] border-[#2A3045] text-[#7A8099] hover:border-[#454D66]"
              }`}
            >
              <Trophy className="w-6 h-6" />
              <span className="font-medium text-sm">Won</span>
            </button>
            <button
              onClick={() => setResultType("lost")}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                resultType === "lost"
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : "bg-[#0F1117] border-[#2A3045] text-[#7A8099] hover:border-[#454D66]"
              }`}
            >
              <XCircle className="w-6 h-6" />
              <span className="font-medium text-sm">Lost</span>
            </button>
            <button
              onClick={() => setResultType("withdrew")}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                resultType === "withdrew"
                  ? "bg-[#EF9F27]/10 border-[#EF9F27] text-[#EF9F27]"
                  : "bg-[#0F1117] border-[#2A3045] text-[#7A8099] hover:border-[#454D66]"
              }`}
            >
              <LogOut className="w-6 h-6" />
              <span className="font-medium text-sm">Withdrew</span>
            </button>
          </div>

          {resultType === "won" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <label className="text-sm font-medium text-[#E8EAF0]">
                What place did you finish? (Optional)
              </label>
              <Input
                placeholder="e.g. 1st Place, Best UI/UX, Top 10"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="bg-[#0F1117] border-[#2A3045] text-[#E8EAF0] focus-visible:ring-[#FFD700]/30 focus-visible:border-[#FFD700]"
              />
            </motion.div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setResultDialogOpen(false)}
              className="border-[#2A3045] text-[#7A8099] hover:bg-[#252A3A] hover:text-[#E8EAF0]"
            >
              Cancel
            </Button>
            <Button
              onClick={submitResult}
              disabled={!resultType || loading === "result"}
              className={`${
                resultType === "won" 
                  ? "bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-semibold" 
                  : "bg-[#00FF87] hover:bg-[#00FF87]/90 text-black"
              }`}
            >
              {loading === "result" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
