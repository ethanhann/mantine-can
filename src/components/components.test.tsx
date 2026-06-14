import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { anyOf, can, feature, role } from "../predicates";
import { CanProvider } from "../provider/CanProvider";
import type { PolicyStatus } from "../provider/context";
import { Can } from "./Can";
import { Feature } from "./Feature";
import { Gate } from "./Gate";
import { RequireAuth, RequireRole } from "./RouteGuards";

interface Policy {
	actions: string[];
	roles: string[];
	tier: string;
}

interface Options {
	policy?: Policy;
	subject?: { id: string } | null;
	status?: PolicyStatus;
}

function makeWrapper(options: Options = {}) {
	const policy = options.policy ?? {
		actions: ["export"],
		roles: ["member"],
		tier: "free",
	};
	const subject =
		options.subject === undefined ? { id: "u1" } : options.subject;
	const authorize = (
		p: Policy,
		req: { type: string; action?: string; anyOf?: string[]; name?: string },
	) => {
		if (req.type === "permission") {
			return req.action !== undefined && p.actions.includes(req.action);
		}
		if (req.type === "role") {
			return (req.anyOf ?? []).some((r) => p.roles.includes(r));
		}
		return false;
	};
	const entitle = (p: Policy) =>
		p.tier === "pro"
			? { ok: true as const }
			: { ok: false as const, requiredTier: "pro", currentTier: p.tier };

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<MantineProvider>
				<CanProvider
					subject={subject}
					policy={policy}
					status={options.status ?? "ready"}
					authorize={authorize}
					entitle={entitle}
				>
					{children}
				</CanProvider>
			</MantineProvider>
		);
	};
}

describe("<Can>", () => {
	it("renders children when authorized", () => {
		render(<Can do="export">{<button type="button">Export</button>}</Can>, {
			wrapper: makeWrapper(),
		});
		expect(screen.getByText("Export")).toBeInTheDocument();
	});

	it("hides children when denied (default)", () => {
		render(<Can do="delete">{<button type="button">Delete</button>}</Can>, {
			wrapper: makeWrapper(),
		});
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});

	it("disables children when fallback is disable", () => {
		const { container } = render(
			<Can do="delete" fallback="disable">
				{<button type="button">Delete</button>}
			</Can>,
			{
				wrapper: makeWrapper(),
			},
		);
		expect(screen.getByText("Delete")).toBeInTheDocument();
		expect(container.querySelector('[aria-disabled="true"]')).not.toBeNull();
	});

	it("passes the resource to authorize", () => {
		const policy = { actions: [], roles: [], tier: "free" };
		render(
			<Can do="delete" on={{ id: 1 }}>
				{<button type="button">Delete</button>}
			</Can>,
			{ wrapper: makeWrapper({ policy }) },
		);
		expect(screen.queryByText("Delete")).not.toBeInTheDocument();
	});
});

describe("<Feature>", () => {
	it("shows an upgrade badge when the tier is too low (default)", () => {
		render(
			<Feature name="pdf">{<button type="button">Export PDF</button>}</Feature>,
			{ wrapper: makeWrapper() },
		);
		expect(screen.getByText("Pro")).toBeInTheDocument();
	});

	it("renders children when entitled", () => {
		render(
			<Feature name="pdf">{<button type="button">Export PDF</button>}</Feature>,
			{
				wrapper: makeWrapper({
					policy: { actions: [], roles: [], tier: "pro" },
				}),
			},
		);
		expect(screen.getByText("Export PDF")).toBeInTheDocument();
		expect(screen.queryByText("Pro")).not.toBeInTheDocument();
	});

	it("hides instead of upselling when fallback is hide", () => {
		render(
			<Feature name="pdf" fallback="hide">
				{<button type="button">Export PDF</button>}
			</Feature>,
			{ wrapper: makeWrapper() },
		);
		expect(screen.queryByText("Export PDF")).not.toBeInTheDocument();
	});
});

describe("<Gate>", () => {
	it("hides on a hard authz denial even with an upgrade fallback (never upsell the unauthorized)", () => {
		render(
			<Gate require={[can("publish"), feature("pdf")]} fallback="upgrade">
				{<button type="button">Publish</button>}
			</Gate>,
			{ wrapper: makeWrapper() },
		);
		expect(screen.queryByText("Publish")).not.toBeInTheDocument();
		expect(screen.queryByText("Pro")).not.toBeInTheDocument();
	});

	it("surfaces an upgrade from an anyOf group once authorized", () => {
		render(
			<Gate
				require={[can("export"), anyOf([role("admin"), feature("pdf")])]}
				fallback="upgrade"
			>
				{<button type="button">Export</button>}
			</Gate>,
			{ wrapper: makeWrapper() },
		);
		expect(screen.getByText("Pro")).toBeInTheDocument();
	});

	it("renders children when everything passes", () => {
		render(
			<Gate require={[can("export")]}>
				{<button type="button">Export</button>}
			</Gate>,
			{ wrapper: makeWrapper() },
		);
		expect(screen.getByText("Export")).toBeInTheDocument();
	});
});

describe("<RequireAuth>", () => {
	it("renders children when authenticated", () => {
		render(
			<RequireAuth redirectTo="/login" navigate={vi.fn()}>
				{<div>Dashboard</div>}
			</RequireAuth>,
			{
				wrapper: makeWrapper(),
			},
		);
		expect(screen.getByText("Dashboard")).toBeInTheDocument();
	});

	it("redirects and renders fallback when unauthenticated", () => {
		const navigate = vi.fn();
		render(
			<RequireAuth
				redirectTo="/login"
				navigate={navigate}
				fallback={<div>Redirecting</div>}
			>
				{<div>Dashboard</div>}
			</RequireAuth>,
			{ wrapper: makeWrapper({ subject: null }) },
		);
		expect(navigate).toHaveBeenCalledWith("/login");
		expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
		expect(screen.getByText("Redirecting")).toBeInTheDocument();
	});

	it("waits (does not redirect) while the snapshot hydrates", () => {
		const navigate = vi.fn();
		render(
			<RequireAuth redirectTo="/login" navigate={navigate}>
				{<div>Dashboard</div>}
			</RequireAuth>,
			{
				wrapper: makeWrapper({ subject: null, status: "loading" }),
			},
		);
		expect(navigate).not.toHaveBeenCalled();
		expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
	});
});

describe("<RequireRole>", () => {
	it("renders children when the subject holds the role", () => {
		render(
			<RequireRole anyOf={["member"]} redirectTo="/403" navigate={vi.fn()}>
				{<div>Admin</div>}
			</RequireRole>,
			{
				wrapper: makeWrapper(),
			},
		);
		expect(screen.getByText("Admin")).toBeInTheDocument();
	});

	it("redirects when the subject lacks the role", () => {
		const navigate = vi.fn();
		render(
			<RequireRole anyOf={["admin"]} redirectTo="/403" navigate={navigate}>
				{<div>Admin</div>}
			</RequireRole>,
			{
				wrapper: makeWrapper(),
			},
		);
		expect(navigate).toHaveBeenCalledWith("/403");
		expect(screen.queryByText("Admin")).not.toBeInTheDocument();
	});

	it("does not re-navigate when navigate identity changes across renders while denied", () => {
		const Wrapper = makeWrapper();
		const nav1 = vi.fn();
		const { rerender } = render(
			<Wrapper>
				<RequireRole anyOf={["admin"]} redirectTo="/403" navigate={nav1}>
					<div>Admin</div>
				</RequireRole>
			</Wrapper>,
		);
		expect(nav1).toHaveBeenCalledTimes(1);

		// A fresh navigate identity (as with an inline arrow) must not re-fire.
		const nav2 = vi.fn();
		rerender(
			<Wrapper>
				<RequireRole anyOf={["admin"]} redirectTo="/403" navigate={nav2}>
					<div>Admin</div>
				</RequireRole>
			</Wrapper>,
		);
		expect(nav2).not.toHaveBeenCalled();
		expect(nav1).toHaveBeenCalledTimes(1);
	});
});
