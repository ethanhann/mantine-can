/**
 * Typed-name registry: opt-in, scoped to names only (not action/resource pairs).
 * By default action and feature names are `string`. Augment the `Register`
 * interface to narrow them to your unions, turning a typo into a compile error:
 *
 *     declare module "@ethanhann/mantine-can" {
 *       interface Register {
 *         actions: "view" | "edit" | "delete";
 *         features: "pdf-export" | "bulk-actions";
 *       }
 *     }
 *
 * After augmenting, `feature("pdf-exprot")` and `can("edt", row)` fail to compile,
 * while the default (un-augmented) behavior stays `string`. Modeled on the
 * TanStack Router route-registry pattern.
 */

/** Resolve a registry key to its string union, falling back to `string`. */
export type ResolveName<Registry, Key extends string> =
	Registry extends Record<Key, infer V>
		? V extends string
			? V
			: string
		: string;

/** Module-augmentation target. Add `actions` / `features` string unions to narrow names. */
// biome-ignore lint/suspicious/noEmptyInterface: this is the augmentation seam consumers extend
export interface Register {}

/** Action names accepted by `can`/`useCan`/`<Can do>`: `string` unless `Register` is augmented. */
export type ActionName = ResolveName<Register, "actions">;

/** Feature names accepted by `feature`/`useFeature`/`<Feature name>`: `string` unless augmented. */
export type FeatureName = ResolveName<Register, "features">;
