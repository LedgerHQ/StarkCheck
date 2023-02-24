import * as starknet from 'starknet';

const starkCheckSignerPk = 1673888886562;
const keyPair = starknet.ec.getKeyPair(starkCheckSignerPk);

/**
 * Recompute the transacionHash and sign it to proove StarkCheck verified the transaction
 * @param tx the transaction passed by the user we verified
 * @returns Signature [ r, s ]
 */
function signTransactionHash(
  tx: starknet.Invocation & starknet.InvocationsDetailsWithNonce
) {
  const chainId = starknet.constants.StarknetChainId.MAINNET;
  const txHash = starknet.hash.calculateTransactionHash(
    tx.contractAddress,
    tx.version,
    tx.calldata || [],
    tx.maxFee,
    chainId,
    tx.nonce
  );

  const sig = starknet.ec.sign(keyPair, txHash);
  console.log(starknet.number.toFelt(txHash));
  console.log(sig);
}

signTransactionHash({
  nonce: '0',
  contractAddress:
    '0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0',
  version: '1',
  calldata: [
    '0x1',
    '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
    '0x0',
    '0x3',
    '0x3',
    '0x5537071ea21b91a3b3743866ea12cf197f0b37a6b83be41dd0bbfec6a2cf8ef',
    '0x1000',
    '0x0',
  ],
});
