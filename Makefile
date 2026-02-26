.DEFAULT_GOAL := help

# ─── Config ───────────────────────────────────────────────────────
PNPM := pnpm

# ─── Help ─────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\n\033[1mUsage:\033[0m make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } \
		/^## / { printf "\n\033[1m%s\033[0m\n", substr($$0,4) }' $(MAKEFILE_LIST)

## Bootstrap

.PHONY: init
init: ## First-time local bootstrap.
	$(PNPM) install
	$(PNPM) exec husky

.PHONY: doctor
doctor: ## Check local toolchain health.
	@echo ">>> Checking node..."
	@node --version
	@echo ">>> Checking pnpm..."
	@pnpm --version
	@echo ">>> Checking biome..."
	@$(PNPM) exec biome --version
	@echo ">>> Checking tsc..."
	@$(PNPM) exec tsc --version
	@echo ">>> All checks passed."

## Development

.PHONY: dev
dev: ## Start Electron in development mode.
	$(PNPM) run dev

.PHONY: build
build: ## Build for production.
	$(PNPM) run build

## Quality

.PHONY: check
check: ## Run Biome lint + format check.
	$(PNPM) exec biome check src/

.PHONY: fix
fix: ## Auto-fix lint and formatting issues.
	$(PNPM) exec biome check --write src/

.PHONY: format
format: ## Format all source files.
	$(PNPM) exec biome format --write src/

.PHONY: type
type: ## Run TypeScript type checking.
	$(PNPM) run typecheck

## Testing

.PHONY: test
test: ## Run unit tests.
	$(PNPM) run test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode.
	$(PNPM) run test:watch

.PHONY: test-e2e
test-e2e: ## Run E2E tests (requires build).
	$(PNPM) run test:e2e

## CI/CD

.PHONY: ci-fast
ci-fast: fix type test ## Quick CI: fix + typecheck + unit tests.

.PHONY: ci
ci: ci-fast test-e2e ## Full CI: ci-fast + E2E tests.

## Maintenance

.PHONY: clean
clean: ## Clean build artifacts.
	rm -rf node_modules dist out .vite
	$(PNPM) store prune
