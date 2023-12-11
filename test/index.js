const { join } = require('path')
const { spawn } = require('child_process')
const { access, rm } = require('fs').promises

const env = {
  ...process.env,
  GITHUB_TOKEN: 'token',
  GITHUB_WORKSPACE: join(__dirname, 'wksp/repo'),
  RUNNER_TEMP: join(__dirname, 'tmp'),
  RUNNER_TOOL_CACHE: join(__dirname, 'cache'),
  INPUT_VERSION: 'weekly',
  'INPUT_USE-CACHE': 'true',
  'INPUT_FORCE-BUILD': 'false',
  'INPUT_INSTALL-DEPENDENCIES': 'true',
  'INPUT_GLOBAL-DEPENDENCIES': 'true',
  'INPUT_MODULES-DIR': '',
  INPUT_TOKEN: 'token',
  MOCK: '1'
}

const exeDir = join(__dirname, '/wksp/v-692624b')
const exeName = join(exeDir, 'v')
const cwd = join(__dirname, '..')

function exec(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: true, cwd, env  })
      .on('error', reject)
      .on('exit', code => code ? reject(new Error(`'${command}' exited with ${code}`)) : resolve())
    child.stdout.on('data', data => process.stdout.write(data.toString()))
    child.stderr.on('data', data => process.stderr.write(data.toString()))
  })
}

async function test(name) {
  console.log(`----------------------------------------
${name}
----------------------------------------`)
  await exec('node', [join(cwd, 'dist/index')])
  console.log('check v compiler')
  await access(exeName)
}

async function run() {
  console.log('clean up')
  await Promise.all([
    rm(join(__dirname, 'wksp'), { recursive: true, force: true }),
    rm(env.RUNNER_TEMP, { recursive: true, force: true }),
    rm(env.RUNNER_TOOL_CACHE, { recursive: true, force: true }),
    rm(join(cwd, 'dist/mock'), { recursive: true, force: true })
  ])

  await test('install from archive')
  await test('skip already installed')

  await rm(exeName)
  await test('install missing executable from cache')

  await rm(exeDir, { recursive: true }),
  await test('install missing directory from cache')

  console.log('done')
}

run().catch(err => {
  console.error(err)
  process.exitCode = 1
})
