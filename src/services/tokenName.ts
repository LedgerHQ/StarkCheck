import { Provider, constants, Contract } from 'starknet';
import erc20Abi from '../abis/ERC20.json';
import { Buffer } from 'buffer';

export function feltToString(felt: bigint) {
  const newStrB = Buffer.from(felt.toString(16), 'hex');
  return newStrB.toString();
}

const tokenNameMap: Record<string, string> = {
  '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7':
    'Ethereum',
};

const provider = new Provider({
  sequencer: { network: constants.NetworkName.SN_GOERLI },
});

export async function tokenAddrToName(address: string): Promise<string> {
  if (tokenNameMap[address]) return tokenNameMap[address];

  const myTestContract = new Contract(erc20Abi, address, provider);

  // Interaction with the contract with call
  const { name } = await myTestContract.name();
  return feltToString(name);
}
