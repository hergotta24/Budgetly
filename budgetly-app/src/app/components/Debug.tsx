"use client";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export default function DebugState() {
  const state = useSelector((s: RootState) => s);
  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}
