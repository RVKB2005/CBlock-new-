const hre = require("hardhat");

async function main() {
    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifier = await VerifierRegistry.attach("0xD009D4EA4B9f546261433a75A32353a60d750200");

    const isVerifier = await verifier.isVerifier("0x32659CC1783F69000874f15947deB13248091d67");
    console.log("Is verifier:", isVerifier);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });