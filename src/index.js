const { platform } = require('os')
const { join, resolve } = require('path')
const core = require('@actions/core')
// const coreCmd = require('@actions/core/lib/command')
const exec = require("@actions/exec")
const io = require('@actions/io')
const httpm = require('@actions/http-client')
const tc = require('@actions/tool-cache')
const { access, readFile, symlink } = require('fs').promises

const exists = file => access(file).then(() => true, () => false)
const shortenHash = hash => hash.substring(0, 7)

const { env } = process
const mock = !!env.MOCK
// TODO: Re-enable this. It fails in the pipeline:
// Error: crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported
const outputs = false // !env.NO_OUTPUTS
let { GITHUB_WORKSPACE: workspace, GITHUB_TOKEN: token } = env
workspace = workspace ? resolve(workspace) : process.cwd()

async function request(path) {
  if (mock) return JSON.parse(await readFile(join(__dirname, `../test/mock/${path}.json`)))
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

async function getMaster() {
  const { commit } = await request('branches/master')
  const { sha, commit: details } = commit
  const { date } = details.author
  return { name: 'master', sha, date }
}

const platformSuffixes = {
  darwin: 'macos',
  linux: 'linux',
  win32: 'windows'
}

async function getRelease(type, check, number) {
  const os = platform()
  const suffix = platformSuffixes[os]
  const archive = `v_${suffix}.zip`
  const releases = await request('releases')
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

async function getCommit(sha) {
  const { commit } = await request(`commits/${sha}`)
  const { date } = commit
  return { name: 'commit', sha, date }
}

const semantic = /^\d+\.\d+\.\d+$/
const versionGetters = {
  master: () => getMaster(),
  weekly: () => getRelease('weekly', /^weekly\.\d+\.\d+$/),
  latest: () => getRelease('release', semantic)
}

function resolveVersion(version) {
  const getVersion = versionGetters[version]
  if (getVersion) return getVersion()
  if (semantic.test(version)) return getRelease('release', semantic, version)
  return getCommit(version)
}

async function getVersion(exePath) {
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

async function install(sha, url, useCache)  {
  sha = shortenHash(sha)
  const exeDir = join(workspace, `../v-${sha}`)
  let exe = 'v'
  if (platform() === 'win32') exe += '.exe'
  const exePath = join(exeDir, exe)
  core.debug(`v will be "${exePath}"`)
  let usedCache = true
  if (useCache && await exists(exePath)) {
    core.info(`"${exePath}" found on the disk`)
  } else {
    const verStamp = `0.0.0-${sha}`
    let cacheDir = useCache && tc.find('v', verStamp)
    if (cacheDir) {
      core.info(`"${cacheDir}" found in the cache`)
    } else {
      usedCache = false
      const pkgDir = join(workspace, `../v-${sha}-all`)
      let archive
      try {
        if (await exists(pkgDir)) await io.rmRF(pkgDir)
        if (await exists(exeDir)) await io.rmRF(exeDir)
        archive = await tc.downloadTool(url)
        await tc.extractZip(archive, pkgDir)
        await io.mkdirP(exeDir)
        core.info(`populate "${exeDir}"`)
        await io.mv(join(pkgDir, `v/${exe}`), exePath)
        await io.mv(join(pkgDir, `v/cmd`), join(exeDir, 'cmd'))
        await io.mv(join(pkgDir, `v/thirdparty`), join(exeDir, 'cmd'))
        await io.mv(join(pkgDir, `v/vlib`), join(exeDir, 'cmd'))
        if (useCache) {
          cacheDir = await tc.cacheDir(exeDir, 'v', verStamp)
          core.info(`cached "${cacheDir}"`)
        }
      } finally {
        await io.rmRF(pkgDir)
        if (archive) await io.rmRF(archive)
      }
    }
    if (!(await exists(exePath))) {
      core.info(`link "${exeDir}"`)
      if (await exists(exeDir)) await io.rmRF(exeDir)
      await symlink(cacheDir, exeDir, 'junction')
    }
  }
  const version = await getVersion(exePath)
  if (outputs) {
    core.setOutput('version', version)
    core.setOutput('bin-path', exeDir)
    core.setOutput('v-bin-path', exePath)
    core.setOutput('used-cache', usedCache)
  }
  return exeDir
}

// async function clone() {
//   try {
//     coreCmd.issueCommand('add-matcher', {}, join(__dirname, 'problem-matcher.json'))
//   } finally {
//     coreCmd.issueCommand('remove-matcher', {owner: 'checkout-git'}, '')
//   }
// }

async function run() {
  const version = core.getInput('version') || 'weekly'
  const useCache = core.getInput('use-cache') !== false
  core.info(`setup V ${version} ${useCache ? 'with' : 'without'} cache`)
  const source = await resolveVersion(version)
  if (!source) throw new Error(`${version} not found`)
  const { name, sha, date, url } = source
  core.info(`${name} is ${sha} from ${date}`)
  let exeDir
  if (url) {
    core.info(`archive at ${url}`)
    exeDir = await install(sha, url, useCache)
  } else {
    throw new Error('build from sources not implemented yet')
  }
  core.info(`add "${exeDir}" to PATH`)
  core.addPath(exeDir)
}

run().catch(err => core.setFailed(err))
