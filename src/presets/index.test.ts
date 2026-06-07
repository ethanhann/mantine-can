import { describe, expect, it } from "vitest";
import { createGate } from "../engine/resolve";
import { can, feature, flag, role } from "../predicates";
import {
	createTierEntitle,
	type RbacPolicy,
	rbacAuthorize,
	type TierPolicy,
} from "./index";

describe("rbacAuthorize", () => {
	const policy: RbacPolicy = {
		roles: ["editor"],
		permissions: ["edit", "view"],
		flags: ["beta"],
	};

	it("passes a role the subject holds and denies one it lacks", () => {
		expect(
			rbacAuthorize(policy, { type: "role", anyOf: ["admin", "editor"] }),
		).toBe(true);
		expect(rbacAuthorize(policy, { type: "role", anyOf: ["admin"] })).toBe(
			false,
		);
	});

	it("passes a granted permission and denies a missing one", () => {
		expect(rbacAuthorize(policy, { type: "permission", action: "edit" })).toBe(
			true,
		);
		expect(
			rbacAuthorize(policy, { type: "permission", action: "delete" }),
		).toBe(false);
	});

	it("passes an enabled flag and denies others (including when flags is absent)", () => {
		expect(rbacAuthorize(policy, { type: "flag", name: "beta" })).toBe(true);
		expect(rbacAuthorize(policy, { type: "flag", name: "alpha" })).toBe(false);
		expect(
			rbacAuthorize(
				{ roles: [], permissions: [] },
				{ type: "flag", name: "beta" },
			),
		).toBe(false);
	});

	it("works end-to-end through the engine", () => {
		const gate = createGate({
			subject: { id: "u1" },
			policy,
			authorize: rbacAuthorize,
			entitle: () => ({ ok: true as const }),
		});
		expect(
			gate.resolve([role("editor"), can("edit"), flag("beta")]).allowed,
		).toBe(true);
		expect(gate.resolve([can("delete")])).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "delete" },
			remedy: { kind: "none" },
		});
	});
});

describe("createTierEntitle", () => {
	const entitle = createTierEntitle({
		tiers: ["free", "pro", "team"],
		features: { "pdf-export": "pro", sso: "team" },
	});

	it("entitles a feature at or above the required tier", () => {
		expect(entitle({ tier: "pro" }, "pdf-export")).toEqual({ ok: true });
		expect(entitle({ tier: "team" }, "pdf-export")).toEqual({ ok: true });
	});

	it("denies a feature below the required tier with required/current tiers", () => {
		expect(entitle({ tier: "free" }, "pdf-export")).toEqual({
			ok: false,
			requiredTier: "pro",
			currentTier: "free",
		});
		expect(entitle({ tier: "pro" }, "sso")).toEqual({
			ok: false,
			requiredTier: "team",
			currentTier: "pro",
		});
	});

	it("treats unlisted features as open to all", () => {
		expect(entitle({ tier: "free" }, "dashboards")).toEqual({ ok: true });
	});

	it("produces an upgrade remedy through the engine", () => {
		const policy: TierPolicy = { tier: "free" };
		const gate = createGate({
			subject: {},
			policy,
			authorize: () => true,
			entitle,
		});
		expect(gate.resolve([feature("pdf-export")])).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});
});
