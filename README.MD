# GainzProtocol Aggregator

This repository has code base of GainzProtocol Aggregator, which consist of two repositories.

1. Aggregator Smart Contract
2. Test

## Aggregator Smart Contract

Aggregator Smart Contract has a capability to execute trade on any DEX on the network deployed.

### How to Deploy:

1. Clone Github Repository
   `https://github.com/GainzProtocol/Aggregator`
2. Run `cd Aggregator && cd smart_contracts && npm install`
3. Compile Smart Contract `npx hardhat compile --force` (make sure that you have hardhat installed in your machine)
4. Update `hardhat.config.js` with the details
5. Deploy smart contract `npx hardhat run scripts/deploy`

## Test

test has capacity to execute trade on the Aggregator smart contract.

### How to Execute:

1. Clone Github Repository
   `https://github.com/GainzProtocol/Aggregator`
2. Run `cd Aggregator && cd test && cd scripts && npm install`
3. Update the necessary details in the each script ex: privatekey, RPC, deployed aggregator address etc.
4. Execute the script `node script_name.js`

### Deployed Smart Contract:

`https://testnet.blastscan.io/address/0x609dBD122A8a0ec3489A4A9bF22fC868A40E33c8`

### License

MIT
