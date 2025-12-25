#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Получаем список файлов из аргументов командной строки
// lint-staged передает файлы как аргументы
let files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

// Если файлы не переданы, получаем их из git (для надежности)
if (files.length === 0) {
  try {
    const gitFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    files = gitFiles
      .split('\n')
      .map(f => f.trim())
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js')));
  } catch (error) {
    // Если git недоступен, выходим без ошибки
    process.exit(0);
  }
}

if (files.length === 0) {
  process.exit(0);
}

const workspaceRoot = process.cwd();

// Группируем файлы по workspace
const workspaceFiles = {};

files.forEach((file) => {
  const filePath = path.resolve(workspaceRoot, file);
  
  // Пропускаем удаленные файлы
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  // Определяем workspace для файла
  if (file.includes('microservices/')) {
    const match = file.match(/microservices\/([^/\\]+)/);
    if (match) {
      const workspace = match[1];
      if (!workspaceFiles[workspace]) {
        workspaceFiles[workspace] = [];
      }
      workspaceFiles[workspace].push(filePath);
    }
  } else if (file.includes('shared/')) {
    if (!workspaceFiles['shared']) {
      workspaceFiles['shared'] = [];
    }
    workspaceFiles['shared'].push(filePath);
  }
});

// Запускаем ESLint для каждого workspace
let hasErrors = false;

Object.keys(workspaceFiles).forEach((workspace) => {
  const files = workspaceFiles[workspace];
  const workspacePath = workspace === 'shared' 
    ? path.join(workspaceRoot, 'shared')
    : path.join(workspaceRoot, 'microservices', workspace);
  
  // Проверяем наличие ESLint конфигурации
  const eslintConfig = path.join(workspacePath, 'eslint.config.mjs');
  const packageJson = path.join(workspacePath, 'package.json');
  
  if (!fs.existsSync(eslintConfig) && !fs.existsSync(packageJson)) {
    console.log(`\n⚠️  Skipping ${workspace} - no ESLint configuration found`);
    return;
  }
  
  // Проверяем наличие ESLint в package.json
  if (fs.existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      const hasEslint = pkg.devDependencies?.eslint || pkg.dependencies?.eslint;
      if (!hasEslint) {
        console.log(`\n⚠️  Skipping ${workspace} - ESLint not installed`);
        return;
      }
    } catch (e) {
      // Если не удалось прочитать package.json, пропускаем
      return;
    }
  }
  
  try {
    // Получаем относительные пути файлов от workspace
    const relativeFiles = files.map(f => {
      const rel = path.relative(workspacePath, f);
      return rel.replace(/\\/g, '/'); // Нормализуем пути для Windows
    }).filter(f => f.endsWith('.ts') || f.endsWith('.js')); // Только TS/JS файлы
    
    if (relativeFiles.length === 0) {
      return; // Пропускаем, если нет файлов для проверки
    }
    
    // Запускаем ESLint напрямую без --fix в pre-commit
    // Используем --max-warnings=0 чтобы блокировать коммит при любых предупреждениях
    const command = `npx eslint ${relativeFiles.join(' ')} --max-warnings=0`;
    
    console.log(`\n🔍 Running ESLint in ${workspace}...`);
    execSync(command, { 
      stdio: 'inherit', 
      cwd: workspacePath,
      shell: true
    });
  } catch (error) {
    console.error(`\n❌ ESLint found errors in ${workspace}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n❌ ESLint found errors. Please fix them before committing.');
  console.error('💡 Tip: Run "npm run lint" in the affected workspace to see details.');
  process.exit(1);
}

console.log('\n✅ ESLint check passed!');
process.exit(0);

