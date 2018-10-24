# der20
Roll20 API Scripts with shared library code in TypeScript

This is a framework for making many Roll20 scripts from a common code base in TypeScript.  TypeScript source files compile down to a monolithic JavaScript file for each Roll20 script.  

This file contains a tiny AMD loader so they can load into an anonymous scope in Roll20.  

Outside Roll20, code can be referenced from testing executables and run under Node.js for local debugging.  This project will 
not duplicate the effort of "Mock20" and so there is no local emulation of Roll20 functions.  Instead, functionality is 
written in a generic way so it only becomes dependent on Roll20 for final presentation of dialogs etc.

Currently, local testing of individual dialogs can be down in a browser.  See test/show.html for an example.

Requirements: Node.js, GNU Make

Installation: 'make'
