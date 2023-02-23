interface Policy {
  address: string;
  amount?: string;
  ids?: string[];
}

interface Transaction {
  contractAddress: string;
  calldata: Array<string>;
  signature: string;
  nonce: string;
  maxFee: string;
  version: string;
}

export { Policy, Transaction };
