import * as core from '@actions/core'
import * as github from '@actions/github'
import * as tc from '@actions/tool-cache'
import * as i from '../src/installer'
import osm from 'os'
import path from 'path'

describe('installer', () => {
  let inputs = {} as any
  let os = {} as any

  // GitHub spies
  let inSpy: jest.SpyInstance
  let platSpy: jest.SpyInstance
  let dlSpy: jest.SpyInstance
  let exSpy: jest.SpyInstance
  let cacheSpy: jest.SpyInstance
  let githubSpy: jest.SpyInstance
  let pathSpy: jest.SpyInstance

  // System spies
  let execSpy: jest.SpyInstance
  let cnSpy: jest.SpyInstance

  beforeAll(() => {
    process.env['GITHUB_PATH'] = ''
    console.log('::stop-commands::stoptoken')
  })

  beforeEach(() => {
    inputs = {}
    inSpy = jest.spyOn(core, 'getInput')
    inSpy.mockImplementation((name) => inputs[name])

    githubSpy = jest.spyOn(github, 'getOctokit')
    dlSpy = jest.spyOn(tc, 'downloadTool')
    exSpy = jest.spyOn(tc, 'extractZip')
    cacheSpy = jest.spyOn(tc, 'cacheDir')
    pathSpy = jest.spyOn(core, 'addPath')

    os = {}
    platSpy = jest.spyOn(osm, 'platform')
    platSpy.mockImplementation(() => os['platform'])
    execSpy = jest.spyOn(i, 'execer')
    cnSpy = jest.spyOn(process.stdout, 'write')
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  afterAll(async () => {
    console.log('::stoptoken::') // Re-enable executing of runner commands when running tests in actions
  }, 100000)

  test('normalizePlatform returns correct result for win32', () => {
    os['platform'] = 'win32'
    expect(i.normalizePlatform()).toBe('windows')
  })

  test('normalizePlatform returns correct result for darwin', () => {
    os['platform'] = 'darwin'
    expect(i.normalizePlatform()).toBe('macos')
  })

  test('normalizePlatform returns correct result for linux', () => {
    os['platform'] = 'linux'
    expect(i.normalizePlatform()).toBe('linux')
  })


  test('getVersion returns correct version string', async () => {
    const o = {
      stdout: 'V 0.2.4 b9fce4e',
      stderr: '',
    }
    execSpy.mockImplementation(() => Promise.resolve(o))
    expect(await i.getVersion('fake_path')).toBe('0.2.4')
  })

  test('getVersion handles stderr', async () => {
    const o = {
      stdout: '',
      stderr: 'oh noes',
    }
    const pathToBin = path.join('fake_path', 'v')
    execSpy.mockImplementation(() => Promise.resolve(o))
    await expect(i.getVersion('fake_path')).rejects.toThrow(
      Error(`Unable to get version from ${pathToBin}`)
    )
  })

  test('resolveLatestVersion returns a valid tag name', async () => {
    githubSpy.mockImplementation(() => ({
      rest: {
        repos: {
          getLatestRelease: () =>
            Promise.resolve({
              data: {
                tag_name: 'v1.0.0',
              },
            }),
        },
      },
    }))

    expect(await i.resolveLatestRelease('token')).toBe('v1.0.0')
  })

  test('setup returns the expected result', async () => {
    inputs['version'] = 'v1.0.0'
    inputs['token'] = 'token'

    os['platform'] = 'darwin'
    githubSpy.mockImplementation(() => ({
      rest: {
        repos: {
          getLatestRelease: () =>
            Promise.resolve({
              data: {
                tag_name: 'v1.0.0',
              },
            }),
        },
      },
    }))

    dlSpy.mockImplementation(() => '/some/temp/path')
    exSpy.mockImplementation(() => '/some/other/temp/path')

    const o = {
      stdout: 'V 0.2.4 b9fce4e',
      stderr: '',
    }
    execSpy.mockImplementation(() => Promise.resolve(o))

    const cachePath = '/some/cache/path'
    cacheSpy.mockImplementation(() => cachePath)

    const expPath = path.join(cachePath, 'v')

    await i.setup()

    expect(dlSpy).toHaveBeenCalled()
    expect(exSpy).toHaveBeenCalled()
    expect(pathSpy).toHaveBeenCalled()
  })
})
