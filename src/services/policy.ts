import {
  constants,
  SequencerProvider,
  RpcProvider,
  RPC,
  number,
  InvocationsDetailsWithNonce,
  Invocation,
  shortString,
  Signature,
  TransactionSimulationResponse,
  TransactionTraceResponse,
  FunctionInvocation,
} from 'starknet';
import { Policy } from '../types/policy';
import { signTransactionHash } from './signer';

const approveSelector =
  '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c';
const approveAllSelector =
  '0x2d4c8ea4c8fb9f571d1f6f9b7692fff8e5ceaf73b1df98e7da8c1109b39ae9a';
const transferFromSelector =
  '0x41b033f4a31df8067c24d1e9b550a2ce75fd4a29e1147af9752174f0e6cb20';
const transferSelector =
  '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e';
const safeTransferSelector =
  '0x19d59d013d4aa1a8b1ce4c8299086f070733b453c02d0dc46e735edc04d6444';

const SET_POLICY_EVENT_SELECTOR =
  '0xa79c31a86c9b0b2abf73ad994711fbad4da038921b96087ff074964aecc528';

const network = process.env.NETWORK as constants.StarknetChainId;
const nodeUrl = process.env.NODE_RPC_URL!;
const provider = new SequencerProvider({ network });
const rpcProvider = new RpcProvider({ nodeUrl });

/**
 *
 * @param signer Signer used by the user for this transaction. Used to fetch correct policy
 * @param transaction Signed transaction the user wants to perform
 * @returns 200: A signature of the tx by the starkCheck key.
 * @returns 400: The list of events that does not respect the policy.
 */
const verifyPolicy = async (
  signer: string,
  transaction: Invocation & InvocationsDetailsWithNonce
): Promise<Signature> => {
  const policyFromEvents = await getPolicyFromEvents(
    transaction.contractAddress,
    signer
  );
  const trace: TransactionTraceResponse = await getTrace(transaction);
  // for PoC if res > 0 it means a policy is not respected
  const res = verifyPolicyWithTrace(
    transaction.contractAddress,
    policyFromEvents,
    trace
  );
  if (res.length == 0) {
    const signedTransaction = signTransactionHash(
      transaction,
      provider.chainId
    );
    return signedTransaction;
  } else {
    throw `${res.length} event(s) found that does not respect the policy`;
  }
};

/**
 * This takes a policy and returns a base64 and a Array<feltEncodedString> of a policy
 * This currently does not check if a policy is valid
 * @param policy array<Policy>
 * @returns base64 encoded policy and a Array<feltEncodedString> of a policy
 */
const encodePolicy = (
  policy: Policy
): { base64: string; feltEncoded: Array<string> } => {
  const base64 = Buffer.from(JSON.stringify(policy)).toString('base64');
  const policyArray = base64.match(/.{1,31}/g) || [];
  const feltEncoded = policyArray.map((elem) =>
    shortString.encodeShortString(elem)
  );
  return {
    base64,
    feltEncoded,
  };
};

const getPolicies = async (
  address: string
): Promise<{ signer: string; policy: Policy }[]> => {
  const events = await fetchEvents(address);

  // note: can't use for in because of conflincting types on starknet.js
  const eventsLength = events.events.length;
  if (!eventsLength) throw 'Contract does not have any policies set onchain';

  const policies: Array<{ signer: string; policy: Policy }> = [];
  const signers: Array<string> = [];

  for (let i = eventsLength - 1; i >= 0; i--) {
    if (!signers.includes(events.events[i].data[0])) {
      // excludes first 2 params not related to the policy which are the signer pub key and the len of the policy
      const data = events.events[i].data?.slice(2);
      const policyString = data
        .map((d) => shortString.decodeShortString(d))
        .join()
        .split(',')
        .join('');

      const json = JSON.parse(
        Buffer.from(policyString, 'base64').toString('utf8')
      );
      policies.push({
        signer: events.events[i].data[0],
        policy: json,
      });
      signers.push(events.events[i].data[0]);
    }
  }
  if (!policies.length)
    throw 'Contract does not have a policy set onchain for this signer';

  return policies;
};

/**
 * recursively returns an array of events, if the current internal has an events field populated
 * this events has to match the selector we are watching
 * @param {*} trace
 * @returns Arrray of Events
 */
const extractEvents = (
  trace: FunctionInvocation
): Array<FunctionInvocation> => {
  return trace.events.length &&
    (trace.selector == approveSelector ||
      trace.selector == approveAllSelector ||
      trace.selector == transferSelector ||
      trace.selector == transferFromSelector ||
      trace.selector == safeTransferSelector)
    ? [trace].concat(
        trace.internal_calls.length
          ? trace.internal_calls.flatMap((it: FunctionInvocation) =>
              extractEvents(it)
            )
          : []
      )
    : trace.internal_calls.length
    ? trace.internal_calls.flatMap((it: FunctionInvocation) =>
        extractEvents(it)
      )
    : [];
};

/**
 * If calldata is sent in hex, convert it to felt.
 * @param calldata array as hex or felt
 * @returns calldata array as felt
 */
const sanitizeCallData = (calldata: Array<string>): Array<string> => {
  return calldata.map((data) => number.toFelt(data));
};

/**
 * Fetch the transaction trace by simulating its execution on the prodider RPC node
 * @param transaction signed transaction sent by the user
 * @returns trace: TransactionTraceResponse  The trace of transaction
 */
const getTrace = async (
  transaction: Invocation & InvocationsDetailsWithNonce
): Promise<TransactionTraceResponse> => {
  // starknet.js is not very smart
  transaction.calldata = sanitizeCallData(transaction.calldata || []);
  const trace: TransactionSimulationResponse =
    await provider.getSimulateTransaction(transaction, transaction);
  return trace.trace;
};

/**
 * Get all events from the account using the set_policy_event_selector
 * @param account
 * @returns events: RPC.GetEventsResponse all the events matching set_policy_event_selector
 */
const fetchEvents = async (account: string): Promise<RPC.GetEventsResponse> => {
  try {
    const eventFilter: RPC.EventFilter = {
      address: account,
      keys: [SET_POLICY_EVENT_SELECTOR],
      chunk_size: 20,
    };
    return await rpcProvider.getEvents(eventFilter);
  } catch (error) {
    throw "can't connect to RPC provider";
  }
};

/**
 * returns the most recent event linked to a signer from the policy events
 * TODO might reconstruct a policy from all past events
 * @param account: string Contract account address of the user
 * @param signer: string Signer used for the transaction.
 * @returns the last policy set for this signer on this account
 */
const getPolicyFromEvents = async (
  account: string,
  signer: string
): Promise<Policy[]> => {
  let data;

  const events = await fetchEvents(account);
  // note: can't use for in because of conflincting types on starknet.js
  const eventsLength = events.events.length;
  if (!eventsLength) throw 'Contract does not have any policies set onchain';

  for (let i = eventsLength - 1; i >= 0; i--) {
    if (events.events[i].data[0] == signer) {
      // excludes first 2 params not related to the policy which are the signer pub key and the len of the policy
      data = events.events[i].data?.slice(2);
      break;
    }
  }
  if (!data)
    throw 'Contract does not have a policy set onchain for this signer';

  // transform the chuncks into one string and converts felt into hex and replace all ',' by nothing to convert into base64 later
  const policyString = data
    .map((d) => shortString.decodeShortString(d))
    .join()
    .split(',')
    .join('');
  // convert string to base64 and parse it to JSON. TODO try catch

  return JSON.parse(Buffer.from(policyString, 'base64').toString('utf8'));
};

/**
 * If an address is in the 0x0 format change it to 0x
 * @param policy
 * @returns
 */
const sanitize0x = (policy: Policy): Policy => {
  policy.address = policy.address.replace('0x0', '0x');
  return policy;
};

/**
 * Checks all events emitted by the transaction against the user policies
 * Note: all events checked here are already filtered using the selectors we watch
 * @param account Contract account address of the user initiating a transaction
 * @param policies policies of the account that previously matched the signer used for the tx
 * @param trace Trace of the transaction that will be executed
 * @returns The list of events that does not respect a policy
 */
const verifyPolicyWithTrace = (
  account: string,
  policies: Policy[],
  trace: TransactionTraceResponse
) => {
  const policySanitized: Policy[] = policies.map(sanitize0x);
  const accountSatinized: string = account.replace('0x0', '0x');
  const events: Array<FunctionInvocation> = trace.function_invocation
    ? extractEvents(trace.function_invocation)
    : [];
  // Loop through all events with transfer/approve/etc selectors
  return events.filter((event: FunctionInvocation) =>
    // for each event, loop through each policy to check if it respects it
    policySanitized.reduce(
      (flag, policy) =>
        flag ||
        (event.caller_address == accountSatinized && // check if caller of the approve/transfer is our account
          policy.address == event.contract_address && // check if contract called is the one defined in this policy
          checkAmount(policy, event) &&
          findNFTIds(policy, event)),
      false
    )
  );
};

/**
 * Check if the amount of a call to an ERC20 is under the max amount in the policy
 * If there is no amount, this means this policy is not ERC20 related and we return true
 * if not ERC20 the flag will be turn to false by other checks
 * @param policy
 * @param event
 * @returns false if pass, true if amount is higher than policy or not ERC20 related
 */
const checkAmount = (policy: Policy, event: FunctionInvocation): boolean => {
  if (!policy.amount) return true;
  return number.toBN(policy.amount, 10).lte(number.toBN(event.calldata[1]));
};

/**
 * Check if the approve/transfer respect an NFT policy
 * If ids is undefined it means all the collection is protected or not NFT related
 * In both cases we return true (if nft this will flag the transfer)
 * if not nft the flag will be turn to false by other checks
 * @param policy
 * @param event
 * @returns false if pass, true if protected id is transfered or if approveAll is called
 */
const findNFTIds = (policy: Policy, event: FunctionInvocation): boolean => {
  if (!policy.ids || event.selector == approveAllSelector) return true;
  return policy.ids
    .map((id) => number.toBN(id))
    .reduce(
      (flag, idBn) => flag || idBn.eq(number.toBN(event.calldata[1])),
      false
    );
};

export default {
  verifyPolicy,
  verifyPolicyWithTrace,
  encodePolicy,
  getPolicies,
};
