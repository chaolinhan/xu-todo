import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Node 25 enables its file-based localStorage globally. Keep every Vitest worker
// on jsdom's per-origin browser storage, matching the application's environment.
const runner=fileURLToPath(new URL('../node_modules/vitest/vitest.mjs',import.meta.url))
const child=spawn(process.execPath,[runner,...process.argv.slice(2)],{
  stdio:'inherit',
  env:{...process.env,NODE_OPTIONS:`${process.env.NODE_OPTIONS??''} --no-experimental-webstorage`.trim()},
})
child.on('error',error=>{console.error(error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
