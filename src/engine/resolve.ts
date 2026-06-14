/**
 * The decision engine: resolves requirements against the snapshot.
 *
 * AND semantics with authz-first precedence:
 *
 *     authenticated  →  role / permission / flag  →  feature
 *
 * When several requirements in an AND list fail, the engine returns the single
 * most appropriate denial: a sign-in need first, then a hard authorization denial
 * (hide beats upsell, since you can never upgrade your way into a missing role),
 * then an entitlement denial (upgrade). `anyOf` inverts this within a group: the
 * group fails only when every branch fails, and the most actionable remedy wins.
 */

import { assertNever } from "../assertNever.js";
import {
	allow,
	type Decision,
	type Denied,
	deny,
	type Remedy,
} from "../types/decision.js";
import type {
	AnyOfRequirement,
	GateRequirement,
	Requirement,
} from "../types/requirement.js";
import type { ResolveContext } from "./types.js";

/** Resolve a single atomic requirement to a decision. */
function evaluate(requirement: Requirement, context: ResolveContext): Decision {
	switch (requirement.type) {
		case "authenticated":
			return context.subject != null
				? allow()
				: deny({ kind: "unauthenticated" }, { kind: "signIn" });

		case "role":
			return context.authorize(context.policy, requirement)
				? allow()
				: deny({ kind: "role", required: requirement.anyOf }, { kind: "none" });

		case "flag":
			return context.authorize(context.policy, requirement)
				? allow()
				: deny({ kind: "flag", name: requirement.name }, { kind: "none" });

		case "permission": {
			if (context.authorize(context.policy, requirement)) {
				return allow();
			}
			// Preserve the absence of a resource (don't fabricate `resource: undefined`).
			return deny(
				requirement.resource === undefined
					? { kind: "permission", action: requirement.action }
					: {
							kind: "permission",
							action: requirement.action,
							resource: requirement.resource,
						},
				{ kind: "none" },
			);
		}

		case "feature": {
			const result = context.entitle(context.policy, requirement.name);
			if (result.ok) {
				return allow();
			}
			if (result.kind === "quota") {
				const remedy: Remedy =
					result.requiredTier === undefined
						? { kind: "none" }
						: { kind: "upgrade", toTier: result.requiredTier };
				return deny(
					{
						kind: "quota",
						name: result.name,
						limit: result.limit,
						used: result.used,
					},
					remedy,
				);
			}
			return deny(
				{
					kind: "tier",
					required: result.requiredTier,
					current: result.currentTier,
				},
				{ kind: "upgrade", toTier: result.requiredTier },
			);
		}

		default:
			// A non-Requirement reached evaluate (e.g. a JS consumer, or a nested
			// anyOf, which the types forbid). Fail loudly instead of returning undefined.
			return assertNever(requirement);
	}
}

/**
 * How actionable a remedy is. `anyOf` surfaces the most actionable denial, since
 * any branch would have granted access. Higher wins.
 */
function actionability(remedy: Remedy): number {
	switch (remedy.kind) {
		case "upgrade":
			return 2;
		case "signIn":
			return 1;
		case "none":
			return 0;
	}
}

/**
 * Resolve an OR group. Passes if any branch passes; when all fail, surfaces the
 * most actionable denial (first branch wins ties). An empty group imposes no
 * constraint and is allowed.
 */
function evaluateAnyOf(
	group: AnyOfRequirement,
	context: ResolveContext,
): Decision {
	let best: Denied | null = null;
	for (const branch of group.anyOf) {
		const decision = evaluate(branch, context);
		if (decision.allowed) {
			return allow();
		}
		if (
			best === null ||
			actionability(decision.remedy) > actionability(best.remedy)
		) {
			best = decision;
		}
	}
	return best ?? allow();
}

/**
 * Precedence rank for choosing among AND-list failures (lower wins, ties broken
 * by array order): a sign-in need, then a hard authz denial, then everything
 * actionable (upgrade). This keeps "hide beats upsell" correct.
 */
function andRank(decision: Denied): number {
	if (decision.reason.kind === "unauthenticated") {
		return 0;
	}
	if (decision.remedy.kind === "none") {
		return 1;
	}
	return 2;
}

/**
 * Resolve a gate's requirement list (AND). Returns `allow` if every requirement
 * passes, otherwise the single most appropriate denial per the precedence above.
 */
export function resolve(
	requirements: GateRequirement[],
	context: ResolveContext,
): Decision {
	let best: Denied | null = null;
	let bestRank = Number.POSITIVE_INFINITY;
	for (const requirement of requirements) {
		const decision =
			requirement.type === "anyOf"
				? evaluateAnyOf(requirement, context)
				: evaluate(requirement, context);
		if (decision.allowed) {
			continue;
		}
		const rank = andRank(decision);
		if (rank < bestRank) {
			bestRank = rank;
			best = decision;
		}
	}
	return best ?? allow();
}

/**
 * Bind the engine to a context. The returned `resolve` is the natural
 * memoization boundary: recreate the gate when the snapshot changes
 * (`snapshotVersion`), and decisions stay stable in between.
 */
export function createGate<Policy, Subject>(
	context: ResolveContext<Policy, Subject>,
) {
	return {
		resolve: (requirements: GateRequirement[]): Decision =>
			resolve(requirements, context as ResolveContext),
	};
}
