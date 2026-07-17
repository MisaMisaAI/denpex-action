const https = require('https');
const fs = require('fs');
const path = require('path');

// Collect logs from the failed job. Priority:
//   1. the `logs-file` input (default: training.log in the workspace)
//   2. common fallbacks (train.log, nohup.out)
// If nothing is found we print instructions and exit 0 — we NEVER diagnose a
// placeholder log: a made-up diagnosis is worse than none.
function collectLogs() {
  const ws = process.env.GITHUB_WORKSPACE || '.';
  const explicit = process.env['INPUT_LOGS-FILE'] || 'training.log';
  const candidates = [explicit, 'training.log', 'train.log', 'nohup.out'];
  for (const rel of candidates) {
    const p = path.isAbsolute(rel) ? rel : path.join(ws, rel);
    try {
      const logs = fs.readFileSync(p, 'utf8');
      if (logs.trim().length >= 20) {
        console.log(`Diagnosing logs from ${p} (${logs.length} bytes)`);
        return logs;
      }
    } catch { /* try the next candidate */ }
  }
  return null;
}

async function run() {
  try {
    const apiKey = process.env['INPUT_API-KEY'] || '';
    const logs = collectLogs();
    if (!logs) {
      console.log('Denpex: no log file found to diagnose.');
      console.log('Write your training output to a file and point the action at it:');
      console.log('');
      console.log('  - run: python train.py 2>&1 | tee training.log');
      console.log('  - uses: MisaMisaAI/denpex-action@main');
      console.log('    if: failure()');
      console.log('    with:');
      console.log('      logs-file: training.log');
      return; // exit 0 — the job already failed; do not mask the real failure
    }

    const payload = JSON.stringify({
      logs: logs.slice(-256000), // last 256KB
      jobName: process.env.GITHUB_JOB || 'github-action-job',
      source: 'github-action'
    });

    const options = {
      hostname: 'api.denpex.com',
      port: 443,
      path: '/api/diagnose',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    if (apiKey) options.headers['X-Denpex-Key'] = apiKey;

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error(`Denpex Error (${res.statusCode}): ${data}`);
          return;
        }
        try {
          const result = JSON.parse(data);
          const fix = result.fix || {};
          console.log('\n================================================================');
          console.log('Denpex Diagnosis');
          console.log('================================================================\n');
          if (fix.summary) console.log(`Root Cause:\n${fix.summary}\n`);
          if (fix.action) console.log(`Suggested Fix:\n${fix.action}\n`);
          if (!fix.summary && !fix.action) console.log(JSON.stringify(result, null, 2));
          console.log('View Full Report -> https://denpex.com/dashboard');
          console.log('\n================================================================\n');
        } catch (e) {
          console.error('Failed to parse Denpex response', e);
        }
      });
    });
    req.on('error', (e) => console.error(`Request to Denpex API failed: ${e.message}`));
    req.write(payload);
    req.end();
  } catch (error) {
    console.error(error.message);
  }
}

run();
