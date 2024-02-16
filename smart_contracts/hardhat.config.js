require("@nomicfoundation/hardhat-toolbox");

const RPC = "https://sepolia.blast.io";
const PRIVATE_KEY = "-update-your-wallet-private-key-here-";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    goerli: {
      url: RPC,
      accounts: [PRIVATE_KEY],
    },
  },
};
