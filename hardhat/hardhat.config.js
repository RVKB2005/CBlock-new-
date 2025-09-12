require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : []
    }
  }
};
