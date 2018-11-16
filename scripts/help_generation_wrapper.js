global.log = (message) => { 
	// ignore
}
console.log = global.log;
global.on = () => {
	// ignore
};
global.der20ScriptMode = 'help generator';
require(`../build/${process.argv[2]}.js`)
