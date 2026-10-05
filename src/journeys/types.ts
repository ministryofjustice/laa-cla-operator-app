import type { SessionData } from "express-session";
import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";

export type InboundCallContext = EffectFunctionContext<
  Record<string, unknown>,
  Record<string, unknown>,
  SessionData
>;
