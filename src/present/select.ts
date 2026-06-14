/**
 * The presentation selector: `presentation = f(decision, mode)`.
 *
 * Given a decision and the requested mode, decides what to render. The one
 * non-trivial rule: an `upgrade` mode only applies when the denial's remedy is
 * `upgrade`. A hard denial cannot be upsold, so it falls back to `hide`, which
 * avoids revealing a hard-denied thing as an upsell.
 */

import { assertNever } from "../assertNever.js";
import type { Decision, Denied } from "../types/decision.js";
import type {
	PresentationMode,
	ResolvedPresentation,
	UpgradeVariant,
} from "../types/presentation.js";

/** What the renderer should actually do, derived from the decision + mode. */
export type EffectivePresentation =
	| { kind: "allow" }
	| { kind: "hide" }
	| { kind: "disable"; decision: Denied }
	| { kind: "upgrade"; decision: Denied; variant: UpgradeVariant }
	| { kind: "redirect"; decision: Denied };

export function selectPresentation(
	decision: Decision,
	mode: PresentationMode,
	presentation: ResolvedPresentation,
	variantOverride?: UpgradeVariant,
): EffectivePresentation {
	if (decision.allowed) {
		return { kind: "allow" };
	}
	switch (mode) {
		case "hide":
			return { kind: "hide" };
		case "disable":
			return { kind: "disable", decision };
		case "redirect":
			return { kind: "redirect", decision };
		case "upgrade":
			return decision.remedy.kind === "upgrade"
				? {
						kind: "upgrade",
						decision,
						variant: variantOverride ?? presentation.upgrade.mode,
					}
				: { kind: "hide" };
		default:
			return assertNever(mode);
	}
}
