import {
  constants,
  ec,
  InvocationsDetailsWithNonce,
  Invocation,
  hash,
  Signature,
  RawCalldata,
} from 'starknet';

const starkCheckSignerPk =
  process.env.STARKCHECK_PK ||
  '0x019800ea6a9a73f94aee6a3d2edf018fc770443e90c7ba121e8303ec6b349279';

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
    tx.calldata as RawCalldata,
    tx.maxFee || '2000000000',
    chainId,
    tx.nonce
  );
  const { r, s } = ec.starkCurve.sign(txHash, starkCheckSignerPk);
  return [r.toString(), s.toString()];
}

export { signTransactionHash };
