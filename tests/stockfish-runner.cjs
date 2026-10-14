// Load the vendor factory explicitly: portable across Node's CJS/ESM detection.
const path = require('path');
const enginePath = path.resolve(process.argv[2]);
const pending = [];
let engine;
function command(line) {
  if (line === 'quit') process.exit(0);
  if (engine) engine.ccall('command', null, ['string'], [line], {async:/^go\b/.test(line)});
  else pending.push(line);
}
require('readline').createInterface({input:process.stdin}).on('line',command);
require(enginePath)()({arguments:[],locateFile:()=>enginePath.replace(/\.js$/,'.wasm'),listener:line=>process.stdout.write(line+'\n')}).then(instance=>{
  engine=instance;
  pending.splice(0).forEach(command);
}).catch(error=>{console.error(error);process.exit(1)});
