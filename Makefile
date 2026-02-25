.PHONY: dev build up down restart logs test lint format db-migrate shell-app shell-db help

# ── Local development ─────────────────────────────────────────────────────────

dev: ## Start the app with hot-reload (backing services must be running)
	npm run dev

build: ## Build the Docker image
	docker compose build app

# ── Docker Compose (production — no override volumes) ─────────────────────────

up: ## Start the full production stack in detached mode
	docker compose -f docker-compose.yml up --build -d

down: ## Stop and remove all containers
	docker compose down

restart: ## Rebuild and restart the app container only
	docker compose -f docker-compose.yml up --build -d app

logs: ## Stream app logs (Ctrl-C to stop)
	docker compose logs -f app

# ── Local dev stack (with override volumes for live-reload) ───────────────────

dev-up: ## Start the full stack with dev volume mounts
	docker compose up --build -d

dev-down: ## Stop the dev stack
	docker compose down

# ── Database ──────────────────────────────────────────────────────────────────

db-migrate: ## Apply db/schema.sql to the database (idempotent)
	psql "$(DATABASE_URL)" -f db/schema.sql

shell-db: ## Open a psql shell inside the Postgres container
	docker compose exec postgres psql -U "$${POSTGRES_USER:-lms_user}" -d "$${POSTGRES_DB:-lms_db}"

# ── Testing & linting ─────────────────────────────────────────────────────────

test: ## Run the full Jest test suite
	npm test

test-watch: ## Run Jest in watch mode
	npm run test:watch

lint: ## Run ESLint
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

format: ## Run Prettier
	npm run format

# ── Shells ────────────────────────────────────────────────────────────────────

shell-app: ## Open a shell inside the running app container
	docker compose exec app sh

# ── Health check ──────────────────────────────────────────────────────────────

health: ## Check the app health endpoint
	curl -sf http://localhost:3000/health | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)))"

# ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
