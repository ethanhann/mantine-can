import { describe, expect, it } from "vitest";
import {
	allow,
	type Decision,
	type DenyReason,
	deny,
	type Remedy,
} from "./decision";

/** Compile-time exhaustiveness guard: the call only typechecks if `x` is `never`. */
function assertNever(x: never): never {
	throw new Error(`unexpected variant: ${JSON.stringify(x)}`);
}

/** Exhaustive over every DenyReason kind. Adding a kind without a case fails to compile. */
function describeReason(reason: DenyReason): string {
	switch (reason.kind) {
		case "unauthenticated":
			return "unauthenticated";
		case "role":
			return `role:${reason.required.join(",")}`;
		case "permission":
			return `permission:${reason.action}`;
		case "tier":
			return `tier:${reason.current}->${reason.required}`;
		case "flag":
			return `flag:${reason.name}`;
		case "quota":
			return `quota:${reason.name}:${reason.used}/${reason.limit}`;
		default:
			return assertNever(reason);
	}
}

/** Exhaustive over every Remedy kind. */
function describeRemedy(remedy: Remedy): string {
	switch (remedy.kind) {
		case "none":
			return "none";
		case "upgrade":
			return `upgrade:${remedy.toTier}`;
		case "requestAccess":
			return "requestAccess";
		case "signIn":
			return "signIn";
		default:
			return assertNever(remedy);
	}
}

describe("allow / deny constructors", () => {
	it("allow() produces an allowed decision", () => {
		expect(allow()).toEqual({ allowed: true });
	});

	it("deny() carries the reason and remedy", () => {
		const decision = deny(
			{ kind: "tier", required: "pro", current: "free" },
			{ kind: "upgrade", toTier: "pro" },
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("narrows on the `allowed` discriminant", () => {
		const decision: Decision = deny(
			{ kind: "flag", name: "beta" },
			{ kind: "none" },
		);
		if (decision.allowed) {
			throw new Error("expected denial");
		}
		// inside this branch reason/remedy are accessible without a cast
		expect(describeReason(decision.reason)).toBe("flag:beta");
		expect(describeRemedy(decision.remedy)).toBe("none");
	});
});

describe("DenyReason exhaustiveness", () => {
	it("describes every reason kind", () => {
		const reasons: DenyReason[] = [
			{ kind: "unauthenticated" },
			{ kind: "role", required: ["admin", "owner"] },
			{ kind: "permission", action: "delete", resource: { id: 1 } },
			{ kind: "tier", required: "pro", current: "free" },
			{ kind: "flag", name: "beta" },
			{ kind: "quota", name: "seats", limit: 5, used: 5 },
		];
		expect(reasons.map(describeReason)).toEqual([
			"unauthenticated",
			"role:admin,owner",
			"permission:delete",
			"tier:free->pro",
			"flag:beta",
			"quota:seats:5/5",
		]);
	});
});

describe("Remedy exhaustiveness", () => {
	it("describes every remedy kind", () => {
		const remedies: Remedy[] = [
			{ kind: "none" },
			{ kind: "upgrade", toTier: "pro" },
			{ kind: "requestAccess" },
			{ kind: "signIn" },
		];
		expect(remedies.map(describeRemedy)).toEqual([
			"none",
			"upgrade:pro",
			"requestAccess",
			"signIn",
		]);
	});
});
