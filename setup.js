#!/usr/bin/env node

/**
 * CBlock Setup Script
 * Automated setup for the Carbon Credit Marketplace
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌱 CBlock Setup Script');
console.log('==========================\n');

// Color functions for console output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.log(colors.red('❌ Node.js version 18 or higher is required.'));
    console.log(colors.yellow(`   Current version: ${nodeVersion}`));
    console.log(colors.blue('   Please update Node.js: https://nodejs.org/\n'));
    process.exit(1);
  }
  
  console.log(colors.green(`✅ Node.js ${nodeVersion} detected\n`));
}

function runCommand(command, description) {
  console.log(colors.blue(`🔄 ${description}...`));
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(colors.green(`✅ ${description} completed\n`));
  } catch (error) {
    console.log(colors.red(`❌ ${description} failed`));
    console.log(colors.red(`Error: ${error.message}\n`));
    process.exit(1);
  }
}

function createEnvFile(template, target, description) {
  if (fs.existsSync(target)) {
    console.log(colors.yellow(`⚠️  ${target} already exists, skipping...`));
    return;
  }
  
  if (fs.existsSync(template)) {
    fs.copyFileSync(template, target);
    console.log(colors.green(`✅ Created ${target}`));
    console.log(colors.yellow(`   Please edit ${target} with your API keys\n`));
  } else {
    console.log(colors.red(`❌ Template ${template} not found`));
  }
}

async function main() {
  try {
    // Check Node.js version
    checkNodeVersion();

    console.log(colors.cyan('Step 1: Installing Hardhat dependencies'));
    console.log(colors.cyan('======================================'));
    
    if (fs.existsSync('./hardhat')) {
      process.chdir('./hardhat');
      runCommand('npm install', 'Installing Hardhat dependencies');
      process.chdir('..');
    } else {
      console.log(colors.red('❌ Hardhat directory not found'));
      process.exit(1);
    }

    console.log(colors.cyan('Step 2: Installing Frontend dependencies'));
    console.log(colors.cyan('======================================='));
    
    if (fs.existsSync('./frontend')) {
      process.chdir('./frontend');
      runCommand('npm install', 'Installing Frontend dependencies');
      process.chdir('..');
    } else {
      console.log(colors.red('❌ Frontend directory not found'));
      process.exit(1);
    }

    console.log(colors.cyan('Step 3: Setting up environment files'));
    console.log(colors.cyan('===================================='));
    
    createEnvFile('./hardhat/.env.example', './hardhat/.env', 'Hardhat environment');
    createEnvFile('./frontend/.env.example', './frontend/.env', 'Frontend environment');

    console.log(colors.cyan('Step 4: Compiling smart contracts'));
    console.log(colors.cyan('================================='));
    
    process.chdir('./hardhat');
    runCommand('npx hardhat compile', 'Compiling smart contracts');
    process.chdir('..');

    // Setup complete
    console.log(colors.green('🎉 SETUP COMPLETE!'));
    console.log(colors.green('==================\n'));
    
    console.log(colors.blue('Next Steps:'));
    console.log('1. Edit ./hardhat/.env with your Alchemy API key and wallet private key');
    console.log("  " + colors.yellow('SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"'));
    console.log("  " + colors.yellow('DEPLOYER_PRIVATE_KEY="0xYOUR_PRIVATE_KEY"'));
    console.log("  " + colors.yellow('WEB3_STORAGE_TOKEN="YOUR_TOKEN"'));
    
    console.log('2. Edit ./frontend/.env with your API keys');
    console.log("  " + colors.yellow('VITE_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"'));
    console.log("  " + colors.yellow('VITE_WEB3_STORAGE_TOKEN="YOUR_TOKEN"'));
    
    console.log('3. Fund your wallet with Sepolia testnet ETH');
    console.log("  " + colors.blue('Faucets: https://sepoliafaucet.com/'));
    
    console.log('4. Deploy smart contracts:');
    console.log("  " + colors.cyan('cd hardhat && npx hardhat run scripts/deploy_sepolia.js --network sepolia'));
    
    console.log('5. Update frontend .env with deployed contract addresses');
    
    console.log('6. Start the frontend:');
    console.log("  " + colors.cyan('cd frontend && npm run dev'));
    
    console.log(colors.blue('\nFor detailed instructions, see DEPLOYMENT_README.md'));
    console.log(colors.green('\nHappy carbon trading! 🌍✨'));

  } catch (error) {
    console.log(colors.red(`\n❌ Setup failed: ${error.message}`));
    process.exit(1);
  }
}

// Check if we're being run directly
if (require.main === module) {
  main();
}

module.exports = { main };
