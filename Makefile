PLUGINS := rewards
SCRIPTS := parser_test handout_test

SRC := $(shell find src -name "*.ts" -or -name "*.js")
SCRIPT := dist/rewards_api_script.js
DEFAULT := $(word 1,$(SCRIPTS))
DIST := $(patsubst %,dist/der20_%.js,$(PLUGINS))

.PHONY: all clean run release checkout_release build_release publish create_draft plugins scripts
.PRECIOUS: build/%.js src/%/tsconfig.json

all: node_modules plugins scripts
plugins: $(DIST)
scripts: $(patsubst %,build/%.js,$(SCRIPTS))
theoretical: build/empty.js build/minimal.js dist/der20_minimal_plugin.js
node_modules:
	npm install || echo ignoring result from npm install, since it is only used for publishing release
dist/der20_%.js: build/%.js include/header.js.txt include/trailer.js.txt
	mkdir -p dist
	rm -f $@
	cat include/header.js.txt $< include/trailer.js.txt > $@
	chmod 444 $@
run: build/$(DEFAULT).js tmp
	node build/$(DEFAULT).js | egrep --color -e '^\tresult of parse: {"kind":3.*$$' -e $$
tmp:
	mkdir tmp
print:
	json_pp < tmp/der20_$(DEFAULT)_state.json
build/%.js: $(SRC) src/%/tsconfig.json node_modules
	mkdir -p build
	node_modules/typescript/bin/tsc -p src/$*/tsconfig.json
src/%/tsconfig.json:
	echo '{ "extends": "../../tsconfig.json", "compilerOptions": { "outFile": "../../build/$*.js" }, "include": [ "**/*.ts", "../sys/loader.js", "../types/*.d.ts" ] }' > $@
clean:
	rm -rf build dist
squeaky: clean
	rm -rf node_modules
cloc: /usr/local/bin/cloc
	cloc --exclude-dir=node_modules,releases,build,dist,.vscodeh,tmp --exclude-list-file .clocignore --by-file-by-lang .
/usr/local/bin/cloc:
	brew install cloc
release: label_release build_release checkout_master
build_release: checkout_release clean $(subst dist,releases/${RELEASE},$(DIST)) checkout_master
checkout_release:
	git checkout v${RELEASE}
label_release:
	git tag v${RELEASE}
checkout_master:
	git checkout master
releases/${RELEASE}/%.js: dist/%.js LICENSE
	mkdir -p releases/${RELEASE}
	head -1 LICENSE > $@
	echo ' *' $* version $(RELEASE) >> $@
	echo ' *' >> $@
	tail -n +2 LICENSE >> $@
	echo >> $@
	cat $< >> $@
publish: checkout_release create_draft checkout_master
create_draft:
	git push origin v${RELEASE}
	node scripts/publish_release.js ${RELEASE}
list:
	@echo ${SRC}
