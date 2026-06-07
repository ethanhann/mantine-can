import { Button, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Can } from "../components/Can";
import { Feature } from "../components/Feature";
import type { UpgradeSlotProps } from "../types/presentation";
import { Demo, memberPolicy } from "./demo";

const meta = {
	title: "Guides/Presentation defaults",
	tags: ["autodocs"],
	parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Set `presentation.default` once on the provider and every gate inherits it. Here
 * a denied `<Can>` with no `fallback` renders disabled instead of hidden.
 */
export const ProviderDefaultDisable: Story = {
	render: () => (
		<Demo policy={memberPolicy} presentation={{ default: "disable" }}>
			<Can do="delete">
				<Button color="red">Delete</Button>
			</Can>
		</Demo>
	),
};

/**
 * A per-gate `fallback` overrides the provider default. The provider default is
 * `disable`; the second gate opts back into `hide`.
 */
export const PerGateOverride: Story = {
	render: () => (
		<Demo policy={memberPolicy} presentation={{ default: "disable" }}>
			<Stack>
				<Can do="delete">
					<Button color="red">Inherits disable</Button>
				</Can>
				<Can do="delete" fallback="hide">
					<Button color="red">Overridden to hide</Button>
				</Can>
			</Stack>
		</Demo>
	),
};

/** Children, the chosen variant, the denial, and the bound CTA. */
function CustomUpgrade({ onUpgrade }: UpgradeSlotProps) {
	return (
		<Stack gap="xs" align="center">
			<Text size="sm">This feature is part of Pro.</Text>
			<Button variant="light" onClick={onUpgrade}>
				See plans
			</Button>
		</Stack>
	);
}

/**
 * Override the upgrade renderer with your own component via the provider's
 * `Upgrade` slot. The slot receives the denial and a bound `onUpgrade` callback.
 */
export const CustomUpgradeRenderer: Story = {
	render: () => (
		<Demo
			policy={memberPolicy}
			presentation={{ Upgrade: CustomUpgrade }}
			onUpgrade={() => window.alert("Open plans")}
		>
			<Feature name="pdf-export">
				<Button>Export PDF</Button>
			</Feature>
		</Demo>
	),
};
