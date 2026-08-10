COMPOSE = docker compose

.PHONY: up down restart logs logs-api logs-mongo logs-frontend ps build health health-wait dev

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) down
	$(COMPOSE) up --build -d

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

logs-api:
	$(COMPOSE) logs -f api

logs-mongo:
	$(COMPOSE) logs -f mongo

logs-frontend:
	$(COMPOSE) logs -f frontend

ps:
	$(COMPOSE) ps

health:
	curl -fsS http://127.0.0.1:8000/health

health-wait:
	@echo "Aguardando API ficar saudavel em http://127.0.0.1:8000/health..."
	@for i in $$(seq 1 30); do \
		if curl -fsS http://127.0.0.1:8000/health >/dev/null; then \
			echo "API saudavel."; \
			exit 0; \
		fi; \
		echo "Tentativa $$i/30: API ainda indisponivel. Tentando novamente em 2s..."; \
		sleep 2; \
	done; \
	echo "Timeout: API nao ficou saudavel no tempo esperado."; \
	exit 1

dev:
	$(COMPOSE) up --build -d
	$(MAKE) health-wait
	$(COMPOSE) logs -f frontend api
