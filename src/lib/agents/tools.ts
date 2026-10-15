import { erebusOrders, runPlannerLine, type PlannerAct } from "@/components/dash/erebus-abilities";
import type { Memory } from "@/components/dash/memory";

export type ToolResult = PlannerAct;

export async function runTool(data: Memory, line: string): Promise<ToolResult> {
  return runPlannerLine(data, line);
}

export function toolList() {
  return erebusOrders();
}
