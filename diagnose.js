const https = require('https');
const fs = require('fs');
const execSync = require('child_process').execSync;

async function run() {
  try {
    const apiKey = process.env['INPUT_API-KEY'] || '';
    
    // In a real environment, you'd fetch the previous step's logs.
    // For this reference wrapper, we'll just grab the current environment.
    console.log('Fetching logs for diagnosis...');
    
    // Simulate log collection from github action environment
    let logs = '';
    try {
      logs = fs.readFileSync(process.env.GITHUB_WORKSPACE + '/training.log', 'utf8');
    } catch {
      // Fallback if no specific file exists
      logs = 'Traceback (most recent call last):\n  File "train.py", line 42, in <module>\nRuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB (GPU 0; 79.15 GiB total capacity; 76.32 GiB already allocated)';
    }

    const payload = JSON.stringify({
      logs: logs.slice(-256000), // Last 256KB
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
        'Content-Length': payload.length
      }
    };
    
    if (apiKey) {
      options.headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error(`Denpex Error: ${data}`);
          return;
        }
        
        try {
          const result = JSON.parse(data);
          
          console.log('\n================================================================');
          console.log('🧠 Denpex Diagnosis');
          console.log('================================================================\n');
          console.log(`Root Cause:\n${result.fix.summary}\n`);
          console.log(`Suggested Fix:\n${result.fix.action}\n`);
          console.log('View Full Report -> https://denpex.com/dashboard');
          console.log('\n================================================================\n');
          
        } catch (e) {
          console.error('Failed to parse Denpex response', e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request to Denpex API failed: ${e.message}`);
    });

    req.write(payload);
    req.end();
    
  } catch (error) {
    console.error(error.message);
  }
}

run();
