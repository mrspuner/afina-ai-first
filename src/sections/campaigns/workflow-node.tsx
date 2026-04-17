"use client";

import { motion } from "motion/react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";

const STYLES: Record<WorkflowNodeType, { border: string; bg: string; color: string }> = {
  default:  { border: "#2a2a2a", bg: "#111111", color: "#e5e5e5" },
  split:    { border: "#4c1d95", bg: "#0d0819", color: "#a78bfa" },
  channel:  { border: "#134e4a", bg: "#030f0e", color: "#5eead4" },
  retarget: { border: "#7f1d1d", bg: "#110505", color: "#f87171" },
  result:   { border: "#14532d", bg: "#030d06", color: "#4ade80" },
  new:      { border: "#78350f", bg: "#0f0a03", color: "#fbbf24" },
};

const HANDLE_STYLE = {
  background: "#2a2a2a",
  border: "none",
  width: 8,
  height: 8,
};

export function WorkflowNodeComponent({ data }: NodeProps<WorkflowNode>) {
  const s = STYLES[data.nodeType] ?? STYLES.default;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
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
          fontSize: 11,
          fontWeight: 500,
          color: s.color,
          whiteSpace: "nowrap",
          lineHeight: "1.4",
          transition: "color 0.3s ease",
        }}
      >
        {data.label}
      </div>
      {data.sublabel && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
          {data.sublabel}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </motion.div>
  );
}
