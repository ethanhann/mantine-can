import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Gate, type GateProps } from "../components/Gate";
import { anyOf, can, feature, flag, role } from "../predicates";
import { Demo, type PolicyName, policies } from "./demo";

type GateArgs = GateProps & { policy: PolicyName };

const meta = {
	title: "Components/Gate",
	component: Gate,
	tags: ["autodocs"],
	parameters: { layout: "centered" },
	argTypes: {
		policy: {
			control: "inline-radio",
			options: ["member", "pro", "admin"],
			description: "Sample policy snapshot to evaluate against.",
		},
		fallback: {
			control: "inline-radio",
			options: ["hide", "disable", "upgrade"],
			description: "Presentation mode on denial.",
		},
	},
} satisfies Meta<GateArgs>;

export default meta;
type Story = StoryObj<GateArgs>;

/**
 * Authz-first precedence: a member lacks both `publish` and the pro tier. The
 * hard authorization denial wins, so the control is hidden, never upsold.
 * Switch the policy to `admin` to see it render.
 */
export const AuthzFirstHides: Story = {
	args: { policy: "member", fallback: "upgrade" },
	render: ({ policy, fallback }) => (
		<Demo policy={policies[policy]}>
			<Gate
				require={[can("publish"), feature("pdf-export")]}
				fallback={fallback}
			>
				<Button>Publish</Button>
			</Gate>
		</Demo>
	),
};

/**
 * Precedence inversion in `anyOf`: the member is authorized to export, but the OR
 * group (admin OR pro) fails. Because one branch was a feature, the group surfaces
 * the upgrade prompt rather than hiding. Switch the policy to `pro` to see it pass.
 */
export const AnyOfSurfacesUpgrade: Story = {
	args: { policy: "member", fallback: "upgrade" },
	render: ({ policy, fallback }) => (
		<Demo policy={policies[policy]}>
			<Gate
				require={[can("export"), anyOf([role("admin"), feature("pdf-export")])]}
				fallback={fallback}
			>
				<Button>Export</Button>
			</Gate>
		</Demo>
	),
};

/**
 * Flag-gated: `flag("beta")` is off for members and on for admins. Switch the
 * policy to `admin` to see the control render.
 */
export const FlagGated: Story = {
	args: { policy: "member", fallback: "disable" },
	render: ({ policy, fallback }) => (
		<Demo policy={policies[policy]}>
			<Gate require={[flag("beta")]} fallback={fallback}>
				<Button>Beta dashboard</Button>
			</Gate>
		</Demo>
	),
};

/** Everything passes: children render. */
export const Allowed: Story = {
	args: { policy: "member" },
	render: ({ policy, fallback }) => (
		<Demo policy={policies[policy]}>
			<Gate require={[can("export")]} fallback={fallback}>
				<Button>Export</Button>
			</Gate>
		</Demo>
	),
};
