import { defineHandler, readBody, HTTPError } from 'h3'
import { start } from 'workflow/api'
import { demoPipeline } from '../workflows/demo'

export default defineHandler(async (event) => {
  const body = await readBody<{ project?: string }>(event)
  const project = body?.project?.trim()

  if (!project) {
    throw new HTTPError({ status: 400, message: 'project is required' })
  }

  const run = await start(demoPipeline, [project])

  return { runId: run.runId }
})
