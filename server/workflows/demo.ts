import { sleep, getWritable } from 'workflow'

export type DemoEvent = {
  step: string
  status: 'started' | 'done'
  at: number
}

async function emit(event: DemoEvent) {
  'use step'
  const writer = getWritable<DemoEvent>().getWriter()
  try {
    await writer.write(event)
  } finally {
    writer.releaseLock()
  }
}

async function install() {
  'use step'
  return { packages: 682 }
}

async function compile() {
  'use step'
  return { modules: 1428 }
}

async function test() {
  'use step'
  return { passed: 42, failed: 0 }
}

async function deploy() {
  'use step'
  return { url: 'https://example.vercel.app' }
}

export async function demoPipeline(project: string) {
  'use workflow'

  await emit({ step: `start:${project}`, status: 'started', at: Date.now() })

  await emit({ step: 'install', status: 'started', at: Date.now() })
  const installed = await install()
  await sleep('1s')
  await emit({ step: 'install', status: 'done', at: Date.now() })

  await emit({ step: 'compile', status: 'started', at: Date.now() })
  const compiled = await compile()
  await sleep('2s')
  await emit({ step: 'compile', status: 'done', at: Date.now() })

  await emit({ step: 'test', status: 'started', at: Date.now() })
  const tested = await test()
  await sleep('1s')
  await emit({ step: 'test', status: 'done', at: Date.now() })

  await emit({ step: 'deploy', status: 'started', at: Date.now() })
  const deployed = await deploy()
  await emit({ step: 'deploy', status: 'done', at: Date.now() })

  await emit({ step: 'pipeline', status: 'done', at: Date.now() })

  return { project, installed, compiled, tested, deployed }
}
