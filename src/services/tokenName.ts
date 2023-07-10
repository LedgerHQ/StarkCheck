import { Provider, constants, Contract } from 'starknet';
import erc20Abi from '../abis/ERC20.json';
import { Buffer } from 'buffer';

export function feltToString(felt: bigint) {
  const newStrB = Buffer.from(felt.toString(16), 'hex');
  return newStrB.toString();
}

const tokenNameMap: Record<
  string,
  { symbol: string; type: string; name: string; decimals: number }
> = {
  '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7': {
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'ERC20',
    decimals: 18,
  },
};

const provider = new Provider({
  sequencer: { network: constants.NetworkName.SN_GOERLI },
});

export async function tokenAddrToName(address: string): Promise<string> {
  if (tokenNameMap[address]) return tokenNameMap[address].name;

  const myTestContract = new Contract(erc20Abi, address, provider);

  // Interaction with the contract with call
  const { name } = await myTestContract.name();
  return feltToString(name);
}

export async function tokenAddrToSymbol(address: string): Promise<string> {
  if (tokenNameMap[address]) return tokenNameMap[address].symbol;

  const myTestContract = new Contract(erc20Abi, address, provider);

  // Interaction with the contract with call
  const { symbol } = await myTestContract.symbol();
  return feltToString(symbol);
}

export async function getType(
  address: string
): Promise<{ decimals: number; type: string }> {
  if (tokenNameMap[address])
    return {
      type: tokenNameMap[address].type,
      decimals: tokenNameMap[address].decimals,
    };

  const myTestContract = new Contract(erc20Abi, address, provider);

  // Interaction with the contract with call
  try {
    const { decimals } = await myTestContract.decimals();
    return { decimals: decimals.toString(), type: 'ERC20' };
  } catch (error) {
    return { type: 'NFT', decimals: 0 };
  }
}
