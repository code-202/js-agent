.PHONY: help console

console: ## Launch zsh in docker container with PHP
	docker run \
		--name=js-agent_console \
		--volume=$(shell pwd):/srv \
		--volume=$$DEV/.home-developer:/home/developer \
		--env USERNAME=$(shell whoami) \
		--env UNIX_UID=$(shell id -u) \
		--env=CONTAINER_SHELL=/bin/zsh \
		--env=NODE_ENV=development \
		--workdir=/srv \
		--interactive \
		--tty \
		--rm \
		code202/node:18.12 \
		/bin/login -p -f $(shell whoami)

test:
	yarn test --passWithNoTests

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help