import { defineMcp } from "@lovable.dev/mcp-js";
import gradeTradeTool from "./tools/grade-trade";

export default defineMcp({
  name: "pipgrade-mcp",
  title: "PipGrade",
  version: "0.1.0",
  instructions:
    "PipGrade validates pre-trade setups. Use `grade_trade_setup` to compute dollar risk, R:R, suggested position size, and a verdict/grade for a proposed trade.",
  tools: [gradeTradeTool],
});
