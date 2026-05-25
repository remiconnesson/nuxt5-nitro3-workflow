<script setup lang="ts">
const email = ref('')
const loading = ref(false)
const result = ref<{ message: string; runId: string } | null>(null)
const error = ref<string | null>(null)

async function triggerSignup() {
  if (!email.value) return

  loading.value = true
  error.value = null
  result.value = null

  try {
    const data = await $fetch('/api/signup', {
      method: 'POST',
      body: { email: email.value },
    })
    result.value = data
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <h1>Nuxt 5 + Nitro 3 + Vercel Workflow</h1>
    <p class="subtitle">
      Demo: durable user signup workflow with sleep, retries, and steps.
    </p>

    <form @submit.prevent="triggerSignup">
      <input
        v-model="email"
        type="email"
        placeholder="hello@example.com"
        required
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Starting...' : 'Start Signup Workflow' }}
      </button>
    </form>

    <div v-if="result" class="result success">
      <strong>Workflow started</strong>
      <p>Run ID: <code>{{ result.runId }}</code></p>
      <p>{{ result.message }}</p>
      <p class="hint">
        Check server logs to see steps execute. The workflow sleeps 5s between
        welcome and onboarding emails.
      </p>
    </div>

    <div v-if="error" class="result error-box">
      <strong>Error</strong>
      <p>{{ error }}</p>
    </div>

    <section class="info">
      <h2>How it works</h2>
      <ol>
        <li><code>"use workflow"</code> makes the function durable and resumable</li>
        <li><code>"use step"</code> marks each unit of work (auto-retry on failure)</li>
        <li><code>sleep("5s")</code> suspends without consuming resources</li>
        <li><code>FatalError</code> stops retries for permanent failures</li>
      </ol>
    </section>
  </main>
</template>

<style>
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
}

main {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1rem;
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: gray;
  margin-bottom: 2rem;
}

form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 0.375rem;
  font-size: 1rem;
  background: transparent;
  color: inherit;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
  border: none;
  border-radius: 0.375rem;
  background: #2563eb;
  color: white;
  font-size: 1rem;
  white-space: nowrap;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.error-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

code {
  background: rgba(127, 127, 127, 0.12);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.hint {
  font-size: 0.875rem;
  color: gray;
  margin-top: 0.5rem;
}

.info {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(127, 127, 127, 0.06);
  border-radius: 0.5rem;
}

.info h2 {
  margin-top: 0;
  font-size: 1.25rem;
}

.info ol {
  padding-left: 1.25rem;
  line-height: 1.8;
}
</style>
