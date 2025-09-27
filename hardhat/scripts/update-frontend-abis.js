const fs = require("fs");
const path = require("path");

// Contract artifacts to copy
const contracts = [
  "CarbonCredit",
  "Marketplace",
  "RetirementCertificate",
  "VerifierRegistry",
  "GovernanceToken",
  "CarbonGovernor",
  "DocumentRegistry",
];

// Paths
const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts");
const frontendAbisPath = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "abis"
);

// Ensure frontend abis directory exists
if (!fs.existsSync(frontendAbisPath)) {
  fs.mkdirSync(frontendAbisPath, { recursive: true });
}

contracts.forEach((contractName) => {
  try {
    // Find the artifact file
    const artifactPath = path.join(
      artifactsPath,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (fs.existsSync(artifactPath)) {
      // Read the artifact
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

      // Extract just the ABI
      const abi = artifact.abi;

      // Write to frontend
      const outputPath = path.join(frontendAbisPath, `${contractName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));

      console.log(`✅ Copied ${contractName} ABI to frontend`);
    } else {
      console.log(`❌ Artifact not found: ${artifactPath}`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${contractName}:`, error.message);
  }
});

// Also copy Carbon.json for backwards compatibility
try {
  const carbonPath = path.join(
    artifactsPath,
    "CarbonCredit.sol",
    "CarbonCredit.json"
  );
  if (fs.existsSync(carbonPath)) {
    const artifact = JSON.parse(fs.readFileSync(carbonPath, "utf8"));
    const outputPath = path.join(frontendAbisPath, "Carbon.json");
    fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✅ Copied CarbonCredit ABI as Carbon.json for compatibility`);
  }
} catch (error) {
  console.error(`❌ Error copying Carbon.json:`, error.message);
}

console.log("\n🎉 ABI update complete!");
