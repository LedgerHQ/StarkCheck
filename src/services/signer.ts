import {
  constants,
  ec,
  InvocationsDetailsWithNonce,
  Invocation,
  hash,
  stark,
  Signature,
} from 'starknet';

const starkCheckSignerPk = process.env.STARKCHECK_PK || '';

/**
 * Recompute the transacionHash and sign it to proove StarkCheck verified the transaction
 * @param tx the transaction passed by the user we verified
 * @returns Signature [ r, s ]
 */
function signTransactionHash(
  tx: Invocation & InvocationsDetailsWithNonce,
  chainId: constants.StarknetChainId
): Signature {
  const txHash = hash.calculateTransactionHash(
    tx.contractAddress,
    tx.version || 1,
    // @ts-ignore
    tx.calldata || [],
    tx.maxFee,
    chainId,
    tx.nonce
  );
  const { r, s } = ec.starkCurve.sign(txHash, starkCheckSignerPk);
  return [r.toString(), s.toString()];
}

export { signTransactionHash };
