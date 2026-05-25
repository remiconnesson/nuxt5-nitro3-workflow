import { start } from 'workflow/api'
import { handleUserSignup } from '../workflows/user-signup'

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)

  const run = await start(handleUserSignup, [email])

  return {
    message: 'User signup workflow started',
    runId: run.runId,
  }
})
