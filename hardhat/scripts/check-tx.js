const hre = require("hardhat");

async function main() {
    const txHash = "0x9803f77958257595d33064a1d4a703f6cf8e1cf16586aa01043b7cfbbf72401d";
    console.log("Checking transaction:", txHash);
    
    try {
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        console.log("Transaction receipt:", receipt);
        
        if (!receipt) {
            console.log("Transaction not found. It might still be pending or may have been dropped.");
            return;
        }
        
        console.log("\nTransaction details:");
        console.log("Block number:", receipt.blockNumber);
        console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        if (receipt.status === 0) {
            console.log("\nTransaction failed. Possible reasons:");
            console.log("1. The sender doesn't have permission to add verifiers");
            console.log("2. The transaction ran out of gas");
            console.log("3. The contract reverted the transaction");
        }
    } catch (error) {
        console.error("Error checking transaction:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
