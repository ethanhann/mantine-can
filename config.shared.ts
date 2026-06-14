/**
 * Source globs that live in the repo but are not part of the shipped library:
 * tests, test helpers, and Storybook stories. Shared by `vite.config.ts`
 * (declaration emit) and `vitest.config.ts` (coverage) so the two exclude lists
 * can't drift apart.
 */
export const NON_LIBRARY_SOURCE = [
	"src/**/*.test.{ts,tsx}",
	"src/test/**",
	"src/stories/**",
	"src/**/*.stories.tsx",
];
