export class InferenceScheduler {
  constructor(concurrency = 1) { this.concurrency = Math.max(1, concurrency); this.active = 0; this.queue = []; this.running = new Set() }
  schedule(task, { signal, priority = 0 } = {}) {
    return new Promise((resolve, reject) => {
      const job = { task, signal, priority, resolve, reject, controller: new AbortController(), started: false }
      if (signal?.aborted) return reject(signal.reason || new Error('Annullato'))
      job.onAbort = () => { if (!job.started) { this.queue = this.queue.filter(x => x !== job); reject(signal.reason || new Error('Annullato')) } else job.controller.abort(signal.reason) }
      signal?.addEventListener('abort', job.onAbort, { once: true })
      this.queue.push(job); this.queue.sort((a,b) => b.priority-a.priority); this.pump()
    })
  }
  pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const job = this.queue.shift(); if (job.signal?.aborted) { job.reject(job.signal.reason || new Error('Annullato')); continue }
      job.started = true; this.active++; this.running.add(job)
      Promise.resolve().then(() => job.task(job.controller.signal)).then(job.resolve, job.reject).finally(() => { job.signal?.removeEventListener('abort', job.onAbort); this.running.delete(job); this.active--; this.pump() })
    }
  }
  abortAll(reason = new Error('Stop di emergenza')) {
    for (const job of this.queue.splice(0)) { job.signal?.removeEventListener('abort', job.onAbort); job.reject(reason) }
    for (const job of this.running) job.controller.abort(reason)
  }
  stats() { return { active: this.active, queued: this.queue.length, concurrency: this.concurrency } }
}
