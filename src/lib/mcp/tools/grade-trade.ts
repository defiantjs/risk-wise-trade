import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const ASSET_DEFAULT_PIP: Record<string, number> = {
  forex: 10,
  gold: 1,
  indices: 1,
  crypto: 1,
  stocks: 1,
};

const UNIT_LABEL: Record<string, string> = {
  forex: "lots",
  gold: "oz",
  indices: "contracts",
  crypto: "units",
  stocks: "shares",
};

export default defineTool({
  name: "grade_trade_setup",
  title: "Grade a trade setup",
  description:
    "Validate a pre-trade plan. Given account balance, risk %, entry, stop, take profit, direction and asset type, returns dollar risk, reward, R:R, suggested position size, a verdict (valid/adjust/no) and a letter grade (A/B/C/Warning) with coaching notes.",
  inputSchema: {
    balance: z.number().positive().describe("Account balance in USD."),
    riskPct: z.number().positive().describe("Risk per trade as a percentage of balance (e.g. 1 for 1%)."),
    direction: z.enum(["buy", "sell"]).describe("Trade direction."),
    entry: z.number().positive().describe("Entry price."),
    stop: z.number().positive().describe("Stop-loss price."),
    takeProfit: z.number().positive().optional().describe("Take-profit price. Omit to get partial sizing only."),
    assetType: z
      .enum(["forex", "gold", "indices", "crypto", "stocks"])
      .default("forex")
      .describe("Asset class. Determines default pip/point value and size unit."),
    pipValue: z
      .number()
      .positive()
      .optional()
      .describe("Dollar value per 1.0 price move per 1 unit. Defaults per asset type: forex 10, others 1."),
    asset: z.string().optional().describe("Optional symbol/pair label, e.g. 'EURUSD', for context."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ balance, riskPct, direction, entry, stop, takeProfit, assetType, pipValue, asset }) => {
    const pv = pipValue ?? ASSET_DEFAULT_PIP[assetType];
    const unit = UNIT_LABEL[assetType];
    const stopDist = Math.abs(entry - stop);

    if (stopDist === 0) {
      return {
        content: [{ type: "text", text: "Stop-loss cannot equal entry." }],
        isError: true,
      };
    }

    const dollarRisk = (balance * riskPct) / 100;
    const suggestedSize = dollarRisk / (stopDist * pv);
    const moveToStopPct = (stopDist / entry) * 100;

    const targetDist = takeProfit != null ? Math.abs(takeProfit - entry) : null;
    const rr = targetDist != null ? targetDist / stopDist : null;
    const reward = rr != null ? dollarRisk * rr : null;
    const moveToTargetPct = targetDist != null ? (targetDist / entry) * 100 : null;

    const directionMismatch =
      takeProfit != null &&
      ((direction === "buy" && (stop >= entry || takeProfit <= entry)) ||
        (direction === "sell" && (stop <= entry || takeProfit >= entry)));

    const aggressiveRisk = riskPct > 2;
    const rrCmp = rr != null ? Math.round(rr * 100) / 100 : null;
    const riskCmp = Math.round(riskPct * 100) / 100;

    let grade: "A" | "B" | "C" | "Warning";
    if (rrCmp != null && rrCmp >= 3 && riskCmp <= 1) grade = "A";
    else if (rrCmp != null && rrCmp >= 2 && riskCmp <= 2) grade = "B";
    else if (rrCmp != null && rrCmp >= 1.5 && rrCmp < 2 && riskCmp <= 2) grade = "C";
    else grade = "Warning";

    let verdict: "valid" | "adjust" | "no";
    if (rrCmp != null && rrCmp >= 2 && riskCmp <= 2) verdict = "valid";
    else if (rrCmp != null && rrCmp >= 1.5 && rrCmp < 2 && riskCmp <= 2) verdict = "adjust";
    else verdict = "no";

    let coaching: string;
    if (rrCmp == null || rrCmp < 1.5)
      coaching = "Reward profile is weak. This setup may not justify the risk.";
    else if (rrCmp < 2)
      coaching = "Acceptable setup. Confirm structure, timing, and market context.";
    else
      coaching =
        "Strong reward profile. Still confirm market structure, DXY alignment, and news timing before entering.";

    const warnings: string[] = [];
    if (aggressiveRisk) warnings.push("Risk is aggressive. Consider reducing position size.");
    if (directionMismatch) warnings.push("Trade levels do not match selected direction.");

    const structured = {
      asset: asset ?? null,
      assetType,
      direction,
      verdict,
      grade,
      dollarRisk: round(dollarRisk, 2),
      reward: reward != null ? round(reward, 2) : null,
      rr: rrCmp,
      suggestedSize: round(suggestedSize, 4),
      sizeUnit: unit,
      moveToStopPct: round(moveToStopPct, 4),
      moveToTargetPct: moveToTargetPct != null ? round(moveToTargetPct, 4) : null,
      pipValue: pv,
      coaching,
      warnings,
    };

    const lines = [
      `${asset ? asset + " — " : ""}${direction.toUpperCase()} (${assetType})`,
      `Verdict: ${verdict.toUpperCase()}   Grade: ${grade}`,
      `Risk: $${structured.dollarRisk}   Reward: ${reward != null ? "$" + structured.reward : "—"}   R:R: ${rrCmp != null ? rrCmp.toFixed(2) + " : 1" : "—"}`,
      `Suggested size: ${structured.suggestedSize} ${unit}`,
      `Move to stop: ${structured.moveToStopPct}%${moveToTargetPct != null ? `   Move to target: ${structured.moveToTargetPct}%` : ""}`,
      `Coaching: ${coaching}`,
      ...(warnings.length ? ["Warnings: " + warnings.join(" | ")] : []),
    ];

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      structuredContent: structured,
    };
  },
});

function round(n: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
