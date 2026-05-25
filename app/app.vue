<script setup lang="ts">
import type { DemoEvent } from '../server/workflows/demo'

const { data: hello, error: helloError } = await useFetch('/api/hello')

const project = ref('nuxt5-nitro3-workflow')
const runId = ref<string | null>(null)
const events = ref<DemoEvent[]>([])
const running = ref(false)
const runError = ref<string | null>(null)

async function startRun() {
  runError.value = null
  events.value = []
  runId.value = null
  running.value = true

  try {
    const { runId: id } = await $fetch<{ runId: string }>('/api/workflow', {
      method: 'POST',
      body: { project: project.value },
    })
    runId.value = id
    await streamEvents(id)
  } catch (err) {
    runError.value = err instanceof Error ? err.message : String(err)
  } finally {
    running.value = false
  }
}

async function streamEvents(id: string) {
  const res = await fetch(`/api/workflow/${id}`)
  if (!res.body) throw new Error('no stream body')

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        const event = JSON.parse(line.slice(6)) as DemoEvent
        events.value = [...events.value, event]
        if (event.step === 'pipeline' && event.status === 'done') {
          await reader.cancel()
          return
        }
      } catch {
        // ignore non-JSON frames
      }
    }
  }
}
</script>

<template>
  <main>
    <h1>Nuxt 5 + Nitro 3 + Workflow</h1>

    <section>
      <h2>SSR fetch · <code>/api/hello</code></h2>
      <p v-if="helloError">Error: {{ helloError.message }}</p>
      <pre v-else>{{ hello }}</pre>
    </section>

    <section>
      <h2>Workflow run · <code>demoPipeline</code></h2>
      <form @submit.prevent="startRun">
        <label>
          project
          <input v-model="project" :disabled="running" />
        </label>
        <button type="submit" :disabled="running || !project.trim()">
          {{ running ? 'running…' : 'start workflow' }}
        </button>
      </form>

      <p v-if="runId" class="meta">
        run: <code>{{ runId }}</code>
      </p>
      <p v-if="runError" class="error">Error: {{ runError }}</p>

      <ol v-if="events.length" class="events">
        <li v-for="(e, i) in events" :key="i">
          <span class="status" :data-status="e.status">{{ e.status }}</span>
          <span class="step">{{ e.step }}</span>
          <time>{{ new Date(e.at).toISOString().slice(11, 23) }}</time>
        </li>
      </ol>
    </section>
  </main>
</template>

<style>
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
main { max-width: 44rem; margin: 3rem auto; padding: 0 1rem; }
section { margin: 2rem 0; }
h2 { font-size: 1rem; opacity: .7; margin: 0 0 .5rem; font-weight: 500; }
pre { background: rgba(127,127,127,.12); padding: 1rem; border-radius: .5rem; }
form { display: flex; gap: .5rem; align-items: end; }
label { display: flex; flex-direction: column; gap: .25rem; font-size: .85rem; flex: 1; }
input { padding: .5rem; font: inherit; border: 1px solid rgba(127,127,127,.4); border-radius: .25rem; background: transparent; color: inherit; }
button { padding: .5rem 1rem; cursor: pointer; }
button:disabled { opacity: .5; cursor: not-allowed; }
.meta { font-size: .85rem; opacity: .7; }
.meta code { font-family: ui-monospace, monospace; }
.error { color: #d33; }
.events { list-style: none; padding: 0; margin: 1rem 0 0; font-family: ui-monospace, monospace; font-size: .85rem; }
.events li { display: grid; grid-template-columns: 5rem 1fr auto; gap: .75rem; padding: .25rem 0; border-bottom: 1px solid rgba(127,127,127,.15); }
.status[data-status="started"] { color: #888; }
.status[data-status="done"] { color: #2a8; }
time { opacity: .5; }
</style>
