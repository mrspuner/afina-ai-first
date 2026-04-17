"use client";

import { useAppDispatch } from "@/state/app-state-context";
import { WelcomeView } from "./welcome-view";

export function WelcomeSection() {
  const dispatch = useAppDispatch();
  return <WelcomeView onStep1Click={() => dispatch({ type: "start_signal_flow" })} />;
}
