/**
 * Human-readable copy derived from a decision. Kept separate and pure so the
 * renderers stay presentational and the strings are easy to test or override.
 */

import type { DenyReason, Remedy } from "../types/decision.js";

/** A short explanation of why access was denied, used in tooltips and cards. */
export function reasonText(reason: DenyReason): string {
	switch (reason.kind) {
		case "unauthenticated":
			return "Sign in to continue.";
		case "role":
			return `Requires role: ${reason.required.join(" or ")}.`;
		case "permission":
			return `You don't have permission to ${reason.action}.`;
		case "tier":
			return `Requires the ${reason.required} plan.`;
		case "flag":
			return "This feature isn't available.";
		case "quota":
			return `Limit reached (${reason.used}/${reason.limit}).`;
	}
}

/** The call-to-action label for a remedy, or `null` for a hard denial. */
export function ctaLabel(remedy: Remedy): string | null {
	switch (remedy.kind) {
		case "upgrade":
			return `Upgrade to ${remedy.toTier}`;
		case "requestAccess":
			return "Request access";
		case "signIn":
			return "Sign in";
		case "none":
			return null;
	}
}
