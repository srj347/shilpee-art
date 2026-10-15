// PM2: pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
// One process only: rate limits and the page cache live in memory.
module.exports = {
  apps: [
    {
      name: 'shilpee',
      cwd: '/home/ubuntu/shilpee-art',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '900M',
      env: { NODE_ENV: 'production' },
    },
  ],
}
