const { platform } = require('os')
const { basename, join, resolve } = require('path')
const core = require('@actions/core')
const exec = require("@actions/exec")
const io = require('@actions/io')
const httpm = require('@actions/http-client')
const tc = require('@actions/tool-cache')
const { access, chmod, copyFile, readFile, symlink } = require('fs').promises

const exists = file => access(file).then(() => true, () => false)

const { env } = process
const mock = !!env.MOCK
let { GITHUB_WORKSPACE: workspace, GITHUB_TOKEN: envToken } = env

const trueValues = [true, 'true', 'yes', '1']
const toBoolean = str => trueValues.includes(str.toLowerCase())

async function _retry(action) {
  for (let attempt = 0;;) {
    try {
      return await action()
    } catch (err) {
      if (++attempt === 3) throw err
      core.warning(err)
    }

    const seconds = Math.floor(Math.random() * (20 - 10 + 1)) + 10
    core.info(`wait ${seconds} seconds before trying again`)
    await new Promise(resolve => setTimeout(resolve, seconds * 1000))
  }
}

async function request(token, path) {
  if (mock) {
    const file = join(__dirname, `../test/mock/${path}.json`)
    core.info(`load ${file}`)
    return JSON.parse(await readFile(file))
  }
  const http = new httpm.HttpClient()
  const url = `https://api.github.com/repos/vlang/v/${path}`
  core.info(`get ${url}`)
  const res = await http.get(url, {
		Accept: 'application/json',
		Authorization: `Bearer ${token}`,
    'User-Agent': 'prantlf/setup-v-action',
    'X-GitHub-Api-Version': '2022-11-28'
	})
  if (res.message.statusCode !== 200) {
    const err = new Error(`${res.message.statusCode} ${res.message.statusMessage}`)
    err.response = res
    throw err
  }
  return JSON.parse(await res.readBody())
}

async function getMaster(token) {
  const { commit } = await request(token, 'branches/master')
  const { sha, commit: details } = commit
  const { date } = details.author
  return { name: 'master', sha, date }
}

const platformSuffixes = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows'
}

async function getRelease(token, type, check, number) {
  const os = platform()
  const suffix = platformSuffixes[os]
  const archive = `v_${suffix}.zip`
  const releases = await request(token, 'releases')
  core.debug(`${releases.length} releases found`)
  for (const { tag_name: name, target_commitish: sha, created_at: date, assets } of releases) {
    core.debug(`check tag ${name}`)
    if (number ? name === number : check.test(name)) {
      let url
      for (const { name, browser_download_url } of assets) {
        core.debug(`check asset ${name}`)
        if (name === archive) {
          url = browser_download_url
          break
        }
      }
      return { name, sha, date, url }
    }
  }
  core.debug(`no ${number ? number : type} found`)
}

async function getCommit(sha, token) {
  const { commit } = await request(token, `commits/${sha}`)
  const { date } = commit
  return { name: 'commit', sha, date }
}

const semantic = /^\d+\.\d+\.\d+$/
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
  if (mock && platform() !== 'win32') {
    const path = join(__dirname, '../package.json')
    core.info(`inspect ${path}`)
    const { version } = JSON.parse(await readFile(path))
    return version
  }

  let out
  await exec.exec(exePath, ['-V'], {
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
  if (platform() === 'win32') exe += '.exe'
  const exePath = join(exeDir, exe)
  core.debug(`v will be "${exePath}"`)

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
        if (await exists(pkgDir)) await io.rmRF(pkgDir)
        if (await exists(exeDir)) await io.rmRF(exeDir)

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

        core.info(`download "${url}"`)
        if (mock) {
          const dir = join(__dirname, '../test/tmp')
          const name = basename(url)
          await io.mkdirP(dir)
          const source = join(__dirname, `../test/mock/assets/${name}`)
          core.info(`copy "${source}"`)
          archive = join(dir, name)
          await copyFile(source, archive)
        } else {
          archive = await tc.downloadTool(url)
        }

        await tc.extractZip(archive, extractDir)
        if (mock && platform() !== 'win32') {
          const exeOrigin = `${extractDir}/v/v`
          core.info(`make "${exeOrigin}" executable`)
          await chmod(exeOrigin, 0o755)
        }

        if (wasBuilt) await exec.exec('make', [], { cwd: pkgDir })

        await io.mkdirP(exeDir)
        core.info(`populate "${exeDir}"`)
        try {
          await Promise.all([
            [join(contentDir, exe), exePath],
            [join(contentDir, 'cmd'), join(exeDir, 'cmd')],
            [join(contentDir, 'thirdparty'), join(exeDir, 'thirdparty')],
            [join(contentDir, 'vlib'), join(exeDir, 'vlib')]
          ].map(([src, dst]) => io.mv(src, dst)))

          if (useCache) {
            cacheDir = await tc.cacheDir(exeDir, 'v', version)
            core.info(`cached "${cacheDir}"`)
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
      core.info(`link "${exeDir}"`)
      if (await exists(exeDir)) await io.rmRF(exeDir)
      await symlink(cacheDir, exeDir, 'junction')
    }
  }

  return { exeDir, exePath, usedCache, wasBuilt }
}

async function dependencies(exePath)  {
  let manifest
  try {
    manifest = await readFile('v.mod', 'utf8')
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    core.info('no module manifest found')
    return
  }
  if (/dependencies\s*:\s*\[\s*\]/.test(manifest)) {
    await exec.exec(exePath, ['install'])
  } else {
    core.info('no dependencies found')
  }
}

async function run() {
  const version = core.getInput('version') || 'weekly'
  const useCache = toBoolean(core.getInput('use-cache'))
  const forceBuild = toBoolean(core.getInput('force-build'))
  const installDeps = toBoolean(core.getInput('install-dependencies'))
  core.info(`setup V ${version}${useCache ? '' : ', no cache'}${forceBuild ? ', forced build' : ''}${installDeps ? '' : ', no dependencies'}`)

  const token = core.getInput('token') || envToken
  if (!token) throw new Error('missing token')

  if (workspace) workspace = resolve(workspace)
  else throw new Error('missing workspace')

  const source = await resolveVersion(token, version)
  if (!source) throw new Error(`${version} not found`)
  const { name, sha, date, url } = source
  core.info(`${name} is ${sha} from ${date}`)
  if (url) core.info(`archive at ${url}`)

  const { exeDir, exePath, usedCache, wasBuilt } = await install(sha, url, useCache, forceBuild)

  core.info(`add "${exeDir}" to PATH`)
  core.addPath(exeDir)

  const actualVersion = await getVersion(exePath)
  // TODO: Re-enable this. It fails in the pipeline:
  // Error: crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported
  if (!exeDir) {
    core.setOutput('version', actualVersion)
    core.setOutput('bin-path', exeDir)
    core.setOutput('v-bin-path', exePath)
    core.setOutput('used-cache', usedCache)
    core.setOutput('was-built', wasBuilt)
  }

  if (installDeps) await dependencies(exePath)
}

run().catch(err => core.setFailed(err))
