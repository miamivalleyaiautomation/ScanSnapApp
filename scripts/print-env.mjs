// FILE: scripts/print-env.mjs
// Why: Print env early to catch wrong Node/npm and CI flags.
console.log('--- ENV SNAPSHOT ---')
console.log('node:', process.version)
console.log('platform:', process.platform, process.arch)
console.log('npm_config_user_agent:', process.env['npm_config_user_agent'] || '(n/a)')
console.log('CI:', process.env.CI)
console.log('NODE_VERSION env:', process.env.NODE_VERSION)
console.log('---------------------')
