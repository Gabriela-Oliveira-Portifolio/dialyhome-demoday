.PHONY: test test-unit test-integration test-watch test-coverage setup-test

# Rodar todos os testes
test:
	npm test

# Testes unitários
test-unit:
	npm run test:unit

# Testes de integração
test-integration:
	npm run test:integration

# Testes com watch
test-watch:
	npm run test:watch

# Coverage completo
test-coverage:
	npm test -- --coverage

# Setup ambiente de teste
setup-test:
	bash scripts/test-setup.sh

# Limpar ambiente de teste
clean-test:
	bash scripts/test-teardown.sh

# Rodar testes em CI
test-ci:
	npm run test:cinpm run migrate:test
