/**
 * Swoff CLI - Main Entry Point
 * 
 * Command-line interface for managing Swoff in your project.
 * 
 * Usage:
 *   swoff init          Initialize Swoff in current directory
 *   swoff generate      Generate service worker and files
 *   swoff validate      Validate swoff.config.json
 *   swoff add <feature> Add specific feature files
 *   swoff --help        Show help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, '..');
const projectRoot = process.cwd();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset}  ${msg}`),
  help: (msg) => console.log(`  ${colors.cyan}${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`)
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = args.slice(1);

// CLI Commands
const commands = {
  init: {
    description: 'Initialize Swoff in current directory',
    usage: 'swoff init [--framework react-vite|nextjs|vue-vite]',
    examples: [
      'swoff init',
      'swoff init --framework react-vite'
    ]
  },
  generate: {
    description: 'Generate service worker and supporting files',
    usage: 'swoff generate [--sw-only|--files-only]',
    examples: [
      'swoff generate',
      'swoff generate --sw-only',
      'swoff generate --files-only'
    ]
  },
  validate: {
    description: 'Validate swoff.config.json',
    usage: 'swoff validate',
    examples: [
      'swoff validate'
    ]
  },
  add: {
    description: 'Add specific feature files',
    usage: 'swoff add <feature>',
    examples: [
      'swoff add offline',
      'swoff add pwa',
      'swoff add mutation-queue'
    ]
  },
  help: {
    description: 'Show help information',
    usage: 'swoff help [command]',
    examples: [
      'swoff help',
      'swoff help init'
    ]
  }
};

// Show help
function showHelp(commandName = null) {
  if (commandName && commands[commandName]) {
    const cmd = commands[commandName];
    log.header(`Swoff ${commandName} Command`);
    console.log(`Description: ${cmd.description}`);
    console.log(`\nUsage: ${cmd.usage}`);
    console.log(`\nExamples:`);
    cmd.examples.forEach(ex => console.log(`  ${ex}`));
  } else {
    log.header('Swoff CLI');
    console.log(`${colors.dim}Swoff${colors.reset} - Offline-first web apps made easy\n`);
    console.log(`Usage: ${colors.cyan}swoff <command> [options]${colors.reset}\n`);
    console.log('Commands:');
    Object.entries(commands).forEach(([name, cmd]) => {
      console.log(`  ${colors.green}${name.padEnd(12)}${colors.reset} ${cmd.description}`);
    });
    console.log(`\nRun ${colors.cyan}swoff help <command>${colors.reset} for more details on a specific command.`);
  }
}

// Init command - Create config file and directory structure
async function initCommand(framework = null) {
  log.header('Initializing Swoff');
  
  // Check for existing config
  const configFiles = ['swoff.config.json', 'swoff.config.js'];
  const existingConfig = configFiles.find(f => existsSync(join(projectRoot, f)));
  
  if (existingConfig) {
    log.warn(`Found existing ${existingConfig}. Skipping init.`);
    log.info('To reinitialize, delete the config file first.');
    return;
  }
  
  // Create config based on framework or default
  const defaultConfig = {
    "$schema": "https://swoff.netlify.app/schema/v1.json",
    "enabled": true,
    "version": "from-package",
    "minSupportedVersion": "1.0.0",
    "serviceWorker": {
      "autoUpdate": false,
      "defaultStrategy": "cache-first",
      "strategies": {
        "/api/*": "network-first",
        "/static/*": "cache-first"
      }
    },
    "features": {
      "versionedSw": true,
      "offlineReads": true,
      "mutationQueue": false,
      "backgroundSync": false,
      "pwa": true,
      "auth": false,
      "crossTabSync": true,
      "tagInvalidation": true
    },
    "build": {
      "outputDir": "dist",
      "swFilename": "sw"
    }
  };
  
  // Framework-specific adjustments
  if (framework === 'react-vite' || framework === 'react-nextjs') {
    defaultConfig.features.mutationQueue = true;
    defaultConfig.serviceWorker.strategies['/assets/*'] = 'cache-first';
  } else if (framework === 'vue-vite') {
    defaultConfig.features.mutationQueue = true;
    defaultConfig.serviceWorker.strategies['/assets/*'] = 'cache-first';
  }
  
  // Write config file
  const configPath = join(projectRoot, 'swoff.config.json');
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  log.success(`Created swoff.config.json`);
  
  // Create directory structure
  const dirs = ['src/hooks', 'src/components', 'src/utils'];
  dirs.forEach(dir => {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      log.info(`Created ${dir}/`);
    }
  });
  
  log.success('Swoff initialized successfully!');
  log.info(`\nNext steps:`);
  log.help('1. Review swoff.config.json and customize as needed');
  log.help('2. Run: swoff generate');
  log.help('3. Read the docs: https://swoff.netlify.app/docs');
}

// Generate command - Generate SW and/or files
async function generateCommand(options = {}) {
  const { swOnly = false, filesOnly = false } = options;
  
  log.header('Generating Swoff Files');
  
  // Try to load config
  const configFiles = ['swoff.config.json', 'swoff.config.js'];
  let config = null;
  let configPath = null;
  
  for (const file of configFiles) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith('.json')) {
        config = JSON.parse(readFileSync(path, 'utf8'));
      }
      break;
    }
  }
  
  if (!config) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }
  
  log.info(`Using config: ${configPath}`);
  
  // Generate service worker
  if (!filesOnly) {
    log.info('Generating service worker...');
    try {
      await runGenerator('sw-generator.js');
    } catch (err) {
      log.error(`Service worker generation failed: ${err.message}`);
    }
  }
  
  // Generate supporting files
  if (!swOnly) {
    log.info('Generating supporting files...');
    try {
      await runGenerator('swoff-files-generator.js', [
        '--project-root', projectRoot,
        '--package-dir', packageDir
      ]);
    } catch (err) {
      log.error(`File generation failed: ${err.message}`);
    }
  }
  
  log.success('Generation complete!');
}

// Helper to run generators
function runGenerator(generatorName, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const generatorPath = join(packageDir, 'src/lib/generators', generatorName);
    
    // Check if generator exists
    if (!existsSync(generatorPath)) {
      reject(new Error(`Generator not found: ${generatorPath}`));
      return;
    }
    
    const proc = spawn('node', [generatorPath, ...extraArgs], { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Generator exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// Validate command - Validate config file
async function validateCommand() {
  log.header('Validating Swoff Configuration');
  
  const configFiles = ['swoff.config.json', 'swoff.config.js'];
  let config = null;
  let configPath = null;
  
  for (const file of configFiles) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith('.json')) {
        try {
          config = JSON.parse(readFileSync(path, 'utf8'));
        } catch (err) {
          log.error(`Invalid JSON in ${file}: ${err.message}`);
          return;
        }
      }
      break;
    }
  }
  
  if (!config) {
    log.warn('No swoff.config.json found. Run "swoff init" first.');
    return;
  }
  
  log.info(`Validating ${configPath}...`);
  
  // Validate required fields
  const requiredFields = ['enabled', 'version', 'serviceWorker', 'features', 'build'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    log.error(`Missing required fields: ${missingFields.join(', ')}`);
    return;
  }
  
  // Validate service worker config
  const swRequired = ['defaultStrategy', 'autoUpdate'];
  const swMissing = swRequired.filter(field => !config.serviceWorker[field]);
  
  if (swMissing.length > 0) {
    log.error(`Missing serviceWorker fields: ${swMissing.join(', ')}`);
    return;
  }
  
  // Validate features
  const featureDefaults = ['versionedSw', 'offlineReads', 'pwa'];
  featureDefaults.forEach(feature => {
    if (config.features[feature] === undefined) {
      log.warn(`Feature "${feature}" not set, using default: false`);
    }
  });
  
  // Validate cache strategies
  const validStrategies = ['cache-first', 'network-first', 'stale-while-revalidate', 'cache-only', 'network-only'];
  if (config.serviceWorker.strategies) {
    for (const [pattern, strategy] of Object.entries(config.serviceWorker.strategies)) {
      if (!validStrategies.includes(strategy)) {
        log.error(`Invalid strategy "${strategy}" for pattern "${pattern}". Valid: ${validStrategies.join(', ')}`);
        return;
      }
    }
  }
  
  log.success('Configuration is valid!');
  log.info(`\nConfig summary:`);
  log.help(`Version: ${config.version}`);
  log.help(`Default strategy: ${config.serviceWorker.defaultStrategy}`);
  log.help(`Features enabled: ${Object.entries(config.features).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);
}

// Add command - Add specific feature files
async function addCommand(feature) {
  log.header(`Adding ${feature} feature`);
  
  // Map feature names to config updates
  const featureMap = {
    'offline': { offlineReads: true },
    'mutation-queue': { mutationQueue: true },
    'mutationqueue': { mutationQueue: true },
    'pwa': { pwa: true },
    'cross-tab': { crossTabSync: true },
    'crosstab': { crossTabSync: true },
    'auth': { auth: true }
  };
  
  const configUpdate = featureMap[feature.toLowerCase()];
  
  if (!configUpdate) {
    log.error(`Unknown feature: ${feature}`);
    log.info(`Available features: offline, mutation-queue, pwa, cross-tab, auth`);
    return;
  }
  
  // Load or create config
  let config = null;
  let configPath = null;
  
  for (const file of ['swoff.config.json', 'swoff.config.js']) {
    const path = join(projectRoot, file);
    if (existsSync(path)) {
      configPath = path;
      if (file.endsWith('.json')) {
        config = JSON.parse(readFileSync(path, 'utf8'));
      }
      break;
    }
  }
  
  if (!config) {
    log.warn('No config found. Creating new config with feature...');
    config = {
      "$schema": "https://swoff.netlify.app/schema/v1.json",
      "enabled": true,
      "version": "from-package",
      "minSupportedVersion": "1.0.0",
      "serviceWorker": {
        "autoUpdate": false,
        "defaultStrategy": "cache-first",
        "strategies": {}
      },
      "features": {
        "versionedSw": true,
        "offlineReads": false,
        "mutationQueue": false,
        "backgroundSync": false,
        "pwa": false,
        "auth": false,
        "crossTabSync": false,
        "tagInvalidation": true
      },
      "build": {
        "outputDir": "dist",
        "swFilename": "sw"
      }
    };
    configPath = join(projectRoot, 'swoff.config.json');
  }
  
  // Update config with feature
  config.features = { ...config.features, ...configUpdate };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  log.success(`Updated swoff.config.json with ${feature} feature`);
  
  // Generate files
  await generateCommand({ swOnly: false, filesOnly: false });
  
  log.success(`${feature} feature added successfully!`);
}

// Main entry point
async function main() {
  if (!command) {
    showHelp();
    process.exit(0);
  }
  
  switch (command) {
    case 'init':
      const framework = options.includes('--framework') 
        ? options[options.indexOf('--framework') + 1] 
        : null;
      await initCommand(framework);
      break;
      
    case 'generate':
      const swOnly = options.includes('--sw-only');
      const filesOnly = options.includes('--files-only');
      await generateCommand({ swOnly, filesOnly });
      break;
      
    case 'validate':
      await validateCommand();
      break;
      
    case 'add':
      const feature = options[0];
      if (!feature) {
        log.error('Please specify a feature to add');
        log.info('Usage: swoff add <feature>');
        log.info('Features: offline, mutation-queue, pwa, cross-tab, auth');
        process.exit(1);
      }
      await addCommand(feature);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp(options[0]);
      break;
      
    default:
      log.error(`Unknown command: ${command}`);
      log.info(`Run "swoff help" for available commands`);
      process.exit(1);
  }
}

main().catch(err => {
  log.error(`Error: ${err.message}`);
  process.exit(1);
});