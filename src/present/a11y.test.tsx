import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { CanProvider } from "../provider/CanProvider";
import type { Denied } from "../types/decision";
import type { UpgradeVariant } from "../types/presentation";
import { Presentation } from "./Presentation";

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

async function expectNoViolations(ui: ReactNode): Promise<void> {
	const { container } = render(
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
			>
				{ui}
			</CanProvider>
		</MantineProvider>,
	);
	expect(await axe(container)).toHaveNoViolations();
}

describe("presentation accessibility", () => {
	it("disable: reason tooltip wrapper is clean", async () => {
		await expectNoViolations(
			<Presentation decision={hardDeny} mode="disable">
				<button type="button">Delete</button>
			</Presentation>,
		);
	});

	it.each<UpgradeVariant>([
		"teaser",
		"replace",
		"badge",
		"intercept",
	])("upgrade variant %s is clean", async (variant) => {
		await expectNoViolations(
			<Presentation decision={upgradeDeny} mode="upgrade" variant={variant}>
				<button type="button">Export</button>
			</Presentation>,
		);
	});
});
