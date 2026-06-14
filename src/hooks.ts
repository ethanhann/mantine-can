"use client";

/**
 * Hooks: the headless way to read a decision.
 *
 * `useGate` is the core; `useCan`/`useFeature` are sugar over it; `useSubject`
 * exposes the current subject and hydration status. All resolve synchronously
 * against the snapshot. Decisions are memoized per `(snapshotVersion, requirement
 * signature)`, including resource identity, so an N-rows by M-actions grid
 * re-renders without re-running `authorize`/`entitle`.
 */

import { useMemo, useRef } from "react";
import { assertNever } from "./assertNever.js";
import { can, feature } from "./predicates.js";
import {
	type CanContextValue,
	type PolicyStatus,
	useCanContext,
} from "./provider/context.js";
import type { ActionName, FeatureName } from "./registry.js";
import type { Decision } from "./types/decision.js";
import type { GateRequirement } from "./types/requirement.js";

/** Stable per-identity ids for resource objects, so the memo key tracks identity not value. */
let nextResourceId = 1;
const resourceIds = new WeakMap<object, number>();

function resourceKey(resource: unknown): string {
	if (resource === null || resource === undefined) {
		return String(resource);
	}
	if (typeof resource === "object" || typeof resource === "function") {
		let id = resourceIds.get(resource as object);
		if (id === undefined) {
			id = nextResourceId++;
			resourceIds.set(resource as object, id);
		}
		return `#${id}`;
	}
	// Tag primitives by type so the number 1 and the string "1" don't collide.
	return `=${typeof resource}:${String(resource)}`;
}

// User-supplied names/roles are JSON-encoded (quoted + escaped) so that a value
// containing a delimiter can't alias a different requirement shape — e.g. the
// role "a,b" must not key the same as the roles ["a", "b"].
function requirementKey(requirement: GateRequirement): string {
	switch (requirement.type) {
		case "authenticated":
			return "auth";
		case "role":
			return `role:${JSON.stringify(requirement.anyOf)}`;
		case "flag":
			return `flag:${JSON.stringify(requirement.name)}`;
		case "feature":
			return `feat:${JSON.stringify(requirement.name)}`;
		case "permission":
			return `perm:${JSON.stringify(requirement.action)}:${resourceKey(requirement.resource)}`;
		case "anyOf":
			return `any:${JSON.stringify(requirement.anyOf.map(requirementKey))}`;
		default:
			return assertNever(requirement);
	}
}

function signature(
	requirements: GateRequirement[],
	snapshotVersion: string | number,
): string {
	// Encode the whole thing structurally so per-key delimiters can't collide at
	// the join boundary either.
	return JSON.stringify([snapshotVersion, requirements.map(requirementKey)]);
}

/**
 * Resolve a requirement list against the current snapshot. Returns a stable
 * decision reference that only changes when the snapshot or the requirements
 * (by signature, including resource identity) change.
 */
export function useGate(requirements: GateRequirement[]): Decision {
	const { resolve, snapshotVersion } = useCanContext();
	const sig = signature(requirements, snapshotVersion);
	const cache = useRef<{
		sig: string;
		resolve: CanContextValue["resolve"];
		decision: Decision;
	} | null>(null);
	if (
		cache.current === null ||
		cache.current.sig !== sig ||
		cache.current.resolve !== resolve
	) {
		cache.current = { sig, resolve, decision: resolve(requirements) };
	}
	return cache.current.decision;
}

/** Authorization decision for `action` on an optional `resource`. */
export function useCan<R = unknown>(
	action: ActionName,
	resource?: R,
): Decision {
	return useGate([can(action, resource)]);
}

/** Entitlement decision for a named feature. */
export function useFeature(name: FeatureName): Decision {
	return useGate([feature(name)]);
}

/** The current subject and policy hydration status. */
export interface SubjectState<Subject = unknown> {
	subject: Subject | null;
	status: PolicyStatus;
}

/** Read the current subject and snapshot status. */
export function useSubject<Subject = unknown>(): SubjectState<Subject> {
	const { subject, status } = useCanContext();
	// Stable identity while subject/status are unchanged, so the result is safe to
	// use as an effect/memo dependency or behind React.memo.
	return useMemo(
		() => ({ subject: subject as Subject | null, status }),
		[subject, status],
	);
}
