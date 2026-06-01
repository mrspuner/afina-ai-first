"use client";

import { createContext, useContext } from "react";

/**
 * True when the workflow canvas is opened for a launched/paused/completed
 * campaign. In that mode nodes can still be selected and expanded so the user
 * can inspect the сценарий, but their fields are non-interactive — no inline
 * edit, no AI hand-off. xyflow renders node components outside the normal
 * render tree, so this travels via context (set once around the graph) rather
 * than props threaded through node `data`.
 */
const WorkflowReadOnlyContext = createContext(false);

export const WorkflowReadOnlyProvider = WorkflowReadOnlyContext.Provider;

export function useWorkflowReadOnly(): boolean {
  return useContext(WorkflowReadOnlyContext);
}
