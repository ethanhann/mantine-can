// Register the vitest-axe matcher on vitest's `Assertion` type (vitest 4 reads
// the `vitest` module augmentation, not the older global `Vi` namespace).
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
	// biome-ignore lint/suspicious/noExplicitAny: must match vitest's own `Assertion<T = any>` for declaration merging
	interface Assertion<T = any> extends AxeMatchers {}
	interface AsymmetricMatchersContaining extends AxeMatchers {}
}
