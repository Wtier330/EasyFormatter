#!/usr/bin/env node

/**
 * 版本号同步脚本
 *
 * 用法:
 *   node sync-version.js [version|patch|minor|major]
 *
 * 说明:
 *   - 不带参数时，从根目录 package.json 读取版本号并同步到其他文件
 *   - 带版本号参数时，使用指定的版本号更新所有文件
 *   - 使用 patch/minor/major 参数时，自动递增对应的版本号
 *
 * 同步目标:
 *   - package.json (根目录)
 *   - ui/package.json
 *   - src-tauri/tauri.conf.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 文件路径
const ROOT_PKG = resolve(__dirname, 'package.json');
const UI_PKG = resolve(__dirname, 'ui/package.json');
const TAURI_CONF = resolve(__dirname, 'src-tauri/tauri.conf.json');

/**
 * 读取并解析 JSON 文件
 */
function readJson(path) {
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * 写入 JSON 文件
 */
function writeJson(path, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(path, content, 'utf-8');
}

/**
 * 递增版本号
 */
function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      return version;
  }
}

/**
 * 获取根目录版本号
 */
function getSourceVersion() {
  const pkg = readJson(ROOT_PKG);
  return pkg.version;
}

/**
 * 更新 package.json 版本号
 */
function updatePackageJson(path, version) {
  const pkg = readJson(path);
  pkg.version = version;
  writeJson(path, pkg);
}

/**
 * 更新 tauri.conf.json 版本号
 */
function updateTauriConf(path, version) {
  const conf = readJson(path);
  conf.version = version;
  writeJson(path, conf);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const targetVersion = args[0];

  // 获取版本号
  let version;
  if (!targetVersion) {
    version = getSourceVersion();
    console.log('使用当前版本号进行同步');
  } else if (['patch', 'minor', 'major'].includes(targetVersion)) {
    version = bumpVersion(getSourceVersion(), targetVersion);
    console.log(`递增 ${targetVersion} 版本`);
  } else {
    version = targetVersion;
  }

  // 验证版本号格式 (semver)
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  if (!semverRegex.test(version)) {
    console.error(`错误: 无效的版本号格式 "${version}"`);
    console.error('请使用语义化版本号，如: 1.2.0, 2.0.0-beta.1');
    process.exit(1);
  }

  console.log(`同步版本号: ${version}`);
  console.log('');

  // 更新根目录 package.json
  updatePackageJson(ROOT_PKG, version);
  console.log('✓ 已更新 package.json');

  // 更新 ui/package.json
  updatePackageJson(UI_PKG, version);
  console.log('✓ 已更新 ui/package.json');

  // 更新 src-tauri/tauri.conf.json
  updateTauriConf(TAURI_CONF, version);
  console.log('✓ 已更新 src-tauri/tauri.conf.json');

  console.log('');
  console.log('版本号同步完成！');
}

main();
