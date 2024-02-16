async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  const GainzProtocolAggregator = await ethers.getContractFactory("GainzProtocolAggregator");
  const gainzProtocolAggregator = await GainzProtocolAggregator.deploy();
  console.log("Gainz Protocol Aggregator Smart Contract:", await gainzProtocolAggregator.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
