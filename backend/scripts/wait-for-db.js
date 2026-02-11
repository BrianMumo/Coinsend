/**
 * Wait for database to be ready before starting the app
 * This handles Railway's database startup timing issues
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const MAX_RETRIES = 60; // Increased to 60 retries
const RETRY_DELAY = 3000; // 3 seconds between retries

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please configure DATABASE_URL in Railway variables.');
    return false;
  }

  // Mask the password for logging
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`DATABASE_URL configured: ${maskedUrl}`);
  return true;
}

async function checkDatabase() {
  return new Promise((resolve) => {
    try {
      const result = execSync('npx prisma db push --accept-data-loss 2>&1', {
        encoding: 'utf8',
        timeout: 45000,
        cwd: path.join(__dirname, '..')
      });
      console.log('Prisma output:', result.substring(0, 200));
      resolve(true);
    } catch (error) {
      // Log the actual error for debugging
      const errorMsg = error.stdout || error.stderr || error.message || 'Unknown error';
      console.log('Database check failed:', errorMsg.substring(0, 300));
      resolve(false);
    }
  });
}

async function waitForDb() {
  console.log('='.repeat(50));
  console.log('Coinsend Database Connection Script');
  console.log('='.repeat(50));

  // Check if DATABASE_URL is set
  if (!checkDatabaseUrl()) {
    process.exit(1);
  }

  console.log(`Will retry up to ${MAX_RETRIES} times with ${RETRY_DELAY/1000}s delay`);
  console.log('Waiting for database to be ready...\n');

  for (let i = 1; i <= MAX_RETRIES; i++) {
    console.log(`Attempt ${i}/${MAX_RETRIES}: Checking database connection...`);

    const isReady = await checkDatabase();

    if (isReady) {
      console.log('\n✓ Database is ready!');
      return true;
    }

    if (i === MAX_RETRIES) {
      console.error('\n✗ Failed to connect to database after maximum retries');
      console.error('Please check:');
      console.error('1. PostgreSQL service is running in Railway');
      console.error('2. DATABASE_URL is correctly set');
      console.error('3. Database service is linked to this service');
      process.exit(1);
    }

    console.log(`Database not ready, waiting ${RETRY_DELAY / 1000} seconds...\n`);
    await sleep(RETRY_DELAY);
  }

  return false;
}

async function startApp() {
  console.log('\nStarting Node.js application...');

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
