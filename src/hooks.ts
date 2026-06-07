/**
 * Hooks: the headless way to read a decision.
 *
 * `useGate` is the core; `useCan`/`useFeature` are sugar over it; `useSubject`
 * exposes the current subject and hydration status. All resolve synchronously
 * against the snapshot. Decisions are memoized per `(snapshotVersion, requirement
 * signature)`, including resource identity, so an N-rows by M-actions grid
 * re-renders without re-running `authorize`/`entitle`.
 */

import { useRef } from "react";
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
	return `=${String(resource)}`;
}

function requirementKey(requirement: GateRequirement): string {
	switch (requirement.type) {
		case "authenticated":
			return "auth";
		case "role":
			return `role:${requirement.anyOf.join(",")}`;
		case "flag":
			return `flag:${requirement.name}`;
		case "feature":
			return `feat:${requirement.name}`;
		case "permission":
			return `perm:${requirement.action}:${resourceKey(requirement.resource)}`;
		case "anyOf":
			return `any(${requirement.anyOf.map(requirementKey).join("|")})`;
	}
}

function signature(
	requirements: GateRequirement[],
	snapshotVersion: string | number,
): string {
	return `${snapshotVersion}|${requirements.map(requirementKey).join(";")}`;
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
	return { subject: subject as Subject | null, status };
}
