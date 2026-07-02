// Campusly V2 — PM2 process config (ARCHITECTURE.md §14.4).
//
// Runs the compiled API (Express + Socket.IO in one process). Secrets are
// provided by the environment / an untracked .env on the host, never here
// (SECURITY.md §10).
//
// SINGLE PROCESS, FORK MODE — INTENTIONAL (do not change to cluster yet).
// The backend keeps realtime/shared state in memory within one process:
// Socket.IO connections, the anonymous matching queue, notification routing,
// and in-memory singleton services (ARCHITECTURE.md §12; TECH_STACK.md §18–19).
// Cluster mode / multiple instances would give each worker its OWN private copy
// of that state, so two users handled by different workers would not see each
// other's matches, messages, or notifications — i.e. incorrect behaviour, not
// just reduced throughput. A single fork-mode process keeps all shared state
// consistent. This is sufficient for the current target (single GCE Ubuntu VM,
// ~100 concurrent / ~500 registered users).
//
// REVERT WHEN REDIS LANDS: once shared state moves to Redis (matching queue +
// pub/sub) and Socket.IO uses the Redis adapter, workers become stateless and
// this can safely return to `exec_mode: 'cluster'` + `instances: 'max'` (with
// sticky sessions at the Nginx edge for Socket.IO). Not before.
module.exports = {
  apps: [
    {
      name: 'campusly-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      // One process only — see the header note above. Do not raise `instances`
      // or switch to cluster mode until Redis-backed shared state exists.
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // Logs (PM2 manages rotation via pm2-logrotate in production).
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
