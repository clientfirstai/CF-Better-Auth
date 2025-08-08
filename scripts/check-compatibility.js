#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BETTER_AUTH_PATH = path.join(__dirname, '..', 'vendor', 'better-auth');
const PACKAGES_PATH = path.join(__dirname, '..', 'packages');
const COMPATIBILITY_REPORT_PATH = path.join(__dirname, '..', 'compatibility-report.json');

async function main() {
  console.log('🔍 CF-Better-Auth Compatibility Checker');
  console.log('=======================================\n');

  const report = {
    timestamp: new Date().toISOString(),
    betterAuthVersion: getBetterAuthVersion(),
    adapters: {},
    issues: [],
    recommendations: []
  };

  try {
    // Check core adapter compatibility
    console.log('📦 Checking @cf-auth/core compatibility...');
    report.adapters.core = await checkPackageCompatibility('core');
    
    // Check client adapter compatibility
    console.log('📦 Checking @cf-auth/client compatibility...');
    report.adapters.client = await checkPackageCompatibility('client');
    
    // Check plugins compatibility
    console.log('📦 Checking @cf-auth/plugins compatibility...');
    report.adapters.plugins = await checkPackageCompatibility('plugins');
    
    // Check for API changes
    console.log('\n🔄 Checking for API changes...');
    const apiChanges = checkAPIChanges();
    if (apiChanges.length > 0) {
      report.issues.push(...apiChanges);
    }
    
    // Check for deprecated features
    console.log('⚠️  Checking for deprecated features...');
    const deprecations = checkDeprecations();
    if (deprecations.length > 0) {
      report.issues.push(...deprecations);
    }
    
    // Generate recommendations
    report.recommendations = generateRecommendations(report);
    
    // Save report
    fs.writeFileSync(
      COMPATIBILITY_REPORT_PATH,
      JSON.stringify(report, null, 2)
    );
    
    // Display summary
    displaySummary(report);
    
  } catch (error) {
    console.error('❌ Compatibility check failed:', error.message);
    process.exit(1);
  }
}

function getBetterAuthVersion() {
  try {
    const packageJsonPath = path.join(BETTER_AUTH_PATH, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

async function checkPackageCompatibility(packageName) {
  const packagePath = path.join(PACKAGES_PATH, packageName);
  const result = {
    compatible: true,
    issues: [],
    warnings: []
  };
  
  // Check if package exists
  if (!fs.existsSync(packagePath)) {
    result.compatible = false;
    result.issues.push(`Package ${packageName} not found`);
    return result;
  }
  
  // Run type checking
  try {
    execSync('pnpm typecheck', { cwd: packagePath, stdio: 'pipe' });
    console.log(`  ✅ Type checking passed for ${packageName}`);
  } catch (error) {
    result.warnings.push(`Type checking failed for ${packageName}`);
    console.log(`  ⚠️  Type checking failed for ${packageName}`);
  }
  
  // Run tests if available
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8')
    );
    
    if (packageJson.scripts && packageJson.scripts.test) {
      execSync('pnpm test', { cwd: packagePath, stdio: 'pipe' });
      console.log(`  ✅ Tests passed for ${packageName}`);
    }
  } catch (error) {
    result.warnings.push(`Tests failed for ${packageName}`);
    console.log(`  ⚠️  Tests failed for ${packageName}`);
  }
  
  // Check imports
  const imports = await checkImports(packagePath);
  if (imports.missing.length > 0) {
    result.issues.push(...imports.missing.map(i => `Missing import: ${i}`));
    result.compatible = false;
  }
  
  return result;
}

async function checkImports(packagePath) {
  const result = {
    valid: [],
    missing: []
  };
  
  // Get all TypeScript files
  const files = getAllFiles(path.join(packagePath, 'src'), '.ts');
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = extractImports(content);
    
    for (const imp of imports) {
      if (imp.includes('better-auth')) {
        // Check if the import path exists in better-auth
        const importPath = imp.replace('better-auth', BETTER_AUTH_PATH);
        if (!checkImportExists(importPath)) {
          result.missing.push(imp);
        } else {
          result.valid.push(imp);
        }
      }
    }
  }
  
  return result;
}

function getAllFiles(dirPath, extension) {
  const files = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, extension));
    } else if (item.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function checkImportExists(importPath) {
  // Check common module resolutions
  const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '/index.ts', '/index.js'];
  
  for (const ext of extensions) {
    if (fs.existsSync(importPath + ext)) {
      return true;
    }
  }
  
  return false;
}

function checkAPIChanges() {
  const issues = [];
  
  // Check for known API changes between versions
  const knownChanges = {
    '2.0.0': [
      'BetterAuth constructor signature changed',
      'Session management API updated',
      'Database provider names changed'
    ],
    '3.0.0': [
      'Plugin system completely rewritten',
      'Middleware API changed'
    ]
  };
  
  const currentVersion = getBetterAuthVersion();
  const majorVersion = currentVersion.split('.')[0] + '.0.0';
  
  if (knownChanges[majorVersion]) {
    issues.push(...knownChanges[majorVersion].map(change => ({
      type: 'api_change',
      severity: 'high',
      description: change
    })));
  }
  
  return issues;
}

function checkDeprecations() {
  const deprecations = [];
  
  // Check for use of deprecated features
  const deprecatedPatterns = [
    { pattern: /createAuth\(/g, message: 'createAuth is deprecated, use new BetterAuth()' },
    { pattern: /session\.cookie/g, message: 'session.cookie is deprecated, use session.options' },
    { pattern: /auth\.providers/g, message: 'auth.providers is deprecated, use auth.socialProviders' }
  ];
  
  const files = getAllFiles(path.join(PACKAGES_PATH), '.ts');
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    for (const { pattern, message } of deprecatedPatterns) {
      if (pattern.test(content)) {
        deprecations.push({
          type: 'deprecation',
          severity: 'medium',
          file: path.relative(PACKAGES_PATH, file),
          description: message
        });
      }
    }
  }
  
  return deprecations;
}

function generateRecommendations(report) {
  const recommendations = [];
  
  // Check if upgrade is recommended
  if (report.issues.length === 0) {
    recommendations.push('✅ No compatibility issues found. Safe to upgrade.');
  } else {
    recommendations.push('⚠️  Compatibility issues detected. Review before upgrading.');
  }
  
  // Check for high severity issues
  const highSeverity = report.issues.filter(i => i.severity === 'high');
  if (highSeverity.length > 0) {
    recommendations.push(`🔴 ${highSeverity.length} high severity issues require immediate attention.`);
  }
  
  // Check adapter status
  for (const [name, status] of Object.entries(report.adapters)) {
    if (!status.compatible) {
      recommendations.push(`📦 Update @cf-auth/${name} adapter for compatibility.`);
    }
  }
  
  // Suggest running tests
  if (report.adapters.core?.warnings?.length > 0) {
    recommendations.push('🧪 Fix failing tests before deploying to production.');
  }
  
  return recommendations;
}

function displaySummary(report) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 COMPATIBILITY REPORT SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`\n📌 Better-Auth Version: ${report.betterAuthVersion}`);
  console.log(`📅 Checked At: ${new Date(report.timestamp).toLocaleString()}`);
  
  console.log('\n📦 Adapter Status:');
  for (const [name, status] of Object.entries(report.adapters)) {
    const icon = status.compatible ? '✅' : '❌';
    console.log(`  ${icon} @cf-auth/${name}: ${status.compatible ? 'Compatible' : 'Incompatible'}`);
    
    if (status.issues.length > 0) {
      status.issues.forEach(issue => console.log(`     - ${issue}`));
    }
  }
  
  if (report.issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    report.issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : '🟡';
      console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.description}`);
    });
  }
  
  console.log('\n💡 Recommendations:');
  report.recommendations.forEach(rec => console.log(`  ${rec}`));
  
  console.log('\n📄 Full report saved to:', COMPATIBILITY_REPORT_PATH);
  console.log('='.repeat(50));
}

// Run the compatibility checker
main().catch(console.error);