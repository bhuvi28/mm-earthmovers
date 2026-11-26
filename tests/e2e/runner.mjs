#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIERS = [
  { tier: 1, name: 'Tier 1: Feature Coverage (Header, 6 Tabs Mobile Cards, Modals, Touch Targets)', file: 'tier1-feature-coverage.test.mjs' },
  { tier: 2, name: 'Tier 2: Boundary & Corner Cases (Viewports 375/390/414px, Empty States, Extremes)', file: 'tier2-boundary-corner-cases.test.mjs' },
  { tier: 3, name: 'Tier 3: Cross-Feature Interactions (View Switcher, Part Copy, WhatsApp, Modals)', file: 'tier3-cross-feature-interactions.test.mjs' },
  { tier: 4, name: 'Tier 4: Real-World Operator Workflows (Mobile Lead Triage End-to-End)', file: 'tier4-operator-workflows.test.mjs' },
  { tier: 5, name: 'Tier 5: P2 Telemetry, Ops & Audit Tab, Modularization & E2E Flow Contracts', file: 'tier5-p2-coverage.test.mjs' },
];

console.log('\n======================================================================');
console.log('   ADMIN ANALYTICS DASHBOARD MOBILE OVERHAUL — E2E TEST SUITE RUNNER  ');
console.log('======================================================================\n');

async function runTestFile(tierInfo) {
  const filePath = path.join(__dirname, tierInfo.file);
  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const pass = code === 0;

      // Parse TAP output to count passed and failed tests
      const lines = stdout.split('\n');
      let subtestsPassed = 0;
      let subtestsFailed = 0;
      const failures = [];

      lines.forEach((line) => {
        if (/^\s*ok \d+ - /.test(line)) subtestsPassed++;
        if (/^\s*not ok \d+ - /.test(line)) {
          subtestsFailed++;
          failures.push(line.trim());
        }
      });

      resolve({
        tier: tierInfo.tier,
        name: tierInfo.name,
        file: tierInfo.file,
        pass,
        durationMs,
        subtestsPassed,
        subtestsFailed,
        failures,
        rawOutput: stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  const overallStart = Date.now();

  for (const tier of TIERS) {
    process.stdout.write(`Executing ${tier.name}... `);
    const result = await runTestFile(tier);
    results.push(result);

    if (result.pass) {
      console.log(`\x1b[32mPASSED\x1b[0m (${result.subtestsPassed} tests, ${result.durationMs}ms)`);
    } else {
      console.log(`\x1b[31mFAILED\x1b[0m (${result.subtestsPassed} passed, ${result.subtestsFailed} failed, ${result.durationMs}ms)`);
      if (result.failures.length > 0) {
        result.failures.forEach((f) => console.log(`   \x1b[33m• ${f}\x1b[0m`));
      }
    }

    totalPassed += result.subtestsPassed;
    totalFailed += result.subtestsFailed;
  }

  const overallDuration = Date.now() - overallStart;

  console.log('\n----------------------------------------------------------------------');
  console.log('                        TEST RUN SUMMARY                              ');
  console.log('----------------------------------------------------------------------');
  console.log(`Total Subtests Executed: ${totalPassed + totalFailed}`);
  console.log(`Passed:                  \x1b[32m${totalPassed}\x1b[0m`);
  console.log(`Failed:                  ${totalFailed > 0 ? `\x1b[31m${totalFailed}\x1b[0m` : '0'}`);
  console.log(`Duration:                ${overallDuration}ms`);
  console.log('----------------------------------------------------------------------\n');

  if (totalFailed > 0) {
    console.log('\x1b[31m[TEST SUITE FAILURE]\x1b[0m Some responsive criteria or implementation requirements failed.');
    process.exit(1);
  } else {
    console.log('\x1b[32m[TEST SUITE SUCCESS]\x1b[0m All responsive mobile overhaul criteria and tests passed!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
