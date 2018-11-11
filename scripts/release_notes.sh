function output() {
	if [ ! -z "${1}" ] ; then 
		echo ========================================================== ; 
		echo "  $2 Release $3" ; 
		echo ========================================================== ; 
		echo ;
		echo "${1}" | sed 's/^    $//g' | cat -s ;
	fi ; 
}

function notes() { 
	rm -f releases/$3.txt ;
	for VERSION in $1 ; do 
		if [ ! -z ${PREVIOUS} ] ; then 
			NOTES=`git log --date=short --format="  [ github commit %h by %an on %ad ]%n%n%w(0,4,4)%s%n%n%w(0,4,4)%N%b%n" $VERSION..$PREVIOUS -- $4` ;
			(output "$NOTES" "$2" "$PREVIOUS") >> releases/$3.txt ;
		fi ; 
		PREVIOUS=$VERSION ;
	done ;
	NOTES=`git log --date=short --format="  [ github commit %h by %an on %ad ]%n%n%w(0,4,4)%s%n%n%w(0,4,4)%N%b%n" $PREVIOUS -- $4` ;
	(output "$NOTES" "$2" "$PREVIOUS") >> releases/$3.txt ;
}

VERSIONS=`git tag -l --sort=-v:refname`; 
mkdir -p releases ;
for PLUGIN in "$@" ; do
	PREVIOUS='' ;
	TITLE="!${PLUGIN}" ;
	notes "${VERSIONS}" "${TITLE}" "${PLUGIN}" "src/${PLUGIN}" ;
done ;

notes "${VERSIONS}" "der20 TypeScript Framework" common "src/derlib src/sys include LICENSE Makefile" ; 