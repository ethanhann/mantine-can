// @ethanhann/mantine-can public entry point.
// The gate layer: predicates, provider, hooks, components, and decision types.

// Components
export { Can, type CanProps } from "./components/Can.js";
export { Feature, type FeatureProps } from "./components/Feature.js";
export { Gate, type GateProps } from "./components/Gate.js";
export {
	RequireAuth,
	type RequireAuthProps,
	RequireRole,
	type RequireRoleProps,
} from "./components/RouteGuards.js";

// Engine
export { createGate, resolve } from "./engine/resolve.js";
export type {
	AuthorizationRequirement,
	Authorize,
	Entitle,
	EntitlementResult,
	ResolveContext,
} from "./engine/types.js";
// Hooks
export {
	type SubjectState,
	useCan,
	useFeature,
	useGate,
	useSubject,
} from "./hooks.js";
// Predicates
export {
	anyOf,
	authenticated,
	can,
	feature,
	flag,
	role,
} from "./predicates.js";
// Presentation
export {
	DefaultDisabled,
	DefaultPending,
	DefaultUpgrade,
} from "./present/defaults.js";
export {
	Presentation,
	type PresentationProps,
} from "./present/Presentation.js";
export {
	type EffectivePresentation,
	selectPresentation,
} from "./present/select.js";
export { ctaLabel, reasonText } from "./present/text.js";
// Provider & context
export { CanProvider, type CanProviderProps } from "./provider/CanProvider.js";
export {
	type CanContextValue,
	type PolicyStatus,
	useCanContext,
} from "./provider/context.js";
// Typed-name registry
export type {
	ActionName,
	FeatureName,
	Register,
	ResolveName,
} from "./registry.js";
export type { Decision, Denied, DenyReason, Remedy } from "./types/decision.js";
// Decision model
export { allow, deny } from "./types/decision.js";
// Presentation types
export type {
	DisabledSlot,
	DisabledSlotProps,
	PendingSlot,
	PendingSlotProps,
	PresentationConfig,
	PresentationMode,
	ResolvedPresentation,
	UpgradeSlot,
	UpgradeSlotProps,
	UpgradeVariant,
} from "./types/presentation.js";
// Requirements
export type {
	AnyOfRequirement,
	GateRequirement,
	PermissionRequirement,
	Requirement,
} from "./types/requirement.js";
