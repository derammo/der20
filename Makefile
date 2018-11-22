PLUGINS := league anonymous setup
EXECUTABLES := parser_test help_test

SRC := $(shell find src -name "*.ts" -or -name "*.js")
DEFAULT := $(word 1,$(EXECUTABLES))
DIST := $(patsubst %,dist/der20_%_complete.js,$(PLUGINS)) dist/der20_library.js $(patsubst %,dist/der20_%_plugin.js,$(PLUGINS))
HELP_JSON := $(patsubst %,build/%_help.json,$(PLUGINS))
LICENSE_LENGTH := $(word 1, $(shell wc -l LICENSE))
LIB_SOURCES := $(shell find src/der20 -name "*.ts" | grep -v 'src/der20/library.ts' | sort)
TSC := node_modules/typescript/bin/tsc

.PHONY: all clean run release checkout_release build_release publish create_draft plugins executables documentation relnotes
.PRECIOUS: build/%.js src/%/tsconfig.json merged/build/der20/%.js merged/build/der20/%_plugin.js

all: node_modules plugins executables documentation
plugins: $(DIST)
executables: $(patsubst %,build/%.js,$(EXECUTABLES))
theoretical: build/empty.js build/minimal.js dist/der20_minimal_plugin.js
node_modules:
	npm install || echo ignoring result from npm install, since it is only used for publishing release
dist/der20_%_complete.js: build/%.js include/header.js.txt include/trailer.js.txt Makefile LICENSE
	@mkdir -p dist
	@rm -f $@
	@head -1 LICENSE > $@
	@echo ' *' $* DER20 DEVELOPMENT BUILD >> $@
	@echo ' *' >> $@
	@tail -n +2 LICENSE >> $@
	@sed \
		-e 's/DER20_MAGIC_LICENSE_TEXT_LENGTH/$(LICENSE_LENGTH)/g' \
		-e 's/DER20_MAGIC_FILE_NAME/der20_$*.js/g' \
		< include/header.js.txt >> $@
	@sed \
		-e 's/    Object\.defineProperty(.*);$$//' \
		-e 's_^//. sourceMappingURL.*$$__' < $< \
		| cat -s >> $@
	@cat include/trailer.js.txt >> $@
	@chmod 444 $@
	@echo packaging $< as $@ for Roll20
dist/der20_library.js: merged/build/der20/library.js include/library_header.js.txt include/library_trailer.js.txt Makefile LICENSE
	@mkdir -p dist
	@rm -f $@
	@head -1 LICENSE > $@
	@echo ' *' der20 library DER20 DEVELOPMENT BUILD >> $@
	@echo ' *' >> $@
	@tail -n +2 LICENSE >> $@
	@sed \
		-e 's/DER20_MAGIC_LICENSE_TEXT_LENGTH/$(LICENSE_LENGTH)/g' \
		-e 's/DER20_MAGIC_NAME/library/g' \
		< include/library_header.js.txt >> $@
	@sed \
		-e 's/    Object\.defineProperty(.*);$$//' \
		-e 's_^//. sourceMappingURL.*$$__' < $< >> $@
	@cat include/library_trailer.js.txt >> $@
	@chmod 444 $@
	@echo packaging $< as separate library $@ for Roll20
dist/der20_%_plugin.js: merged/build/der20/%_plugin.js include/plugin_header.js.txt include/plugin_trailer.js.txt Makefile LICENSE
	@mkdir -p dist
	@rm -f $@
	@head -1 LICENSE > $@
	@echo ' *' der20 $* plugin DER20 DEVELOPMENT BUILD >> $@
	@echo ' *' >> $@
	@tail -n +2 LICENSE >> $@
	@sed \
		-e 's/DER20_MAGIC_LICENSE_TEXT_LENGTH/$(LICENSE_LENGTH)/g' \
		-e 's/DER20_MAGIC_NAME/$*/g' \
		< include/plugin_header.js.txt >> $@
	@sed \
		-e 's/    Object\.defineProperty(.*);$$//' \
		-e 's_^//. sourceMappingURL.*$$__' < $< >> $@
	@sed \
		-e 's/DER20_MAGIC_LICENSE_TEXT_LENGTH/$(LICENSE_LENGTH)/g' \
		-e 's/DER20_MAGIC_NAME/$*/g' \
		< include/plugin_trailer.js.txt >> $@	
	@chmod 444 $@
	@echo packaging $< as as separate plugin $@ for Roll20
run: build/$(DEFAULT).js tmp
	node build/$(DEFAULT).js | egrep --color -e '^\tresult of parse: {"kind":3.*$$' -e $$
tmp:
	mkdir tmp
print:
	json_pp < tmp/der20_$(DEFAULT)_state.json
build/%.js: $(SRC) src/plugins/%/tsconfig.json src/plugins/% node_modules
	@mkdir -p build
	$(TSC) -p src/plugins/$*/tsconfig.json
build/%.js: $(SRC) src/executables/%/tsconfig.json src/executables/% node_modules
	@mkdir -p build
	$(TSC) -p src/executables/$*/tsconfig.json
src/plugins/%/tsconfig.json:
	@echo '{ "extends": "../tsconfig_plugins.json", "compilerOptions": { "outFile": "../../../build/$*.js" }, "include": [ "**/*.ts", "../../sys/loader.js", "../../types/*.d.ts" ] }' > $@
src/executables/%/tsconfig.json:
	@echo '{ "extends": "../tsconfig_executables.json", "compilerOptions": { "outFile": "../../../build/$*.js" }, "include": [ "**/*.ts", "../../sys/loader.js", "../../types/*.d.ts" ] }' > $@
clean:
	rm -rf build dist docs/index.html merged/src merged/compile merged/build merged/tsconfig_%.json
squeaky: clean
	rm -rf node_modules
cloc: /usr/local/bin/cloc
	cloc --exclude-dir=node_modules,releases,build,dist,.vscodeh,tmp,merged --exclude-list-file .clocignore --by-file-by-lang .
/usr/local/bin/cloc:
	brew install cloc
release: label_release build_release checkout_master
build_release: checkout_release clean $(subst dist,releases/${RELEASE},$(DIST)) docs/index.html checkout_master relnotes
relnotes:
	scripts/release_notes.sh $(PLUGINS)
checkout_release:
	git checkout v${RELEASE}
label_release:
	git tag v${RELEASE}
checkout_master:
	git checkout master
releases/${RELEASE}/%.js: dist/%.js LICENSE
	@mkdir -p releases/${RELEASE}
	sed -e 's/DER20 DEVELOPMENT BUILD/v${RELEASE}/g' < $< > $@
publish: checkout_release create_draft checkout_master
create_draft:
	git push origin v${RELEASE}
	node scripts/publish_release.js ${RELEASE} 'src/der20 src/sys include LICENSE Makefile' $(patsubst %,src/plugins/%,$(PLUGINS)) 
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
merged/build/der20/%_plugin.js: merged/compile/der20/%_plugin.js Makefile
	@echo translating $< to $@
	@mkdir -p merged/build/der20
	@sed \
		-e 's/^define(.*$$/    let exports = {};/' \
		-e 's/\([[:space:]\[(]\)library_[0-9]*\./\1der20_library./g' \
		-e 's/^});//' \
		$< > $@
	# WARNING: to replace exports with	-e 's/^[[:space:]]*exports\.[[:alnum:]]* = [[:alnum:]]*;$$//g' 
	# we first have to deal with the helper code that uses the exports as locals (see code for LeagueModule namespace)
	@cat src/sys/plugin_loader.js >> $@
merged/compile/der20/%_plugin.js: merged/src/der20/%_plugin.ts merged/compile/der20/library.js src/sys/plugin_loader.js merged/tsconfig_%_plugin.json Makefile
	$(TSC) -p merged/tsconfig_$*_plugin.json
merged/build/der20/library.js: merged/compile/der20/library.js Makefile
	@echo translating $< to $@
	@mkdir -p merged/build/der20
	@sed \
		-e 's/^define(.*$$/    let exports = {};/' \
		-e 's/\([[:space:]\[(]\)library_[0-9]*\./\1der20_library./g' \
		-e 's/^});//' \
		$< > $@
	@cat src/sys/library_loader.js >> $@
merged/compile/der20/library.js: merged/src/der20/library.ts src/sys/library_loader.js merged/tsconfig_library.json Makefile
	$(TSC) -p merged/tsconfig_library.json
merged/tsconfig_%.json: merged/src/der20/%.ts Makefile
	@echo '{ "extends": "./tsconfig.json", "compilerOptions": { "rootDir": "src", "baseUrl": "src", "outDir": "compile", "outFile": null, "noEmitHelpers": true },' > $@
	@echo '  "include": ["src/der20/$*.ts", "src/types/*.d.ts"] }' >> $@
merged/src/der20/library.ts: $(LIB_SOURCES) build/tsmerge.js merged/src/types Makefile
	@echo merging sources into $@
	@mkdir -p merged/src/der20
	@node build/tsmerge.js $(LIB_SOURCES) > $@
build/tsmerge.js: scripts/tsmerge.ts
	$(TSC) --target ES6 --outdir build $<
merged/src/types:
	@mkdir -p merged/src
	ln -s ../../src/types merged/src/types
.SECONDEXPANSION:
merged/src/der20/%_plugin.ts: $$(wildcard src/plugins/%/*.ts) $$(wildcard src/plugins/%/*/*.ts) build/tsmerge.js merged/src/types
	@echo merging sources into $@
	@mkdir -p merged/src/der20
	@node build/tsmerge.js $(wildcard src/plugins/$*/*.ts) $(wildcard  src/plugins/$*/*/*.ts) > $@