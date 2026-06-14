# Run all validation checks and tests (mirrors CI; npm scripts are the single source of truth)
validate:
    npm run lint
    npm run typecheck
    npm run test:run
    npm run build
    npm run check:package
    npm run lint:package
    npm run check:exports
    npm run storybook:build

docs:
    npm run dev
