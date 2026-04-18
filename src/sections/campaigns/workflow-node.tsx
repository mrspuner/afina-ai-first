"use client";

import { motion } from "motion/react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  SignalLow,
  GitFork,
  Clock,
  GitBranch,
  Merge,
  MessageSquare,
  Mail,
  Bell,
  Phone,
  Store,
  LayoutTemplate,
  CheckCircle2,
  CircleStop,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";

interface NodeStyle {
  border: string;
  bg: string;
  color: string;
}

const STYLES: Record<WorkflowNodeType, NodeStyle> = {
  // Endpoints
  signal:     { border: "#1e3a8a", bg: "#050815", color: "#93c5fd" },
  success:    { border: "#14532d", bg: "#030d06", color: "#4ade80" },
  end:        { border: "#374151", bg: "#0a0a0a", color: "#9ca3af" },
  // Logic
  split:      { border: "#4c1d95", bg: "#0d0819", color: "#a78bfa" },
  wait:       { border: "#713f12", bg: "#0f0a03", color: "#fbbf24" },
  condition:  { border: "#065f46", bg: "#052e23", color: "#34d399" },
  merge:      { border: "#3730a3", bg: "#0a0920", color: "#818cf8" },
  // Communication
  sms:        { border: "#134e4a", bg: "#030f0e", color: "#5eead4" },
  email:      { border: "#155e75", bg: "#03141a", color: "#67e8f9" },
  push:       { border: "#1e40af", bg: "#050c1e", color: "#93c5fd" },
  ivr:        { border: "#6d28d9", bg: "#0e051b", color: "#c4b5fd" },
  // Web
  storefront: { border: "#9a3412", bg: "#1a0806", color: "#fb923c" },
  landing:    { border: "#b45309", bg: "#1a0f03", color: "#fbbf24" },
  // Legacy
  default:    { border: "#2a2a2a", bg: "#111111", color: "#e5e5e5" },
  channel:    { border: "#134e4a", bg: "#030f0e", color: "#5eead4" },
  retarget:   { border: "#7f1d1d", bg: "#110505", color: "#f87171" },
  result:     { border: "#14532d", bg: "#030d06", color: "#4ade80" },
  new:        { border: "#78350f", bg: "#0f0a03", color: "#fbbf24" },
};

const ICON: Partial<Record<WorkflowNodeType, LucideIcon>> = {
  signal: SignalLow,
  split: GitFork,
  wait: Clock,
  condition: GitBranch,
  merge: Merge,
  sms: MessageSquare,
  email: Mail,
  push: Bell,
  ivr: Phone,
  storefront: Store,
  landing: LayoutTemplate,
  success: CheckCircle2,
  end: CircleStop,
};

const HANDLE_STYLE = {
  background: "#2a2a2a",
  border: "none",
  width: 8,
  height: 8,
};

export function WorkflowNodeComponent({ data, selected }: NodeProps<WorkflowNode>) {
  const s = STYLES[data.nodeType] ?? STYLES.default;
  const Icon = ICON[data.nodeType];
  const showReadyDot =
    !data.needsAttention && !data.processing && !data.justUpdated;

  const stateClass = [
    data.needsAttention ? "wf-node-needs-attention" : null,
    data.processing ? "wf-node-processing" : null,
    data.justUpdated ? "wf-node-just-updated" : null,
    selected ? "wf-node-selected" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className={stateClass}
      data-node-type={data.nodeType}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        position: "relative",
        border: `1px solid ${s.border}`,
        background: s.bg,
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 110,
        transition: "border-color 0.3s ease, background 0.3s ease",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 500,
          color: s.color,
          whiteSpace: "nowrap",
          lineHeight: "1.4",
          transition: "color 0.3s ease",
        }}
      >
        {Icon ? <Icon size={12} strokeWidth={2} /> : null}
        <span>{data.label}</span>
      </div>
      {data.sublabel && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
          {data.sublabel}
        </div>
      )}
      {showReadyDot && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#4ade80",
            opacity: 0.4,
          }}
        />
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </motion.div>
  );
}

// Shared CSS for node visual states — mounted once per WorkflowGraph.
export const WORKFLOW_NODE_STATE_CSS = `
  .wf-node-selected {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  .wf-node-needs-attention {
    border-color: #fb923c !important;
    animation: wf-needs-attention 1.4s ease-in-out infinite;
  }
  .wf-node-processing {
    animation: wf-processing 1.2s linear infinite;
    background-image: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.25) 50%, transparent 100%);
    background-size: 200% 100%;
  }
  .wf-node-just-updated {
    animation: wf-just-updated 1.2s ease-out;
  }
  @keyframes wf-needs-attention {
    0%,100% { box-shadow: 0 0 0 0 rgba(251,146,60,0.45); }
    50%     { box-shadow: 0 0 0 6px rgba(251,146,60,0);   }
  }
  @keyframes wf-processing {
    from { background-position: 0% 50%; }
    to   { background-position: 100% 50%; }
  }
  @keyframes wf-just-updated {
    0%   { box-shadow: 0 0 0 2px rgba(74,222,128,0.9); }
    100% { box-shadow: 0 0 0 2px rgba(74,222,128,0);   }
  }
`;
