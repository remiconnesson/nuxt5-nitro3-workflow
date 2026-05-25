import { defineHandler, getRouterParam, HTTPError } from 'h3'
import { getRun } from 'workflow/api'
import type { DemoEvent } from '../../workflows/demo'

export default defineHandler((event) => {
  const runId = getRouterParam(event, 'runId')
  if (!runId) {
    throw new HTTPError({ status: 400, message: 'runId is required' })
  }

  const run = getRun<unknown>(runId)
  const source = run.getReadable<DemoEvent>()

  const sse = source.pipeThrough(
    new TransformStream<DemoEvent, Uint8Array>({
      transform(chunk, controller) {
        const payload = `data: ${JSON.stringify(chunk)}\n\n`
        controller.enqueue(new TextEncoder().encode(payload))
      },
    }),
  )

  return new Response(sse, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
})
