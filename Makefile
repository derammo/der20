SCRIPTS := parser_test rewards

SRC := $(wildcard src/*.js)
SCRIPT := dist/rewards_api_script.js
DEFAULT := $(word 1,$(SCRIPTS))
BUILD := $(patsubst %,dist/der20_%.js,$(SCRIPTS))

.PHONY: all clean run release checkout_release build_release publish
.PRECIOUS: build/%.js src/%/tsconfig.json

all: $(BUILD)
dist/der20_%.js: build/%.js include/header.js.txt include/trailer.js.txt
	mkdir -p dist
	cat include/header.js.txt $< include/trailer.js.txt > $@
run: build/$(DEFAULT).js
	node build/$(DEFAULT).js
build/%.js: $(SRC) src/%/tsconfig.json
	mkdir -p build
	tsc -p src/$*/tsconfig.json
src/%/tsconfig.json:
	echo '{ "extends": "../../tsconfig.json", "compilerOptions": { "outFile": "../../build/$*.js" }, "include": [ "**/*.ts", "../sys/loader.js" ] }' > $@
clean:
	rm -rf build dist
release: label_release build_release checkout_master
build_release: checkout_release clean $(subst dist,releases/${RELEASE},$(BUILD)) checkout_master
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
publish:
	git push origin v${RELEASE}
	node scripts/publish_release.js ${RELEASE}
