import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { Can, type CanProps } from "../components/Can";
import { Demo, type PolicyName, policies } from "./demo";

type CanArgs = CanProps & { policy: PolicyName };

const meta = {
	title: "Components/Can",
	component: Can,
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	argTypes: {
		policy: {
			control: "inline-radio",
			options: ["member", "pro", "admin"],
			description: "Sample policy snapshot to evaluate against.",
		},
		do: { control: "text", description: "Action to authorize." },
		on: { control: false },
		fallback: {
			control: "inline-radio",
			options: ["hide", "disable"],
			description: "Presentation mode on denial.",
		},
		variant: { control: false },
	},
	render: ({ policy, ...props }) => (
		<Demo policy={policies[policy]}>
			<Can {...props}>
				<Button color="red">
					{props.do === "export" ? "Export" : "Delete"}
				</Button>
			</Can>
		</Demo>
	),
} satisfies Meta<CanArgs>;

export default meta;
type Story = StoryObj<CanArgs>;

/** Authorized: the control renders normally. A member may export. */
export const Allowed: Story = {
	args: { policy: "member", do: "export", fallback: "hide" },
};

/** Denied with the default `hide`: nothing renders. A member cannot delete. */
export const HiddenWhenDenied: Story = {
	args: { policy: "member", do: "delete", fallback: "hide" },
};

/** Denied with `fallback="disable"`: the control is disabled with a reason tooltip. */
export const DisabledWhenDenied: Story = {
	args: { policy: "member", do: "delete", fallback: "disable" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const wrapper = canvas.getByText("Delete").closest("[aria-disabled]");
		await expect(wrapper).toHaveAttribute("aria-disabled", "true");
	},
};
