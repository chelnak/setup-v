import * as core from '@actions/core'
import {setup} from './installer'

async function run(): Promise<void> {
  try {
    await setup()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
