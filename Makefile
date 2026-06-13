.PHONY: check validate typecheck test eval e2e build

check:
	npm run check

validate:
	node scripts/validate-scaffold.mjs

typecheck:
	npm run typecheck

test:
	npm run test

eval:
	npm run eval

e2e:
	npm run e2e

build:
	npm run build
