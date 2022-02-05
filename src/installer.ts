import * as core from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import * as tc from '@actions/tool-cache'
import * as util from 'util'
import {exec} from 'child_process'
import os from 'os'

export async function setup(): Promise<void> {
  const token = core.getInput('token', {required: true})
  let requestedVersion = core.getInput('version', {required: false})

  if (requestedVersion === 'latest') {
    core.info('Resolving latest release...')
    requestedVersion = await resolveLatestRelease(token)
  }

  const archive = getArchiveForPlatform()
  const url = `https://github.com/vlang/v/releases/download/${requestedVersion}/${archive}`

  try {
    core.info(`Downloading v ${requestedVersion}`)
    const downloadPath = await tc.downloadTool(url)

    core.info(`Extracting v ${requestedVersion}`)
    const archivePath = await tc.extractZip(downloadPath)
    const binPath = path.join(archivePath, 'v')

    core.info('Adding v to the cache..')
    const version = await getVersion(binPath)
    const cachedPath = await tc.cacheDir(binPath, 'v', version)
    core.info(`Cached v to: ${cachedPath}`)

    core.addPath(cachedPath)
  } catch (error) {
    if (error instanceof tc.HTTPError && error.httpStatusCode === 404) {
      throw new Error(`Unable to find v at ${url}`)
    }

    throw error
  }
}

async function resolveLatestRelease(token: string): Promise<string> {
  const o = github.getOctokit(token)
  const release = await o.rest.repos.getLatestRelease({
    owner: 'vlang',
    repo: 'v'
  })

  return release.data.tag_name
}

function getArchiveForPlatform(): string {
  switch (os.platform()) {
    case 'darwin':
      return 'v_macos.zip'
    case 'win32':
      return 'v_windows.zip'
    case 'linux':
      return 'v_linux.zip'
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`)
  }
}

async function getVersion(binPath: string): Promise<string> {
  const execer = util.promisify(exec)

  const pathToBin = path.join(binPath, 'v')

  const {stdout, stderr} = await execer(`${pathToBin} version`)

  if (stderr !== '') {
    throw new Error(`Unable to get version from ${pathToBin}`)
  }

  if (stdout !== '') {
    return stdout.trim().split(' ')[1]
  }

  core.warning('Unable to get version from v executable.')
  return '0.0.0'
}
