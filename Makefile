PLUGINS := rewards anonymous
SCRIPTS := parser_test help_test

SRC := $(shell find src -name "*.ts" -or -name "*.js")
SCRIPT := dist/rewards_api_script.js
DEFAULT := $(word 1,$(SCRIPTS))
DIST := $(patsubst %,dist/der20_%.js,$(PLUGINS))
HELP_JSON := $(patsubst %,build/%_help.json,$(PLUGINS))
LICENSE_LENGTH := $(word 1, $(shell wc -l LICENSE))

.PHONY: all clean run release checkout_release build_release publish create_draft plugins scripts documentation
.PRECIOUS: build/%.js src/%/tsconfig.json

all: node_modules plugins scripts documentation
plugins: $(DIST)
scripts: $(patsubst %,build/%.js,$(SCRIPTS))
theoretical: build/empty.js build/minimal.js dist/der20_minimal_plugin.js
node_modules:
	npm install || echo ignoring result from npm install, since it is only used for publishing release
dist/der20_%.js: build/%.js include/header.js.txt include/trailer.js.txt Makefile LICENSE
	@mkdir -p dist
	@rm -f $@
	@sed -e 's/DER20_MAGIC_LICENSE_TEXT_LENGTH/$(LICENSE_LENGTH)/g' -e 's/DER20_MAGIC_FILE_NAME/der20_$*.js/g' < include/header.js.txt > $@
	@sed -e 's/    Object\.defineProperty(.*);$$/    \/\/ local module initialized by embedded loader below/' < $< >> $@
	@cat include/trailer.js.txt >> $@
	@chmod 444 $@
	@echo packaging $< as $@ for Roll20
run: build/$(DEFAULT).js tmp
	node build/$(DEFAULT).js | egrep --color -e '^\tresult of parse: {"kind":3.*$$' -e $$
tmp:
	mkdir tmp
print:
	json_pp < tmp/der20_$(DEFAULT)_state.json
build/%.js: $(SRC) src/%/tsconfig.json node_modules
	@mkdir -p build
	node_modules/typescript/bin/tsc -p src/$*/tsconfig.json
src/%/tsconfig.json:
	echo '{ "extends": "../../tsconfig.json", "compilerOptions": { "outFile": "../../build/$*.js" }, "include": [ "**/*.ts", "../sys/loader.js", "../types/*.d.ts" ] }' > $@
clean:
	rm -rf build dist docs/index.html
squeaky: clean
	rm -rf node_modules
cloc: /usr/local/bin/cloc
	cloc --exclude-dir=node_modules,releases,build,dist,.vscodeh,tmp --exclude-list-file .clocignore --by-file-by-lang .
/usr/local/bin/cloc:
	brew install cloc
release: label_release build_release checkout_master
build_release: checkout_release clean $(subst dist,releases/${RELEASE},$(DIST)) docs/index.html checkout_master
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
	node scripts/publish_release.js ${RELEASE} 'src/derlib src/sys include LICENSE' $(patsubst %,src/%,$(PLUGINS)) 
list:
	@echo $(SRC)
documentation: docs/index.html
docs/index.html: help include/index_header.html.txt include/index_middle.html.txt include/index_trailer.html.txt $(wildcard help/*/*)
	cat include/index_header.html.txt \
		help/*/*.index \
		include/index_middle.html.txt \
		help/*/*.content \
		include/index_trailer.html.txt > $@
build/%_help.json: build/%.js scripts/help_generation_wrapper.js 
	node scripts/help_generation_wrapper.js $* > $@
help: $(HELP_JSON) scripts/update_helpfiles.js 
	mkdir -p help
	cd help; for file in $(HELP_JSON) ; do \
		node ../scripts/update_helpfiles.js < ../$${file} ; \
	done
	touch help
