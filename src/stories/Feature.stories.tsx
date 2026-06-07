import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Feature, type FeatureProps } from "../components/Feature";
import { Demo, type PolicyName, policies } from "./demo";

type FeatureArgs = FeatureProps & {
	policy: PolicyName;
	onUpgrade: () => void;
};

const meta = {
	title: "Components/Feature",
	component: Feature,
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	args: { onUpgrade: fn() },
	argTypes: {
		policy: {
			control: "inline-radio",
			options: ["member", "pro", "admin"],
			description: "Sample policy snapshot to evaluate against.",
		},
		name: { control: "text", description: "Entitlement name." },
		fallback: {
			control: "inline-radio",
			options: ["hide", "disable", "upgrade"],
			description: "Presentation mode on denial.",
		},
		variant: {
			control: "inline-radio",
			options: ["badge", "teaser", "replace", "intercept"],
			description: "Upgrade sub-variant.",
		},
		onUpgrade: { control: false },
	},
	render: ({ policy, onUpgrade, ...props }) => (
		<Demo policy={policies[policy]} onUpgrade={onUpgrade}>
			<Feature {...props}>
				<Button>Export PDF</Button>
			</Feature>
		</Demo>
	),
} satisfies Meta<FeatureArgs>;

export default meta;
type Story = StoryObj<FeatureArgs>;

/** Entitled (pro tier): children render normally. */
export const Entitled: Story = {
	args: { policy: "pro", name: "pdf-export" },
};

/** Too low a tier, `badge` variant (library default): a Pro pill with a tooltip CTA. */
export const UpgradeBadge: Story = {
	args: {
		policy: "member",
		name: "pdf-export",
		variant: "badge",
		onUpgrade: fn(),
	},
	play: async ({ args, canvasElement }) => {
		await userEvent.click(within(canvasElement).getByText("Pro"));
		await expect(args.onUpgrade).toHaveBeenCalled();
	},
};

/** `teaser` variant: children blurred behind a lock and CTA. */
export const UpgradeTeaser: Story = {
	args: { policy: "member", name: "pdf-export", variant: "teaser" },
};

/** `replace` variant: children swapped for an upgrade card. */
export const UpgradeReplace: Story = {
	args: { policy: "member", name: "pdf-export", variant: "replace" },
};

/**
 * `intercept` variant: children stay clickable. The click is caught and fires
 * `onUpgrade` instead of the child handler.
 */
export const UpgradeIntercept: Story = {
	args: {
		policy: "member",
		name: "pdf-export",
		variant: "intercept",
		onUpgrade: fn(),
	},
	play: async ({ args, canvasElement }) => {
		await userEvent.click(within(canvasElement).getByText("Export PDF"));
		await expect(args.onUpgrade).toHaveBeenCalled();
	},
};

/** `fallback="hide"`: hide instead of upselling. */
export const HideInsteadOfUpsell: Story = {
	args: { policy: "member", name: "pdf-export", fallback: "hide" },
};
