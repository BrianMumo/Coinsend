/**
 * Wait for database to be ready before starting the app
 * This handles Railway's database startup timing issues
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDatabase() {
  return new Promise((resolve) => {
    try {
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'pipe',
        timeout: 30000,
        cwd: path.join(__dirname, '..')
      });
      resolve(true);
    } catch (error) {
      resolve(false);
    }
  });
}

async function waitForDb() {
  console.log('Waiting for database to be ready...');

  for (let i = 1; i <= MAX_RETRIES; i++) {
    console.log(`Attempt ${i}/${MAX_RETRIES}: Checking database connection...`);

    const isReady = await checkDatabase();

    if (isReady) {
      console.log('Database is ready!');
      return true;
    }

    if (i === MAX_RETRIES) {
      console.error('Failed to connect to database after maximum retries');
      process.exit(1);
    }

    console.log(`Database not ready yet, waiting ${RETRY_DELAY / 1000} seconds...`);
    await sleep(RETRY_DELAY);
  }

  return false;
}

async function startApp() {
  console.log('Starting Node.js application...');

  const appPath = path.join(__dirname, '..', 'dist', 'index.js');
  const app = spawn('node', [appPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  app.on('error', (error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });

  app.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function main() {
  await waitForDb();
  await startApp();
}

main().catch(error => {
  console.error('Startup failed:', error);
  process.exit(1);
});
