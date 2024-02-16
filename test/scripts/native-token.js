const { ethers, BigNumber } = require("ethers");
const { ChainId, Fetcher, Route, Trade, TokenAmount, TradeType, Percent, Token } = require("@uniswap/sdk");

const provider = new ethers.providers.JsonRpcProvider("https://sepolia.blast.io");

const walletPrivateKey = "-update-your-wallet-private-key-here-";
const wallet = new ethers.Wallet(walletPrivateKey, provider);

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const AGGREGATOR_CONTRACT = "0x5C7E9D45e417301238020F8D19427fE1472D7A22";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const to = "0xEd1FF38CDc75D5cf2168BD47cBC57306616a53a4"; // Recipient address

const chainId = ChainId.GÖRLI;

const tokenA = new Token(chainId, "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", 18, "WETH", "WETH"); // TradeIn
const tokenB = new Token(chainId, "0x07865c6E87B9F70255377e024ace6630C1Eaa37F", 6, "USDC", "USDC"); //  TradeOut

const intermediateTokens = [
    new Token(chainId, "0x07865c6E87B9F70255377e024ace6630C1Eaa37F", 6, "USDC", "USDC"),
    new Token(chainId, "0xC2C527C0CACF457746Bd31B2a698Fe89de2b6d49", 6, "USDT", "USDT"),
];

const AGGREGATOR_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "router",
                "type": "address"
            },
            {
                "internalType": "bytes4",
                "name": "selector",
                "type": "bytes4"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "swap",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

async function findOptimalRoute(tokenIn, tokenOut, amountIn) {
    let bestTrade = null;

    // Check direct pair first
    try {
        const directPair = await Fetcher.fetchPairData(tokenIn, tokenOut, provider);
        const directRoute = new Route([directPair], tokenIn, tokenOut);
        const directTrade = new Trade(directRoute, new TokenAmount(tokenIn, BigNumber.from(amountIn).toString()), TradeType.EXACT_INPUT);
        bestTrade = directTrade; // Assume direct trade is the best initially
    } catch (error) {
        console.log("No direct pair found, looking for alternatives.");
    }

    // Check routes through intermediate tokens
    for (const intermediateToken of intermediateTokens) {
        try {
            const pair1 = await Fetcher.fetchPairData(tokenIn, intermediateToken, provider);
            const pair2 = await Fetcher.fetchPairData(intermediateToken, tokenOut, provider);
            const route = new Route([pair1, pair2], tokenIn, tokenOut);
            const trade = new Trade(route, new TokenAmount(tokenIn, BigNumber.from(amountIn).toString()), TradeType.EXACT_INPUT);

            if (!bestTrade || trade.outputAmount.greaterThan(bestTrade.outputAmount)) {
                bestTrade = trade; // Update best trade if this trade is better
            }
        } catch (error) {
            console.log(`No viable route through intermediate token ${intermediateToken.symbol}.`);
        }
    }

    if (!bestTrade) {
        throw new Error("No available trading paths found.");
    }

    // Here you can log bestTrade details or return it
    console.log(`Best trade found with output amount: ${bestTrade.outputAmount.toSignificant(6)} ${tokenOut.symbol}`);
    return bestTrade;
}

async function executeTrade() {
    const tradeInAmount = "0.0000001"; // Example: 1 TOKEN_A
    const selector = "0x7ff36ab5";
    const amountIn = ethers.utils.parseUnits(tradeInAmount, "ether"); // Example: 1 TOKEN_A
    try {
        const bestTrade = await findOptimalRoute(tokenA, tokenB, amountIn);

        console.log("Path:: -> ", bestTrade.route.path.map(token => `${token.address} (${token.symbol})`).join(" -> "));

        // create array from bestTrade.route
        const path = bestTrade.route.path.map(token => token.address);

        // Print outputAmount
        console.log("amountIn:: -> ", amountIn.toString()); // amountIn

        // can you print amountOutMin from amountIn?
        console.log("amountOutMin:: -> ", bestTrade.minimumAmountOut(new Percent("50", "10000")).toSignificant(6)); // amountOutMin
        const minOutFromBestTrade = bestTrade.minimumAmountOut(new Percent("50", "10000")).toSignificant(6);

        const amountOutMin = ethers.utils.parseUnits(minOutFromBestTrade, bestTrade.route.output.decimals.toString());
        console.log("amountOutMin:: -> ", amountOutMin.toString());
        console.log("priceImpact:: -> ", bestTrade.priceImpact.toSignificant(6));
        const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // Deadline timestamp, 20 minutes from now

        // Encode the data
        const data = ethers.utils.defaultAbiCoder.encode(
            ["uint256", "address[]", "address", "uint256"],
            [amountOutMin, path, to, deadline]
        );

        console.log("Encoded Data:", data);

        const AggreSwapInstance = new ethers.Contract(AGGREGATOR_CONTRACT, AGGREGATOR_ABI, wallet);

        const tx = await AggreSwapInstance.swap(ZERO_ADDRESS, 0, UNISWAP_ROUTER_ADDRESS, selector, data, {
            value: amountIn,
            gasLimit: 2000000,
        });

        console.log(`Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log("Trade executed successfully.");

    } catch (error) {
        console.log(`Trade execution error: ${error.message}`);
    }
}

executeTrade();
