import type { EffectFunctionContext } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { Session } from "express-session";

export enum CallerType {
  client = "client",
  thirdParty = "thirdParty",
}

export type InboundCallSession = Session & {
  callerType?: CallerType;
};

export type InboundCallContext = EffectFunctionContext<
  Record<string, unknown>,
  Record<string, unknown>,
  InboundCallSession
>;
