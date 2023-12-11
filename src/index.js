if (typeof global.crypto !== 'object') {
  global.crypto = {}
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = getRandomValues
}

const { basename, join, resolve } = require('path')
const core = require('@actions/core')
const { exec } = require("@actions/exec")
const io = require('@actions/io')
const httpm = require('@actions/http-client')
const tc = require('@actions/tool-cache')
const { access, chmod, copyFile, readFile, symlink } = require('fs').promises
const MersenneTwister = require('mersenne-twister')
const { spawn } = require('child_process')

const { arch, platform } = process

const twister = new MersenneTwister(Math.random() * Number.MAX_SAFE_INTEGER)
function getRandomValues(dest) {
  for (let i = dest.length; --i >= 0;) {
    dest[i] = Math.floor(twister.random() * 256)
  }
  return dest
}

const exists = file => access(file).then(() => true, () => false)

const { env } = process
const mock = !!env.MOCK
let { GITHUB_WORKSPACE: workspace, GITHUB_TOKEN: envToken } = env

async function request(token, path) {
  const http = new httpm.HttpClient()
  const url = `https://api.github.com/repos/vlang/v/${path}`
  core.info(`Get ${url}`)
  const res = await http.get(url, {
		Accept: 'application/json',
		Authorization: `Bearer ${token}`,
    'User-Agent': 'prantlf/setup-v-action',
    'X-GitHub-Api-Version': '2022-11-28'
	})
  if (res.message.statusCode !== 200) {
    const err = new Error(`GET ${url} failed: ${res.message.statusCode} ${res.message.statusMessage}`)
    err.response = res
    throw err
  }
  return JSON.parse(await res.readBody())
}

function delay() {
  const delay = (5 + 5 * Math.random()) * 1000
  core.info(`Wait ${delay} ms before trying again`)
  return new Promise(resolve => setTimeout(resolve, delay))
}

async function retry(action) {
  for (let attempt = 0;;) {
    try {
      return await action()
    } catch (err) {
      if (++attempt === 3) throw err
      core.warning(err)
    }
    await delay()
  }
}

async function requestSafely(token, path) {
  if (mock) {
    const file = join(__dirname, `../test/mock/${path}.json`)
    core.info(`Load ${file}`)
    return JSON.parse(await readFile(file))
  }
  return retry(() => request(token, path))
}

async function getMaster(token) {
  const { commit } = await requestSafely(token, 'branches/master')
  const { sha, commit: details } = commit
  const { date } = details.author
  return { name: 'master', sha, date }
}

const platformSuffixes = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows'
}

const archSuffixes = {
  arm64: 'arm64',
  x64: 'x86_64'
}

async function getRelease(token, type, check, number) {
  const platformSuffix = platformSuffixes[platform]
  const archivePlat = `v_${platformSuffix}.zip`
  const archSuffix = archSuffixes[arch]
  const archivePlatArch = `v_${platformSuffix}_${archSuffix}.zip`
  const releases = await requestSafely(token, 'releases')
  core.debug(`${releases.length} releases found`)
  for (const { tag_name: name, target_commitish: sha, created_at: date, assets } of releases) {
    core.debug(`Check tag ${name}`)
    if (number ? name === number : check.test(name)) {
      for (const { name, browser_download_url } of assets) {
        core.debug(`Check asset ${name}`)
        if (name === archivePlat || name == archivePlatArch) {
          return { name, sha, date, url: browser_download_url }
        }
      }
      core.debug(`Neither ${archivePlat} nor ${archivePlatArch} type found for ${number ? number : type}`)
      return
    }
  }
  core.debug(`No ${number ? number : type} found`)
}

async function getCommit(sha, token) {
  const { commit } = await requestSafely(token, `commits/${sha}`)
  const { date } = commit
  return { name: 'commit', sha, date }
}

const semantic = /^v?\d+\.\d+\.\d+$/
const versionGetters = {
  master: token => getMaster(token),
  weekly: token => getRelease(token, 'weekly', /^weekly\.\d+\.\d+$/),
  latest: token => getRelease(token, 'release', semantic)
}

function resolveVersion(token, version) {
  const getVersion = versionGetters[version]
  if (getVersion) return getVersion(token)
  if (semantic.test(version)) return getRelease(token, 'release', semantic, version)
  return getCommit(token, version)
}

async function getVersion(exePath) {
  if (mock && platform !== 'win32') {
    const path = join(__dirname, '../package.json')
    core.info(`Inspect ${path}`)
    const { version } = JSON.parse(await readFile(path))
    return version
  }

  let out
  await exec(exePath, ['-V'], {
    listeners: {
      stdout: data => {
        out = out ? Buffer.concat([out, data]) : data
      }
    }
  })
  return out.toString().trim()
}

async function install(sha, url, useCache, forceBuild)  {
  const ssha = sha.substring(0, 7)
  const exeDir = join(workspace, `../v-${ssha}`)
  let exe = 'v'
  if (platform === 'win32') exe += '.exe'
  const exePath = join(exeDir, exe)
  core.debug(`V compiled at "${exePath}"`)

  let usedCache = true
  let wasBuilt = false

  if (useCache && await exists(exePath)) {
    core.info(`"${exePath}" found on disk`)
  } else {
    const version = `0.0.0-${ssha}`
    let cacheDir = useCache && tc.find('v', version)

    if (cacheDir) {
      core.info(`"${cacheDir}" found in cache`)
    } else {
      usedCache = false
      const pkgDir = join(workspace, `../v-${sha}`)
      let archive

      try {
        const [exist_pkg, exist_exe] = await Promise.all([
          exists(pkgDir), exists(exeDir)
        ])
        const rm_dirs = []
        if (exist_pkg) rm_dirs.push(io.rmRF(pkgDir))
        if (exist_exe) rm_dirs.push(io.rmRF(exeDir))
        if (rm_dirs.length > 0) await Promise.all(rm_dirs)

        let extractDir, contentDir
        if (forceBuild) url = undefined
        if (url) {
          extractDir = pkgDir
          contentDir = `${pkgDir}/v`
        } else {
          wasBuilt = true
          url = `https://github.com/vlang/v/archive/${sha}.zip`
          extractDir = join(workspace, '..')
          contentDir = pkgDir
        }

        core.info(`Download "${url}"`)
        if (mock) {
          const dir = join(__dirname, '../test/tmp')
          const name = basename(url)
          await io.mkdirP(dir)
          const source = join(__dirname, `../test/mock/assets/${name}`)
          core.info(`Copy "${source}"`)
          archive = join(dir, name)
          await copyFile(source, archive)
        } else {
          archive = await retry(() => tc.downloadTool(url))
        }

        await tc.extractZip(archive, extractDir)
        if (mock && platform !== 'win32') {
          const exeOrigin = `${extractDir}/v/v`
          core.info(`Make "${exeOrigin}" executable`)
          await chmod(exeOrigin, 0o755)
        }

        if (wasBuilt) {
          if (platform !== 'win32') await exec('make', [], { cwd: pkgDir })
          else await exec2('make.bat', { cwd: contentDir, shell: true })
        }

        if (platform !== 'win32') {
          await io.mkdirP(exeDir)
          core.info(`Populate "${exeDir}" with needed files`)
          try {
            await Promise.all([
              [join(contentDir, exe), exePath],
              [join(contentDir, 'cmd'), join(exeDir, 'cmd')],
              [join(contentDir, 'thirdparty'), join(exeDir, 'thirdparty')],
              [join(contentDir, 'vlib'), join(exeDir, 'vlib')]
            ].map(([src, dst]) => io.mv(src, dst)))
          } catch (err) {
            await io.rmRF(exeDir)
            throw err
          }
        } else {
          core.info(`Populate "${exeDir}" with all files`)
          await io.mv(contentDir, exeDir)
        }

        try {
          if (useCache) {
            cacheDir = await tc.cacheDir(exeDir, 'v', version)
            core.info(`Cached "${cacheDir}"`)
          }
        } catch (err) {
          await io.rmRF(exeDir)
          throw err
        }
      } finally {
        await Promise.all([
          io.rmRF(pkgDir),
          archive && io.rmRF(archive)
        ])
      }
    }

    if (!(await exists(exePath))) {
      core.info(`Link "${exeDir}"`)
      if (await exists(exeDir)) await io.rmRF(exeDir)
      await symlink(cacheDir, exeDir, 'junction')
    }
  }

  return { exeDir, exePath, usedCache, wasBuilt }
}

async function dependencies(exePath, globalDeps, modulesDir)  {
  let manifest
  try {
    const vmod = join(workspace, 'v.mod')
    core.info(`Checking "${vmod}`)
    manifest = await readFile(vmod, 'utf8')
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    core.info('No module manifest found')
    return
  }
  if (/dependencies\s*:/.test(manifest) && !/dependencies\s*:\s*\[\s*\]/.test(manifest)) {
    const params = ['install']
    if (core.isDebug()) {
      core.debug(`Current working directory: "${process.cwd()}`)
      params.unshift('-v')
    }
    const options = {}
    if (!globalDeps) {
      const modules = modulesDir || 'modules'
      if (!modulesDir && await exists('src')) modules = join('src', modules)
      options.env = { ...process.env, VMODULES: modules }
    }
    await exec(exePath, params, options)
  } else {
    core.info('No dependencies found')
  }
}

function exec2(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options)
      .on('error', reject)
      .on('exit', code => code ? reject(new Error(`"${command}" exited with ${code}`)) : resolve());
    child.stdout.on('data', data => process.stdout.write(data.toString()));
    child.stderr.on('data', data => process.stderr.write(data.toString()));
  })
}

async function run() {
  const version = core.getInput('version')
  const useCache = core.getBooleanInput('use-cache')
  const forceBuild = core.getBooleanInput('force-build')
  const installDeps = core.getBooleanInput('install-dependencies')
  const globalDeps = core.getBooleanInput('global-dependencies')
  const modulesDir = core.getInput('modules-dir')
  core.info(`Setup V ${version}${useCache ? '' : ', no cache'}${forceBuild ? ', forced build' : ''}${installDeps ? globalDeps ? ', global' : ', local' : ', no'} dependencies${ modulesDir ? 'in "' + modulesDir + '"' : ''}`)
  const token = core.getInput('token') || envToken
  if (!token) throw new Error('missing token')

  if (workspace) workspace = resolve(workspace)
  else throw new Error('missing workspace')

  const source = await resolveVersion(token, version)
  if (!source) throw new Error(`${version} not found`)
  const { name, sha, date, url } = source
  core.info(`Resolved ${name} as ${sha} from ${date}`)
  if (url) core.info(`Archive is ${url}`)

  const { exeDir, exePath, usedCache, wasBuilt } = await install(sha, url, useCache, forceBuild)

  core.info(`Add "${exeDir}" to PATH`)
  core.addPath(exeDir)

  const actualVersion = await getVersion(exePath)
  core.setOutput('version', actualVersion)
  core.setOutput('bin-path', exeDir)
  core.setOutput('v-bin-path', exePath)
  core.setOutput('used-cache', usedCache)
  core.setOutput('was-built', wasBuilt)

  if (installDeps) await dependencies(exePath, globalDeps, modulesDir)
}

run().catch(err => core.setFailed(err))
