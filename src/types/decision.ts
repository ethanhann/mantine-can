/**
 * The decision model.
 *
 * A gate returns a {@link Decision}, never a bare boolean. A denial carries
 * why ({@link DenyReason}) and what to do about it ({@link Remedy}). This lets a
 * single presentation layer render hide / disable / upgrade as a pure function
 * of the decision.
 */

/**
 * Why a gate denied. The `reason` selects the default presentation:
 * `role` / `permission` / `flag` are hard denials (hide/disable), while
 * `tier` and (often) `quota` carry an upgrade affordance.
 */
export type DenyReason =
	| { kind: "unauthenticated" }
	| { kind: "role"; required: string[] }
	| { kind: "permission"; action: string; resource?: unknown }
	| { kind: "tier"; required: string; current: string }
	| { kind: "flag"; name: string }
	| { kind: "quota"; name: string; limit: number; used: number };

/**
 * The available call-to-action for a denial. The `remedy` selects the CTA
 * surfaced to the subject; `none` is a hard deny with no path forward in the UI.
 */
export type Remedy =
	| { kind: "none" } // hard deny → hide/disable
	| { kind: "upgrade"; toTier: string } // → upgrade prompt
	| { kind: "requestAccess" } // → request-access affordance
	| { kind: "signIn" }; // → redirect to sign-in

/**
 * The result of evaluating one or more requirements against the policy snapshot.
 * Either allowed, or denied with a reason and a remedy.
 */
export type Decision =
	| { allowed: true }
	| { allowed: false; reason: DenyReason; remedy: Remedy };

/** A denial decision, narrowed from {@link Decision} for ergonomic engine code. */
export type Denied = Extract<Decision, { allowed: false }>;

/** Construct an allow decision. */
export function allow(): Decision {
	return { allowed: true };
}

/** Construct a deny decision from a reason and remedy. */
export function deny(reason: DenyReason, remedy: Remedy): Decision {
	return { allowed: false, reason, remedy };
}
