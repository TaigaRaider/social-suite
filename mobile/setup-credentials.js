#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const APPS = [
  { name: 'Lumina (Instagram)', dir: 'lumina', apiPort: 3002 },
  { name: 'Nexus (Facebook)', dir: 'nexus', apiPort: 3001 },
  { name: 'Pulse (Messenger)', dir: 'pulse', apiPort: 3003 },
  { name: 'Wave (WhatsApp)', dir: 'wave', apiPort: 3004 },
  { name: 'Whisper (Twitter)', dir: 'whisper', apiPort: 3005 },
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));

const CREDENTIALS = [
  { key: 'easProjectId', label: 'EAS Project ID', desc: 'From expo.dev dashboard (e.g. abc123-def456)' },
  { key: 'apiUrl', label: 'API Base URL', desc: `Backend URL (default: http://10.0.2.2:XXX/api for emulator)` },
  { key: 'googleServiceAccountPath', label: 'Google Service Account JSON path', desc: 'Path to google-service-account.json for Play Store submission' },
  { key: 'appleId', label: 'Apple ID', desc: 'Apple Developer account email' },
  { key: 'ascAppId', label: 'App Store Connect App ID', desc: 'Numeric ID from App Store Connect' },
  { key: 'appleTeamId', label: 'Apple Team ID', desc: '10-char Apple Developer Team ID' },
];

function clear() { process.stdout.write('\x1Bc'); }

function banner() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════════╗');
  console.log('  ║          SOCIALSUITE - Mobile Apps Credential Setup         ║');
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  console.log('  ║  Apps:  Lumina | Nexus | Pulse | Wave | Whisper             ║');
  console.log('  ║  Fills: app.config.js  +  eas.json  for each app           ║');
  console.log('  ╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

function section(title) {
  console.log('');
  console.log(`  ┌─── ${title} ${'─'.repeat(Math.max(0, 48 - title.length))}┐`);
}

function sectionEnd() {
  console.log('  └' + '─'.repeat(55) + '┘');
}

function badge(text, color = '33') {
  return `\x1b[${color}m${text}\x1b[0m`;
}

async function selectApps() {
  console.log('  Select which apps to configure:\n');
  console.log('    [A] All 5 apps');
  APPS.forEach((a, i) => console.log(`    [${i + 1}] ${a.name}`));
  console.log('');

  const input = await ask('  Your choice (e.g. 1,3,5 or A): ');

  if (input.toLowerCase() === 'a') return APPS;

  const indices = input.split(',').map((s) => parseInt(s.trim()) - 1).filter((i) => i >= 0 && i < APPS.length);
  if (indices.length === 0) {
    console.log(badge('  No valid apps selected. Exiting.', '31'));
    process.exit(1);
  }
  return indices.map((i) => APPS[i]);
}

async function collectCredentials(app) {
  const results = {};
  section(`${app.name} (port ${app.apiPort})`);

  for (const cred of CREDENTIALS) {
    let defaultVal = '';
    if (cred.key === 'apiUrl') defaultVal = `http://10.0.2.2:${app.apiPort}/api`;

    const defaultDisplay = defaultVal ? badge(` [${defaultVal}]`, '90') : '';
    console.log('');
    console.log(`    ${cred.desc}`);
    const answer = await ask(`    ${cred.label}: ${defaultDisplay}\n    > `);

    results[cred.key] = answer || defaultVal;
  }
  sectionEnd();
  return results;
}

function applyToAppConfig(appDir, apiUrl, easProjectId) {
  const filePath = path.join(appDir, 'app.config.js');
  if (!fs.existsSync(filePath)) {
    console.log(badge(`    SKIP: ${filePath} not found`, '33'));
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace projectId placeholder
  content = content.replace(
    /projectId:\s*["'].*?["']/,
    `projectId: "${easProjectId}"`
  );

  // Replace apiUrl fallback
  content = content.replace(
    /process\.env\.API_URL\s*\|\|\s*["'].*?["']/,
    `process.env.API_URL || "${apiUrl}"`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(badge(`    ✓ Updated app.config.js`, '32'));
  return true;
}

function applyToEasJson(appDir, creds) {
  const filePath = path.join(appDir, 'eas.json');
  if (!fs.existsSync(filePath)) {
    console.log(badge(`    SKIP: ${filePath} not found`, '33'));
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace appleId
  content = content.replace(/"appleId":\s*""/, `"appleId": "${creds.appleId}"`);
  content = content.replace(/"appleId":\s*"[^"]*"/, `"appleId": "${creds.appleId}"`);

  // Replace ascAppId
  content = content.replace(/"ascAppId":\s*""/, `"ascAppId": "${creds.ascAppId}"`);
  content = content.replace(/"ascAppId":\s*"[^"]*"/, `"ascAppId": "${creds.ascAppId}"`);

  // Replace appleTeamId
  content = content.replace(/"appleTeamId":\s*""/, `"appleTeamId": "${creds.appleTeamId}"`);
  content = content.replace(/"appleTeamId":\s*"[^"]*"/, `"appleTeamId": "${creds.appleTeamId}"`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(badge(`    ✓ Updated eas.json`, '32'));
  return true;
}

function copyServiceAccount(appDir, srcPath) {
  if (!srcPath || !fs.existsSync(srcPath)) {
    if (srcPath) console.log(badge(`    WARN: File not found: ${srcPath}`, '33'));
    return false;
  }
  const dest = path.join(appDir, 'google-service-account.json');
  fs.copyFileSync(srcPath, dest);
  console.log(badge(`    ✓ Copied google-service-account.json`, '32'));
  return true;
}

async function main() {
  clear();
  banner();

  const selectedApps = await selectApps();
  console.log(badge(`\n  Configuring ${selectedApps.length} app(s)...\n`, '36'));

  // Collect shared credentials
  section('Shared Credentials');
  console.log('');
  console.log('    Enter credentials once. Apple/Google creds will be');
  console.log('    applied to all selected apps. Enter blank to skip.');

  const sharedCreds = {};
  for (const cred of CREDENTIALS) {
    let defaultVal = '';
    if (cred.key === 'apiUrl') defaultVal = '(per-app default)';

    const defaultDisplay = defaultVal ? badge(` [${defaultVal}]`, '90') : '';
    console.log('');
    console.log(`    ${cred.desc}`);
    const answer = await ask(`    ${cred.label}: ${defaultDisplay}\n    > `);
    sharedCreds[cred.key] = answer || defaultVal;
  }
  sectionEnd();

  // Apply to each app
  console.log(badge('\n  Applying configuration...\n', '36'));

  for (const app of selectedApps) {
    const appDir = path.join(__dirname, app.dir);
    console.log(`\n  ${badge(app.name, '36')} (${app.dir}/)`);

    const apiUrl = sharedCreds.apiUrl && sharedCreds.apiUrl !== '(per-app default)'
      ? sharedCreds.apiUrl
      : `http://10.0.2.2:${app.apiPort}/api`;

    applyToAppConfig(appDir, apiUrl, sharedCreds.easProjectId || `${app.dir}-social-suite`);
    applyToEasJson(appDir, sharedCreds);
    copyServiceAccount(appDir, sharedCreds.googleServiceAccountPath);
  }

  // Summary
  console.log('\n');
  console.log('  ╔══════════════════════════════════════════════════════════════╗');
  console.log('  ║                     SETUP COMPLETE                          ║');
  console.log('  ╠══════════════════════════════════════════════════════════════╣');

  console.log('  ║                                                              ║');
  for (const app of selectedApps) {
    const apiUrl = sharedCreds.apiUrl && sharedCreds.apiUrl !== '(per-app default)'
      ? sharedCreds.apiUrl
      : `http://10.0.2.2:${app.apiPort}/api`;
    console.log(`  ║  ${app.name.padEnd(20)} → API: ${apiUrl.padEnd(29)}║`);
  }
  console.log('  ║                                                              ║');
  console.log('  ║  Next steps:                                                ║');
  console.log('  ║  1. Run each backend server on its assigned port            ║');
  console.log('  ║  2. Run: npx expo start (in each app dir)                   ║');
  console.log('  ║  3. For store submission: eas build --platform <ios|android> ║');
  console.log('  ║                                                              ║');
  console.log('  ╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error('\n  Error:', err.message);
  rl.close();
  process.exit(1);
});
