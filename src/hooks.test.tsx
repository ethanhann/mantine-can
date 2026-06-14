import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCan, useFeature, useGate, useSubject } from "./hooks";
import { anyOf, can, feature, role } from "./predicates";
import { CanProvider } from "./provider/CanProvider";
import type { PolicyStatus } from "./provider/context";

interface Policy {
	actions: string[];
	tier: string;
}

interface Options {
	policy?: Policy;
	subject?: { id: string } | null;
	status?: PolicyStatus;
	authorize?: (
		policy: Policy,
		req: { type: string; action?: string },
	) => boolean;
}

function makeWrapper(options: Options = {}) {
	const policy = options.policy ?? { actions: ["export"], tier: "free" };
	const subject =
		options.subject === undefined ? { id: "u1" } : options.subject;
	const authorize =
		options.authorize ??
		((p: Policy, req: { type: string; action?: string }) =>
			req.type === "permission" &&
			req.action !== undefined &&
			p.actions.includes(req.action));
	const entitle = (p: Policy) =>
		p.tier === "pro"
			? { ok: true as const }
			: { ok: false as const, requiredTier: "pro", currentTier: p.tier };

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<CanProvider
				subject={subject}
				policy={policy}
				status={options.status ?? "ready"}
				authorize={authorize}
				entitle={entitle}
			>
				{children}
			</CanProvider>
		);
	};
}

describe("useSubject", () => {
	it("returns the subject and status", () => {
		const { result } = renderHook(() => useSubject<{ id: string }>(), {
			wrapper: makeWrapper({ status: "loading" }),
		});
		expect(result.current.subject).toEqual({ id: "u1" });
		expect(result.current.status).toBe("loading");
	});

	it("returns null subject when unauthenticated", () => {
		const { result } = renderHook(() => useSubject(), {
			wrapper: makeWrapper({ subject: null }),
		});
		expect(result.current.subject).toBeNull();
	});

	it("returns a stable reference across re-renders when subject/status are unchanged", () => {
		const { result, rerender } = renderHook(
			() => useSubject<{ id: string }>(),
			{
				wrapper: makeWrapper(),
			},
		);
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});
});

describe("useCan", () => {
	it("allows an authorized action", () => {
		const { result } = renderHook(() => useCan("export"), {
			wrapper: makeWrapper(),
		});
		expect(result.current).toEqual({ allowed: true });
	});

	it("denies an unauthorized action with a hard remedy", () => {
		const { result } = renderHook(() => useCan("delete"), {
			wrapper: makeWrapper(),
		});
		expect(result.current).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "delete" },
			remedy: { kind: "none" },
		});
	});

	it("carries the resource into the denial", () => {
		const invoice = { id: 9 };
		const { result } = renderHook(() => useCan("delete", invoice), {
			wrapper: makeWrapper(),
		});
		expect(result.current).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "delete", resource: invoice },
			remedy: { kind: "none" },
		});
	});
});

describe("useFeature", () => {
	it("denies a too-low tier with an upgrade remedy", () => {
		const { result } = renderHook(() => useFeature("pdf"), {
			wrapper: makeWrapper(),
		});
		expect(result.current).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("allows an entitled feature", () => {
		const { result } = renderHook(() => useFeature("pdf"), {
			wrapper: makeWrapper({ policy: { actions: [], tier: "pro" } }),
		});
		expect(result.current).toEqual({ allowed: true });
	});
});

describe("useGate", () => {
	it("combines requirements authz-first (hard authz denial beats upgrade)", () => {
		// not authorized to export AND not entitled → hide (permission), not upsell
		const { result } = renderHook(
			() => useGate([can("publish"), feature("pdf")]),
			{ wrapper: makeWrapper() },
		);
		expect(result.current).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "publish" },
			remedy: { kind: "none" },
		});
	});

	it("resolves an anyOf group", () => {
		// authorized to export OR pro → export authorized → allowed
		const { result } = renderHook(
			() => useGate([anyOf([can("export"), feature("pdf")])]),
			{ wrapper: makeWrapper() },
		);
		expect(result.current).toEqual({ allowed: true });
	});

	it("surfaces an upgrade from a failed anyOf group", () => {
		const { result } = renderHook(
			() => useGate([anyOf([role("admin"), feature("pdf")])]),
			{ wrapper: makeWrapper() },
		);
		expect(result.current).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});
});

describe("memoization", () => {
	it("returns a stable decision and does not re-run authorize on re-render", () => {
		const authorize = vi.fn(
			(_p: Policy, req: { type: string; action?: string }) =>
				req.type === "permission" && req.action === "export",
		);
		const invoice = { id: 1 };
		const { result, rerender } = renderHook(() => useCan("export", invoice), {
			wrapper: makeWrapper({ authorize }),
		});

		const first = result.current;
		expect(authorize).toHaveBeenCalledTimes(1);

		rerender();
		rerender();
		expect(result.current).toBe(first); // same reference
		expect(authorize).toHaveBeenCalledTimes(1); // not re-evaluated
	});

	it("does not collide memo keys when a role name contains the delimiter", () => {
		// authorize allows only a two-element role list.
		const authorize = vi.fn(
			(_p: Policy, req: { type: string; action?: string }) =>
				req.type === "role" &&
				(req as unknown as { anyOf: string[] }).anyOf.length === 2,
		);
		let roles = ["a", "b"]; // → role:["a","b"]
		const { result, rerender } = renderHook(() => useGate([role(...roles)]), {
			wrapper: makeWrapper({ authorize }),
		});
		expect(result.current.allowed).toBe(true);

		// Single role "a,b" — would share the old `role:a,b` key and wrongly hit the
		// cached "allowed" decision. With encoded keys it re-evaluates and denies.
		roles = ["a,b"];
		rerender();
		expect(result.current.allowed).toBe(false);
	});

	it("re-evaluates when the resource identity changes", () => {
		const authorize = vi.fn(
			(_p: Policy, req: { type: string; action?: string }) =>
				req.type === "permission" && req.action === "export",
		);
		let resource = { id: 1 };
		const { result, rerender } = renderHook(() => useCan("export", resource), {
			wrapper: makeWrapper({ authorize }),
		});
		expect(authorize).toHaveBeenCalledTimes(1);
		const first = result.current;

		resource = { id: 2 }; // new identity
		rerender();
		expect(authorize).toHaveBeenCalledTimes(2);
		expect(result.current).not.toBe(first);
	});
});
