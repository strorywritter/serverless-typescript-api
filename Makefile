.PHONY: build test clean sam-build sam-deploy

build:
	npm run build

test:
	npm test

clean:
	rm -rf dist
	rm -rf .aws-sam
	rm -rf coverage
	rm -rf node_modules

sam-build: build
	sam build

sam-deploy: sam-build
	sam deploy

sam-local: sam-build
	sam local start-api

