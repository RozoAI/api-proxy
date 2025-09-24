// Test MugglePay token mapping
function getMugglePayToken(chainId, token) {
  const tokenMap = {
    '56': { // BSC
      'USDT': 'USDT_BNB',
      'USDC': 'USDC_BNB',
      'BNB': 'BNB',
    },
    '1': { // Ethereum
      'USDT': 'USDT_ERC20',
      'USDC': 'USDC_ERC20',
      'ETH': 'ETH',
    },
    '137': { // Polygon
      'USDT': 'USDT_POLYGON',
      'USDC': 'USDC_POLYGON',
      'MATIC': 'MATIC',
    },
  };

  const chainTokens = tokenMap[chainId];
  if (chainTokens && chainTokens[token]) {
    return chainTokens[token];
  }

  console.warn(`Unknown chain/token combination: ${chainId}/${token}, defaulting to USDT_BNB`);
  return 'USDT_BNB';
}

// Test the mapping from the curl command
const testChain = '56'; // BSC
const testToken = 'USDT';

const result = getMugglePayToken(testChain, testToken);
console.log(`Input: Chain ${testChain}, Token ${testToken}`);
console.log(`MugglePay Token: ${result}`);
console.log(`Expected: USDT_BNB`);
console.log(`Test passed: ${result === 'USDT_BNB'}`);