require('node-self')
require('unfetch/polyfill')

const { platform } = require('os')
const { join, resolve } = require('path')
const core = require('@actions/core')
// const coreCmd = require('@actions/core/lib/command')
const exec = require("@actions/exec")
const io = require('@actions/io')
const tc = require('@actions/tool-cache')
const { access, readFile, symlink } = require('fs').promises

const exists = file => access(file).then(() => true, () => false)
const shortenHash = hash => hash.substring(0, 7)

const mock = !!process.env.MOCK
let { GITHUB_WORKSPACE: workspace } = process.env
workspace = workspace ? resolve(workspace) : process.cwd()

async function request(path) {
  if (mock) return JSON.parse(await readFile(join(__dirname, `../test/mock/${path}.json`)))
  const res = await fetch(`https://api.github.com/repos/vlang/v/${path}`)
  if (!res.ok) {
    const err = new Error(res.statusText)
    err.response = res
    throw err
  }
  return res.json()
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
    core.debug(`checking ${name}`)
    if (number ? name === number : check.test(name)) {
      let url = `unknown ${os}`
      for (const { name, browser_download_url } of assets) {
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

const versionGetters = {
  master: () => getMaster(),
  weekly: () => getRelease('weekly', /^weekly\.\d+\.\d+$/),
  latest: () => getRelease('release', /^\d+\.\d+\.\d+$/)
}

function resolveVersion(version) {
  const getVersion = versionGetters[version]
  if (getVersion) return getVersion()
  if (/^\d+\.\d+\.\d+$/.test(version))
    return getRelease('release', /^\d+\.\d+\.\d+$/, version)
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
  const verStamp = `0.0.0-${sha}`
  const exeDir = join(workspace, verStamp)
  core.debug(`v path will be "${exeDir}"`)
  let exe = 'v'
  if (platform() === 'win32') exe += '.exe'
  const exePath = join(exeDir, exe)
  let usedCache = true
  if (!useCache || !(await exists(exePath))) {
    let cacheDir = useCache && tc.find('v', verStamp)
    if (!cacheDir) {
      usedCache = false
      const pkgDir = join(workspace, `unpack-${verStamp}`)
      let archive
      try {
        if (await exists(pkgDir)) await io.rmRF(pkgDir)
        if (await exists(exeDir)) await io.rmRF(exeDir)
        archive = await tc.downloadTool(url)
        await tc.extractZip(archive, pkgDir)
        await io.mkdirP(exeDir)
        await io.mv(join(pkgDir, `v/${exe}`), exePath, { force: true })
        if (useCache) cacheDir = await tc.cacheDir(exeDir, 'v', verStamp)
      } finally {
        await io.rmRF(pkgDir)
        if (archive) await io.rmRF(archive)
      }
    }
    if (!(await exists(exePath))) {
      core.debug(`linking "${cacheDir}" to v path`)
      if (await exists(exeDir)) await io.rmRF(exeDir)
      await symlink(cacheDir, exeDir, 'junction')
    }
  }
  const version = await getVersion(exePath)
  core.setOutput('version', version)
  core.setOutput('bin-path', exeDir)
  core.setOutput('v-bin-path', exePath)
  core.setOutput('used-cache', usedCache)
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
  core.info(`Setting up V ${version} ${useCache ? 'with' : 'without'} cache`)
  const source = await resolveVersion(version)
  if (!source) throw new Error(`${version} not found`)
  const { name, sha, date, url } = source
  core.info(`${name} is ${sha} from ${date}, ${url}`)
  let exeDir
  if (url) {
    exeDir = await install(sha, url, useCache)
  } else {
    throw new Error('building from sources not implemented yet')
  }
  core.addPath(exeDir)
}

run().catch(err => core.setFailed(err))
