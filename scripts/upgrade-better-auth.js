#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BETTER_AUTH_PATH = path.join(__dirname, '..', 'vendor', 'better-auth');
const COMPATIBILITY_MAP_PATH = path.join(__dirname, '..', 'compatibility-map.json');
const BACKUP_DIR = path.join(__dirname, '..', '.backups');

async function main() {
  console.log('🚀 CF-Better-Auth Upgrade Script');
  console.log('================================\n');

  try {
    // Step 1: Create backup
    console.log('📦 Creating backup...');
    createBackup();
    
    // Step 2: Check current version
    console.log('\n📊 Checking current version...');
    const currentVersion = getCurrentVersion();
    console.log(`Current better-auth version: ${currentVersion}`);
    
    // Step 3: Fetch latest changes
    console.log('\n🔄 Fetching latest changes from better-auth...');
    fetchLatestChanges();
    
    // Step 4: Get new version
    const newVersion = getCurrentVersion();
    console.log(`New better-auth version: ${newVersion}`);
    
    if (currentVersion === newVersion) {
      console.log('\n✅ Already up to date!');
      return;
    }
    
    // Step 5: Check compatibility
    console.log('\n🔍 Checking compatibility...');
    const isCompatible = await checkCompatibility(currentVersion, newVersion);
    
    if (!isCompatible) {
      console.log('\n⚠️  Warning: Breaking changes detected!');
      console.log('Please review the compatibility notes before proceeding.');
      
      const answer = await prompt('Do you want to continue? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('\n🛑 Upgrade cancelled. Rolling back...');
        rollback();
        return;
      }
    }
    
    // Step 6: Run tests
    console.log('\n🧪 Running compatibility tests...');
    const testsPass = runTests();
    
    if (!testsPass) {
      console.log('\n❌ Tests failed! Rolling back...');
      rollback();
      return;
    }
    
    // Step 7: Update compatibility map
    console.log('\n📝 Updating compatibility map...');
    updateCompatibilityMap(newVersion, isCompatible);
    
    // Step 8: Rebuild packages
    console.log('\n🔨 Rebuilding packages...');
    rebuild();
    
    console.log('\n✅ Upgrade completed successfully!');
    console.log(`better-auth has been updated from ${currentVersion} to ${newVersion}`);
    
    // Step 9: Show migration notes if any
    showMigrationNotes(currentVersion, newVersion);
    
  } catch (error) {
    console.error('\n❌ Upgrade failed:', error.message);
    console.log('\n🔄 Rolling back changes...');
    rollback();
    process.exit(1);
  }
}

function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `better-auth-${timestamp}`);
  
  execSync(`cp -r ${BETTER_AUTH_PATH} ${backupPath}`, { stdio: 'inherit' });
  console.log(`Backup created at: ${backupPath}`);
}

function getCurrentVersion() {
  try {
    const packageJsonPath = path.join(BETTER_AUTH_PATH, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

function fetchLatestChanges() {
  const commands = [
    'git fetch',
    'git checkout main',
    'git pull origin main'
  ];
  
  for (const cmd of commands) {
    execSync(cmd, { cwd: BETTER_AUTH_PATH, stdio: 'inherit' });
  }
}

async function checkCompatibility(oldVersion, newVersion) {
  // Load compatibility map
  let compatibilityMap = {};
  if (fs.existsSync(COMPATIBILITY_MAP_PATH)) {
    compatibilityMap = JSON.parse(fs.readFileSync(COMPATIBILITY_MAP_PATH, 'utf-8'));
  }
  
  // Check for known breaking changes
  const oldMajor = parseInt(oldVersion.split('.')[0]);
  const newMajor = parseInt(newVersion.split('.')[0]);
  
  if (newMajor > oldMajor) {
    console.log(`Major version change detected: ${oldMajor} -> ${newMajor}`);
    return false;
  }
  
  // Check specific version compatibility
  if (compatibilityMap[newVersion]) {
    return compatibilityMap[newVersion].compatible !== false;
  }
  
  return true;
}

function runTests() {
  try {
    console.log('Running adapter tests...');
    execSync('pnpm test --filter @cf-auth/core', { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function updateCompatibilityMap(version, isCompatible) {
  let compatibilityMap = {};
  if (fs.existsSync(COMPATIBILITY_MAP_PATH)) {
    compatibilityMap = JSON.parse(fs.readFileSync(COMPATIBILITY_MAP_PATH, 'utf-8'));
  }
  
  compatibilityMap[version] = {
    compatible: isCompatible,
    testedAt: new Date().toISOString(),
    notes: []
  };
  
  fs.writeFileSync(
    COMPATIBILITY_MAP_PATH,
    JSON.stringify(compatibilityMap, null, 2)
  );
}

function rebuild() {
  execSync('pnpm install', { stdio: 'inherit' });
  execSync('pnpm build', { stdio: 'inherit' });
}

function rollback() {
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('better-auth-'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log('No backups available for rollback');
    return;
  }
  
  const latestBackup = path.join(BACKUP_DIR, backups[0]);
  execSync(`rm -rf ${BETTER_AUTH_PATH}`, { stdio: 'inherit' });
  execSync(`cp -r ${latestBackup} ${BETTER_AUTH_PATH}`, { stdio: 'inherit' });
  console.log(`Rolled back to: ${backups[0]}`);
}

function showMigrationNotes(oldVersion, newVersion) {
  const notes = [];
  
  // Add version-specific migration notes here
  const oldMajor = parseInt(oldVersion.split('.')[0]);
  const newMajor = parseInt(newVersion.split('.')[0]);
  
  if (newMajor > oldMajor) {
    notes.push(`⚠️  Major version upgrade from v${oldMajor} to v${newMajor}`);
    notes.push('Please review the better-auth migration guide');
  }
  
  if (notes.length > 0) {
    console.log('\n📋 Migration Notes:');
    notes.forEach(note => console.log(`  - ${note}`));
  }
}

async function prompt(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run the upgrade script
main().catch(console.error);