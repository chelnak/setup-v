import * as core from '@actions/core'
import * as cp from 'child_process'
import * as github from '@actions/github'
import * as path from 'path'
import * as tc from '@actions/tool-cache'
import * as util from 'util'
import os from 'os'

const REPO_OWNER = 'vlang'
const REPO_NAME = 'v'

export const execer = util.promisify(cp.exec)

export async function setup(): Promise<void> {
  const token = core.getInput('token', { required: true })
  let requestedVersion = core.getInput('version', { required: false })

  if (requestedVersion === 'latest') {
    core.info('Resolving latest release...')
    requestedVersion = await resolveLatestRelease(token)
  }

  const platform = normalizePlatform()
  const archive = `v_${platform}.zip`
  const url = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${requestedVersion}/${archive}`

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

export async function resolveLatestRelease(token: string): Promise<string> {
  const o = github.getOctokit(token)
  const release = await o.rest.repos.getLatestRelease({
    owner: REPO_OWNER,
    repo: REPO_NAME,
  })

  return release.data.tag_name
}

export function normalizePlatform(): string {
  const platform = os.platform()
  const platformMap: Record<string, string> = {
    darwin: 'macos',
    win32: 'windows',
  }

  return platformMap[platform.toString()] || platform
}

export async function getVersion(binPath: string): Promise<string> {
  const pathToBin = path.join(binPath, 'v')

  const { stdout, stderr } = await execer(`${pathToBin} version`)

  if (stderr !== '') {
    throw new Error(`Unable to get version from ${pathToBin}`)
  }

  if (stdout !== '') {
    return stdout.trim().split(' ')[1]
  }

  core.warning('Unable to get version from v executable.')
  return '0.0.0'
}
