import { ec, InvocationsDetailsWithNonce, Invocation, hash, Signature, constants } from "starknet";

const starkCheckSignerPk = process.env.STARKCHECK_PK || "";
const keyPair = ec.getKeyPair(starkCheckSignerPk);

/**
 * Recompute the transacionHash and sign it to proove StarkCheck verified the transaction
 * @param tx the transaction passed by the user we verified
 * @returns Signature [ r, s ]
 */
function signTransactionHash(tx: Invocation & InvocationsDetailsWithNonce, chainId: constants.StarknetChainId): Signature {
  const txHash = hash.calculateTransactionHash(
    tx.contractAddress,
    tx.version,
    tx.calldata || [],
    tx.maxFee,
    chainId,
    tx.nonce
   );
  return ec.sign(keyPair, txHash);
}

export { signTransactionHash }