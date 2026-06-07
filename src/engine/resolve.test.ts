import { describe, expect, it } from "vitest";
import { anyOf, authenticated, can, feature, flag, role } from "../predicates";
import type { GateRequirement } from "../types/requirement";
import { createGate, resolve } from "./resolve";
import type { Authorize, Entitle, ResolveContext } from "./types";

/** Build a context with overridable interpreters; everything denies by default. */
function ctx(overrides: Partial<ResolveContext> = {}): ResolveContext {
	const authorize: Authorize = () => false;
	const entitle: Entitle = () => ({
		ok: false,
		requiredTier: "pro",
		currentTier: "free",
	});
	return {
		subject: { id: "u1" },
		policy: {},
		authorize,
		entitle,
		...overrides,
	};
}

describe("atomic requirements", () => {
	it("authenticated: allows when subject present", () => {
		expect(resolve([authenticated()], ctx({ subject: { id: "u1" } }))).toEqual({
			allowed: true,
		});
	});

	it("authenticated: denies with signIn when subject is null", () => {
		expect(resolve([authenticated()], ctx({ subject: null }))).toEqual({
			allowed: false,
			reason: { kind: "unauthenticated" },
			remedy: { kind: "signIn" },
		});
	});

	it("role: allows/denies via authorize, hard remedy on deny", () => {
		expect(resolve([role("admin")], ctx({ authorize: () => true }))).toEqual({
			allowed: true,
		});
		expect(
			resolve([role("admin", "owner")], ctx({ authorize: () => false })),
		).toEqual({
			allowed: false,
			reason: { kind: "role", required: ["admin", "owner"] },
			remedy: { kind: "none" },
		});
	});

	it("flag: denies hard", () => {
		expect(resolve([flag("beta")], ctx({ authorize: () => false }))).toEqual({
			allowed: false,
			reason: { kind: "flag", name: "beta" },
			remedy: { kind: "none" },
		});
	});

	it("permission: passes the requirement to authorize and omits resource when absent", () => {
		const seen: unknown[] = [];
		const authorize: Authorize = (_p, req) => {
			seen.push(req);
			return false;
		};
		expect(resolve([can("export")], ctx({ authorize }))).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "export" },
			remedy: { kind: "none" },
		});
		expect(seen[0]).toEqual({ type: "permission", action: "export" });
	});

	it("permission: carries the resource into the reason", () => {
		const invoice = { id: 7 };
		expect(
			resolve([can("delete", invoice)], ctx({ authorize: () => false })),
		).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "delete", resource: invoice },
			remedy: { kind: "none" },
		});
	});

	it("feature: tier failure carries an upgrade remedy", () => {
		expect(
			resolve(
				[feature("pdf")],
				ctx({
					entitle: () => ({
						ok: false,
						requiredTier: "pro",
						currentTier: "free",
					}),
				}),
			),
		).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("feature: allows when entitled", () => {
		expect(
			resolve([feature("pdf")], ctx({ entitle: () => ({ ok: true }) })),
		).toEqual({ allowed: true });
	});
});

describe("quota path", () => {
	it("maps a quota failure with requiredTier to an upgrade remedy", () => {
		const entitle: Entitle = () => ({
			ok: false,
			kind: "quota",
			name: "seats",
			limit: 5,
			used: 5,
			requiredTier: "team",
		});
		expect(resolve([feature("seats")], ctx({ entitle }))).toEqual({
			allowed: false,
			reason: { kind: "quota", name: "seats", limit: 5, used: 5 },
			remedy: { kind: "upgrade", toTier: "team" },
		});
	});

	it("maps a quota failure without requiredTier to a hard remedy", () => {
		const entitle: Entitle = () => ({
			ok: false,
			kind: "quota",
			name: "seats",
			limit: 5,
			used: 5,
		});
		expect(resolve([feature("seats")], ctx({ entitle }))).toEqual({
			allowed: false,
			reason: { kind: "quota", name: "seats", limit: 5, used: 5 },
			remedy: { kind: "none" },
		});
	});
});

describe("AND precedence (authz-first)", () => {
	it("returns the unauthenticated denial before any authz/entitlement failure", () => {
		const requirements: GateRequirement[] = [
			feature("pdf"),
			can("export"),
			authenticated(),
		];
		expect(
			resolve(requirements, ctx({ subject: null, authorize: () => false })),
		).toEqual({
			allowed: false,
			reason: { kind: "unauthenticated" },
			remedy: { kind: "signIn" },
		});
	});

	it("a hard authorization denial wins over an entitlement upgrade (never upsell the unauthorized)", () => {
		// authorized? no. entitled? no. Expect the permission denial (hide), not the upgrade.
		const decision = resolve(
			[feature("pdf"), can("export")],
			ctx({ authorize: () => false }),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "export" },
			remedy: { kind: "none" },
		});
	});

	it("surfaces the entitlement upgrade once authorization passes", () => {
		const decision = resolve(
			[can("export"), feature("pdf")],
			ctx({
				authorize: () => true,
				entitle: () => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				}),
			}),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("allows when every requirement passes", () => {
		expect(
			resolve(
				[can("export"), feature("pdf")],
				ctx({ authorize: () => true, entitle: () => ({ ok: true }) }),
			),
		).toEqual({ allowed: true });
	});

	it("allows the empty requirement list", () => {
		expect(resolve([], ctx())).toEqual({ allowed: true });
	});
});

describe("anyOf (OR) resolution", () => {
	it("passes when any branch passes", () => {
		// admin? no. pro? yes → group passes.
		const decision = resolve(
			[anyOf([role("admin"), feature("pro")])],
			ctx({ authorize: () => false, entitle: () => ({ ok: true }) }),
		);
		expect(decision).toEqual({ allowed: true });
	});

	it("when all branches fail, surfaces the most actionable remedy (upgrade beats hard role)", () => {
		const decision = resolve(
			[anyOf([role("admin"), feature("pro")])],
			ctx({
				authorize: () => false,
				entitle: () => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				}),
			}),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("falls back to a hard denial when every branch is a hard authz failure", () => {
		const decision = resolve(
			[anyOf([role("admin"), role("owner")])],
			ctx({ authorize: () => false }),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "role", required: ["admin"] },
			remedy: { kind: "none" },
		});
	});

	it("an empty anyOf imposes no constraint and is allowed", () => {
		expect(resolve([anyOf([])], ctx())).toEqual({ allowed: true });
	});
});

describe("anyOf within an AND (precedence inversion)", () => {
	it("a sibling hard authz denial still hides, even when the group would upsell", () => {
		// can(edit) fails (hard) → hide; the anyOf upgrade must not win.
		const decision = resolve(
			[can("edit"), anyOf([role("admin"), feature("pro")])],
			ctx({
				authorize: () => false,
				entitle: () => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				}),
			}),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "edit" },
			remedy: { kind: "none" },
		});
	});

	it("a group that resolves hard beats a sibling entitlement upgrade", () => {
		// feature(x) → upgrade (rank 2); anyOf of roles → hard (rank 1) wins → hide.
		const decision = resolve(
			[feature("x"), anyOf([role("admin"), role("owner")])],
			ctx({
				authorize: () => false,
				entitle: () => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				}),
			}),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "role", required: ["admin"] },
			remedy: { kind: "none" },
		});
	});

	it("surfaces the group's upgrade once the authorized branch passes the AND", () => {
		const decision = resolve(
			[can("edit"), anyOf([role("admin"), feature("pro")])],
			ctx({
				// authorized to edit, but neither admin nor pro
				authorize: (_p, req) => req.type === "permission",
				entitle: () => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				}),
			}),
		);
		expect(decision).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});
});

describe("createGate", () => {
	it("binds a context and resolves against it", () => {
		const gate = createGate(
			ctx({ authorize: () => true, entitle: () => ({ ok: true }) }),
		);
		expect(gate.resolve([can("export"), feature("pdf")])).toEqual({
			allowed: true,
		});
	});
});
