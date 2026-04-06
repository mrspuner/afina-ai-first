"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { WorkflowNodeData, WorkflowNodeType } from "@/types/workflow";

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

export function WorkflowNodeComponent({ data }: NodeProps<WorkflowNodeData>) {
  const s = STYLES[data.nodeType] ?? STYLES.default;
  return (
    <div
      style={{
        border: `1px solid ${s.border}`,
        background: s.bg,
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 110,
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
        }}
      >
        {data.label}
      </div>
      {data.sublabel && (
        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
          {data.sublabel}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
