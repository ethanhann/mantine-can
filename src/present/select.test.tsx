import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CanProvider } from "../provider/CanProvider";
import type { PolicyStatus } from "../provider/context";
import type { Decision, Denied, DenyReason } from "../types/decision";
import type {
	PendingSlotProps,
	PresentationConfig,
	PresentationMode,
	UpgradeVariant,
} from "../types/presentation";
import { Presentation } from "./Presentation";
import { selectPresentation } from "./select";
import { ctaLabel, reasonText } from "./text";

const allowed: Decision = { allowed: true };
const hardDeny: Denied = {
	allowed: false,
	reason: { kind: "permission", action: "delete" },
	remedy: { kind: "none" },
};
const upgradeDeny: Denied = {
	allowed: false,
	reason: { kind: "tier", required: "pro", current: "free" },
	remedy: { kind: "upgrade", toTier: "pro" },
};
const RESOLVED = {
	default: "hide" as PresentationMode,
	upgrade: { mode: "badge" as UpgradeVariant },
};

interface WrapOptions {
	status?: PolicyStatus;
	presentation?: PresentationConfig;
	onUpgrade?: (reason: DenyReason) => void;
}

function wrap(ui: ReactNode, options: WrapOptions = {}) {
	const extra: {
		presentation?: PresentationConfig;
		onUpgrade?: (reason: DenyReason) => void;
	} = {};
	if (options.presentation) {
		extra.presentation = options.presentation;
	}
	if (options.onUpgrade) {
		extra.onUpgrade = options.onUpgrade;
	}
	return render(
		<MantineProvider>
			<CanProvider
				subject={{}}
				policy={{}}
				authorize={() => false}
				entitle={() => ({
					ok: false,
					requiredTier: "pro",
					currentTier: "free",
				})}
				status={options.status ?? "ready"}
				{...extra}
			>
				{ui}
			</CanProvider>
		</MantineProvider>,
	);
}

describe("selectPresentation", () => {
	it("returns allow for an allowed decision regardless of mode", () => {
		expect(selectPresentation(allowed, "upgrade", RESOLVED)).toEqual({
			kind: "allow",
		});
	});

	it("maps modes for a denial", () => {
		expect(selectPresentation(hardDeny, "hide", RESOLVED)).toEqual({
			kind: "hide",
		});
		expect(selectPresentation(hardDeny, "disable", RESOLVED)).toEqual({
			kind: "disable",
			decision: hardDeny,
		});
		expect(selectPresentation(hardDeny, "redirect", RESOLVED)).toEqual({
			kind: "redirect",
			decision: hardDeny,
		});
	});

	it("renders upgrade only when the remedy is upgrade; hard denials fall back to hide", () => {
		expect(selectPresentation(upgradeDeny, "upgrade", RESOLVED)).toEqual({
			kind: "upgrade",
			decision: upgradeDeny,
			variant: "badge",
		});
		expect(selectPresentation(hardDeny, "upgrade", RESOLVED)).toEqual({
			kind: "hide",
		});
	});

	it("throws on an unknown mode (exhaustiveness guard)", () => {
		expect(() =>
			selectPresentation(hardDeny, "bogus" as PresentationMode, RESOLVED),
		).toThrow(/unexpected variant/);
	});

	it("honors a per-gate variant override", () => {
		expect(
			selectPresentation(upgradeDeny, "upgrade", RESOLVED, "teaser"),
		).toEqual({
			kind: "upgrade",
			decision: upgradeDeny,
			variant: "teaser",
		});
	});
});

describe("text helpers", () => {
	it("describes each reason", () => {
		expect(reasonText({ kind: "unauthenticated" })).toMatch(/sign in/i);
		expect(reasonText({ kind: "role", required: ["admin", "owner"] })).toMatch(
			/admin or owner/,
		);
		expect(reasonText({ kind: "permission", action: "delete" })).toMatch(
			/delete/,
		);
		expect(
			reasonText({ kind: "tier", required: "pro", current: "free" }),
		).toMatch(/pro plan/);
		expect(
			reasonText({ kind: "quota", name: "seats", limit: 5, used: 5 }),
		).toMatch(/seats.*5\/5/);
	});

	it("labels CTAs and returns null for a hard denial", () => {
		expect(ctaLabel({ kind: "upgrade", toTier: "pro" })).toBe("Upgrade to pro");
		expect(ctaLabel({ kind: "signIn" })).toBe("Sign in");
		expect(ctaLabel({ kind: "none" })).toBeNull();
	});
});

describe("Presentation modes", () => {
	it("renders children when allowed", () => {
		wrap(
			<Presentation decision={allowed} mode="hide">
				{<button type="button">Delete</button>}
			</Presentation>,
		);
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("renders nothing when hidden", () => {
		wrap(
			<Presentation decision={hardDeny} mode="hide">
				{<button type="button">Delete</button>}
			</Presentation>,
		);
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});

	it("disables children with an aria-disabled wrapper", () => {
		const { container } = wrap(
			<Presentation decision={hardDeny} mode="disable">
				{<button type="button">Delete</button>}
			</Presentation>,
		);
		expect(screen.getByText("Delete")).toBeInTheDocument();
		expect(container.querySelector('[aria-disabled="true"]')).not.toBeNull();
	});

	it("disable: puts the control in an inert subtree so it can't be activated by keyboard", () => {
		const { container } = wrap(
			<Presentation decision={hardDeny} mode="disable">
				{<button type="button">Delete</button>}
			</Presentation>,
		);
		const inert = container.querySelector("[inert]");
		expect(inert).not.toBeNull();
		expect(inert?.contains(screen.getByText("Delete"))).toBe(true);
	});

	it("warns and renders nothing when redirect is used as a gate fallback (guards-only mode)", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		wrap(
			<Presentation decision={hardDeny} mode="redirect">
				{<button type="button">Delete</button>}
			</Presentation>,
		);
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("redirect"));
		warn.mockRestore();
	});

	it("hides when upgrade mode meets a hard denial (can't upsell)", () => {
		wrap(
			<Presentation decision={hardDeny} mode="upgrade">
				{<button type="button">Export</button>}
			</Presentation>,
		);
		expect(screen.queryByText("Export")).not.toBeInTheDocument();
	});
});

describe("Presentation upgrade variants", () => {
	it("badge: shows a Pro pill and fires onUpgrade with the reason", () => {
		const onUpgrade = vi.fn();
		wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="badge">
				{<button type="button">Export</button>}
			</Presentation>,
			{ onUpgrade },
		);
		expect(screen.getByText("Export")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Pro"));
		expect(onUpgrade).toHaveBeenCalledWith(upgradeDeny.reason);
	});

	it("badge: CTA is keyboard-activatable (Enter fires onUpgrade)", () => {
		const onUpgrade = vi.fn();
		wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="badge">
				{<button type="button">Export</button>}
			</Presentation>,
			{ onUpgrade },
		);
		const cta = screen.getByText("Pro").closest('[role="button"]');
		expect(cta).not.toBeNull();
		expect(cta).toHaveAttribute("tabindex", "0");
		fireEvent.keyDown(cta as Element, { key: "Enter" });
		expect(onUpgrade).toHaveBeenCalledWith(upgradeDeny.reason);
	});

	it("badge: keeps the gated control in an inert subtree (CTA is the only interactive element)", () => {
		const { container } = wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="badge">
				{<button type="button">Export</button>}
			</Presentation>,
		);
		const inert = container.querySelector("[inert]");
		expect(inert).not.toBeNull();
		expect(inert?.contains(screen.getByText("Export"))).toBe(true);
	});

	it("replace: swaps children for a card with the CTA", () => {
		const onUpgrade = vi.fn();
		wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="replace">
				{<button type="button">Export</button>}
			</Presentation>,
			{ onUpgrade },
		);
		expect(screen.queryByText("Export")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Upgrade to pro" }));
		expect(onUpgrade).toHaveBeenCalledWith(upgradeDeny.reason);
	});

	it("teaser: keeps children behind a lock + CTA", () => {
		const onUpgrade = vi.fn();
		wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="teaser">
				{<button type="button">Export</button>}
			</Presentation>,
			{ onUpgrade },
		);
		expect(screen.getByText("Export")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Upgrade to pro" }));
		expect(onUpgrade).toHaveBeenCalledWith(upgradeDeny.reason);
	});

	it("intercept: catches the click, suppresses the child handler, and fires onUpgrade", () => {
		const onUpgrade = vi.fn();
		const childClick = vi.fn();
		wrap(
			<Presentation decision={upgradeDeny} mode="upgrade" variant="intercept">
				{
					<button type="button" onClick={childClick}>
						Export
					</button>
				}
			</Presentation>,
			{ onUpgrade },
		);
		fireEvent.click(screen.getByText("Export"));
		expect(onUpgrade).toHaveBeenCalledWith(upgradeDeny.reason);
		expect(childClick).not.toHaveBeenCalled();
	});
});

describe("Presentation pending", () => {
	it("renders the Pending slot while the snapshot hydrates, not the decision", () => {
		function Pending(_props: PendingSlotProps): ReactNode {
			return <span>Loading…</span>;
		}
		wrap(
			<Presentation decision={allowed} mode="hide">
				{<button type="button">Delete</button>}
			</Presentation>,
			{ status: "loading", presentation: { Pending } },
		);
		expect(screen.getByText("Loading…")).toBeInTheDocument();
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});

	it("default Pending renders nothing", () => {
		wrap(
			<Presentation decision={allowed} mode="hide">
				{<button type="button">Delete</button>}
			</Presentation>,
			{
				status: "loading",
			},
		);
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});
});
