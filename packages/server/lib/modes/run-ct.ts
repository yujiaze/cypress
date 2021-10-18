import type { DataContext } from '@packages/data-context'
import type { LaunchArgs } from '@packages/types'
import { openProject } from '../open_project'
import DevServerPlugin from '../plugins/dev-server'
import { runInternalServer } from './internal-server'
import RunMode from './run'

export interface RunOptions extends LaunchArgs {
  runAllSpecsInSameBrowserSession?: boolean
  ctx?: DataContext
}

export const run = async (options: RunOptions) => {
  // TODO: make sure if we need to run this in electron by default to match e2e behavior?
  options.browser = options.browser || 'electron'
  options.runAllSpecsInSameBrowserSession = true

  DevServerPlugin.emitter.on('dev-server:compile:error', (error: Error) => {
    options.onError(
      new Error(`Dev-server compilation failed. We can not run tests if dev-server can not compile and emit assets, please make sure that all syntax errors resolved before running cypress. \n\n ${error}`),
    )

    // because in run mode we decided to build all the bundle and avoid lazy compilation
    // if we get compilation error (e.g. from webpack) it means that no assets were emitted
    // and we can not run any tests, even if the error belongs to the different module
    // that's why the only way to avoid this is to close the process
    openProject.closeBrowser().then(() => {
      process.exit(1)
    })
  })

  if (process.env.UNIFIED_RUNNER) {
    const { serverPortPromise, ctx } = runInternalServer(options)

    await serverPortPromise
    options.ctx = ctx

    return RunMode.run(options)
  }

  return RunMode.run(options)
}