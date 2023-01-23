import { ec, InvocationsDetailsWithNonce, Invocation, hash, Signature } from "starknet";

require('dotenv').config()

const starkCheckSignerPk = process.env.STARKCHECK_PK || "";
const keyPair = ec.getKeyPair(starkCheckSignerPk);

/**
 * Recompute the transacionHash and sign it to proove StarkCheck verified the transaction
 * @param tx the transaction passed by the user we verified
 * @returns Signature [ r, s ]
 */
function signTransactionHash(tx: Invocation & InvocationsDetailsWithNonce): Signature {
  const chainId: any = process.env.network;
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