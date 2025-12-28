#! /usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
// const shell = require('shelljs');
const childProcess = require('child_process');
const packageJson = require('../release/app/package.json');

function run(cmd) {
  return childProcess.execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runWithEnv(cmd, env) {
  return childProcess.execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
}

function isInstalled(packageName, checkVersion = undefined) {
  try {
    const packageVersions =
      packageName + (checkVersion ? '@' + checkVersion : '');
    const versions = run(
      'npm list --depth=0 --prefix "' +
        path.join(__dirname, '../release/app') +
        '"',
    ).toString();
    if (versions.indexOf(packageVersions) > 0) {
      return true;
    }
    /*if (checkVersion) {
      if (checkVersion === version) {
        return true;
      }
    } else if (version.length > 0) {
      return true;
    }*/
    // require.resolve('../app/node_modules/' + packageName);
    return false;
  } catch (err) {
    return false;
  }
}

function dirExist(dir) {
  try {
    fs.statSync(dir);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
  }
  return false;
}

/*function checkSharpPlatform(targetPlatform, arch) {
  if (!targetPlatform || !arch) {
    return true;
  }
  try {
    const sharp = require('../app/node_modules/sharp');
    const vendor = sharp.vendor;
    console.log('vendor: ' + vendor);

    return vendor.current === targetPlatform + '-' + arch;
  } catch (e) {
    console.log('checkSharpPlatform: ', e);
    return false;
  }
}*/

let platform = 'node';
let installCmd;
const dir = path.join(__dirname, '../release/app/node_modules');

if (process.env.PD_PLATFORM) {
  platform = process.env.PD_PLATFORM;
}

if (platform === 'node') {
  if (
    //!checkSharpPlatform(process.env.TARGET_PLATFORM, process.env.TARGET_ARCH) ||
    !dirExist(dir) ||
    !isInstalled(
      '@tagspaces/extensions',
      packageJson.dependencies['@tagspaces/extensions'],
    ) ||
    !isInstalled(
      '@tagspaces/tagspaces-ws',
      packageJson.dependencies['@tagspaces/tagspaces-ws'],
    ) ||
    !isInstalled('sharp', packageJson.dependencies['sharp'])
  ) {
    installCmd = 'npm run-script install-ext-node';
  }
} else if (platform === 'web') {
  if (
    !dirExist(dir) ||
    !isInstalled(
      '@tagspaces/extensions',
      packageJson.dependencies['@tagspaces/extensions'],
    ) ||
    isInstalled('@tagspaces/tagspaces-ws')
  ) {
    installCmd = 'npm run-script install-ext-web';
  }
}
if (installCmd) {
  const npmCacheTmp =
    process.env.TAGSPACES_NPM_TMP || path.join(__dirname, '..', '.tmp', 'npm');
  try {
    fs.ensureDirSync(npmCacheTmp);
  } catch (e) {
    // best-effort; fallback to default npm tmp behavior
  }

  console.log(
    runWithEnv(installCmd, {
      npm_config_tmp: npmCacheTmp,
      npm_config_cache: path.join(npmCacheTmp, 'cache'),
    }).toString(),
  );
  /*if (shell.exec(installCmd).code !== 0) {
    shell.echo(
      'Error: Install ' + process.env.PD_PLATFORM + ' platform failed'
    );
    shell.exit(1);
  }*/
}
