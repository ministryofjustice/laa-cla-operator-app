import type { EffectFunctionContext } from '@ministryofjustice/hmpps-forge/core/authoring'
import type { Session } from 'express-session'

export type InboundCallSession = Session & {
  callerType?: string;
}

export type InboundCallContext = EffectFunctionContext<
  Record<string, unknown>,
  Record<string, unknown>,
  InboundCallSession
>
