import { defineHandler, readBody, HTTPError } from 'h3'
import { start } from 'workflow/api'
import { demoPipeline } from '../workflows/demo'

export default defineHandler(async (event) => {
  const body = await readBody<{ project?: string }>(event)
  const project = body?.project?.trim()

  if (!project) {
    throw new HTTPError({ status: 400, message: 'project is required' })
  }

  try {
    const run = await start(demoPipeline, [project])
    return { runId: run.runId }
  } catch (err: any) {
    console.error('[workflow-start] failure', {
      name: err?.name,
      message: err?.message,
      cause_name: err?.cause?.name,
      cause_message: err?.cause?.message,
      env: {
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_TARGET_ENV: process.env.VERCEL_TARGET_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
        VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
        VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
        VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
        VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
        VERCEL_GIT_PROVIDER: process.env.VERCEL_GIT_PROVIDER,
        VERCEL_GIT_REPO_ID: process.env.VERCEL_GIT_REPO_ID,
        has_OIDC_TOKEN: Boolean(process.env.VERCEL_OIDC_TOKEN),
        has_DEPLOYMENT_KEY: Boolean(process.env.VERCEL_DEPLOYMENT_KEY),
      },
    })
    throw err
  }
})
