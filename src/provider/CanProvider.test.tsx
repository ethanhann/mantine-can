import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { can, feature } from "../predicates";
import { CanProvider } from "./CanProvider";
import { type CanContextValue, useCanContext } from "./context";

interface Policy {
	actions: string[];
	tier: string;
}

const authorize = (policy: Policy, req: { type: string; action?: string }) =>
	req.type === "permission" &&
	req.action !== undefined &&
	policy.actions.includes(req.action);

const entitle = (policy: Policy, _name: string) =>
	policy.tier === "pro"
		? { ok: true as const }
		: { ok: false as const, requiredTier: "pro", currentTier: policy.tier };

/** Render a CanProvider and capture the latest context value it exposes. */
function renderWithProvider(
	props: Partial<Parameters<typeof CanProvider<Policy, { id: string }>>[0]> & {
		policy: Policy;
	},
) {
	let latest: CanContextValue | undefined;
	function Probe(): ReactNode {
		latest = useCanContext();
		return null;
	}
	const defaults = {
		subject: { id: "u1" },
		authorize,
		entitle,
	};
	const { rerender } = render(
		<CanProvider {...defaults} {...props}>
			<Probe />
		</CanProvider>,
	);
	return {
		get ctx(): CanContextValue {
			if (!latest) {
				throw new Error("context not captured");
			}
			return latest;
		},
		rerender: (next: Partial<typeof props> & { policy: Policy }) =>
			rerender(
				<CanProvider {...defaults} {...props} {...next}>
					<Probe />
				</CanProvider>,
			),
	};
}

describe("CanProvider", () => {
	it("supplies a context whose resolve uses the interpreters", () => {
		const { ctx } = renderWithProvider({
			policy: { actions: ["export"], tier: "free" },
		});
		expect(ctx.resolve([can("export")])).toEqual({ allowed: true });
		expect(ctx.resolve([can("delete")])).toEqual({
			allowed: false,
			reason: { kind: "permission", action: "delete" },
			remedy: { kind: "none" },
		});
		expect(ctx.resolve([feature("pdf")])).toEqual({
			allowed: false,
			reason: { kind: "tier", required: "pro", current: "free" },
			remedy: { kind: "upgrade", toTier: "pro" },
		});
	});

	it("defaults status to ready and reflects an explicit loading status", () => {
		const ready = renderWithProvider({ policy: { actions: [], tier: "free" } });
		expect(ready.ctx.status).toBe("ready");

		const loading = renderWithProvider({
			policy: { actions: [], tier: "free" },
			status: "loading",
		});
		expect(loading.ctx.status).toBe("loading");
	});

	it("applies presentation fallbacks (hide default, badge upgrade variant)", () => {
		const { ctx } = renderWithProvider({
			policy: { actions: [], tier: "free" },
		});
		expect(ctx.presentation.default).toBe("hide");
		expect(ctx.presentation.upgrade.mode).toBe("badge");
	});

	it("honors presentation overrides", () => {
		const { ctx } = renderWithProvider({
			policy: { actions: [], tier: "free" },
			presentation: { default: "disable", upgrade: { mode: "teaser" } },
		});
		expect(ctx.presentation.default).toBe("disable");
		expect(ctx.presentation.upgrade.mode).toBe("teaser");
	});

	it("re-hydrates once on policy (tenant) swap and bumps the snapshot version", () => {
		const view = renderWithProvider({
			policy: { actions: ["export"], tier: "free" },
		});
		const v1 = view.ctx.snapshotVersion;
		expect(view.ctx.resolve([feature("pdf")]).allowed).toBe(false);

		view.rerender({ policy: { actions: ["export"], tier: "pro" } });
		expect(view.ctx.snapshotVersion).not.toBe(v1);
		expect(view.ctx.resolve([feature("pdf")])).toEqual({ allowed: true });
	});

	it("defaults onUpgrade to a no-op when not supplied", () => {
		const { ctx } = renderWithProvider({
			policy: { actions: [], tier: "free" },
		});
		expect(() =>
			ctx.onUpgrade({ kind: "tier", required: "pro", current: "free" }),
		).not.toThrow();
	});

	it("passes onUpgrade through", () => {
		const onUpgrade = vi.fn();
		const { ctx } = renderWithProvider({
			policy: { actions: [], tier: "free" },
			onUpgrade,
		});
		const reason = { kind: "tier", required: "pro", current: "free" } as const;
		ctx.onUpgrade(reason);
		expect(onUpgrade).toHaveBeenCalledWith(reason);
	});
});

describe("useCanContext", () => {
	it("throws a clear error when used outside a CanProvider", () => {
		function Orphan(): ReactNode {
			useCanContext();
			return null;
		}
		// Silence the expected React error boundary logging.
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Orphan />)).toThrow(/CanProvider/);
		spy.mockRestore();
	});
});
