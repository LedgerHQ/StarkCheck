import {
  constants,
  SequencerProvider,
  RpcProvider,
  RPC,
  num,
  cairo,
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

const transferEventKey =
  '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9';
const approvalEventKey =
  '0x134692b230b9e1ffa39098904722134159652b09c5bc41d88d6698779d228ff';
const approvalForAllEventKey =
  '0x6ad9ed7b6318f1bcffefe19df9aeb40d22c36bed567e1925a5ccde0536edd';

const SET_POLICY_EVENT_SELECTOR =
  '0xa79c31a86c9b0b2abf73ad994711fbad4da038921b96087ff074964aecc528';

const network = process.env.NETWORK as constants.StarknetChainId;
const nodeUrl = process.env.NODE_RPC_URL!;
const provider = new SequencerProvider({ network });
const rpcProvider = new RpcProvider({ nodeUrl });

interface TransferEvent {
  sender: string;
  receiver: string;
  amount: string;
}

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
      await provider.getChainId()
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

/**
 * Get all policies from an account using events stored on chain
 * @param account string.
 * @returns an array of policies with their associated signers
 */
const getPolicies = async (
  account: string
): Promise<
  {
    signer: string;
    policy: Policy[];
  }[]
> => {
  const policies: {
    signer: string;
    policy: Policy[];
  }[] = [];
  const events = await fetchEvents(account);
  const eventsLength = events.events.length;
  const signers: string[] = [];
  if (!eventsLength) throw 'Contract does not have any policies set onchain';

  // note: can't use for in because of conflincting types on starknet.js
  for (let i = eventsLength - 1; i >= 0; i--) {
    const signer = events.events[i].data[0];
    if (!signers.includes(signer)) {
      // excludes first 2 params not related to the policy which are the signer pub key and the len of the policy
      const policy = eventToPolicy(events.events[i].data?.slice(2));
      signers.push(signer);
      policies.push({
        signer,
        policy,
      });
    }
  }
  return policies;
};

/**
 * recursively returns an array of FunctionInvocation, if the current internal has an events field populated
 * this events has to match the selector we are watching
 * @param FunctionInvocation trace
 * @returns Arrray of FunctionInvocation (events)
 */
const extractEvents = (
  trace: FunctionInvocation
): Array<FunctionInvocation> => {
  const eventKeys = [
    transferEventKey,
    approvalEventKey,
    approvalForAllEventKey,
  ];
  return trace.events.some((event) => eventKeys.includes(event.keys[0]))
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
 * Recursively returns an array of contract addresses.
 * @param {FunctionInvocation} trace
 * @param {number} currentDepth - The current depth in the tree.
 * @param {number} maxDepth - The maximum depth to traverse in the tree.
 * @returns {Array<string>} An array of contract addresses.
 */
const extractContractAddresses = (
  trace: FunctionInvocation,
  currentDepth = 0,
  maxDepth = Infinity
): Array<string> => {
  // Stop the recursion if the current depth exceeds the max depth
  if (currentDepth > maxDepth) {
    return [];
  }

  const contractAddresses: Array<string> = trace.contract_address
    ? [trace.contract_address]
    : [];

  if (trace.internal_calls.length) {
    trace.internal_calls.forEach((internalCall: FunctionInvocation) => {
      contractAddresses.push(
        ...extractContractAddresses(internalCall, currentDepth + 1, maxDepth)
      );
    });
  }

  // Use Set to remove duplicates and return the unique addresses
  return Array.from(new Set(contractAddresses));
};

/**
 * If calldata is sent in hex, convert it to felt.
 * @param calldata array as hex or felt
 * @returns calldata array as felt
 */
const sanitizeCallData = (calldata: any): Array<string> => {
  return calldata.map((data: any) => cairo.felt(data));
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
    await provider.getSimulateTransaction(
      transaction,
      transaction,
      undefined,
      true
    );
  return trace.trace;
};

/**
 * Get all events from the account using the set_policy_event_selector
 * @param account
 * @returns events: RPC.GetEventsResponse all the events matching set_policy_event_selector
 */
const fetchEvents = async (account: string): Promise<RPC.GetEventsResponse> => {
  try {
    // god starknet js is stupid
    enum BLOCK_TAG {
      latest = 'latest',
      pending = 'pending',
    }
    const eventFilter: RPC.EventFilter = {
      address: account,
      keys: [SET_POLICY_EVENT_SELECTOR],
      chunk_size: 20,
      from_block: { block_number: 50000 },
      to_block: BLOCK_TAG.pending,
    };
    return await rpcProvider.getEvents(eventFilter);
  } catch (error) {
    throw "can't connect to RPC provider";
  }
};

/**
 * transform raw events into a policy object
 * @param data raw event
 * @returns
 */
const eventToPolicy = (data: string[]): Policy[] => {
  // transform the chuncks into one string and converts felt into hex and replace all ',' by nothing to convert into base64 later
  const policyString = data
    .map((d) => shortString.decodeShortString(d))
    .join()
    .split(',')
    .join('');

  return JSON.parse(Buffer.from(policyString, 'base64').toString('utf8'));
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
  const eventsLength = events.events.length;
  if (!eventsLength) throw 'Contract does not have any policies set onchain';

  // note: can't use for in because of conflincting types on starknet.js
  for (let i = eventsLength - 1; i >= 0; i--) {
    if (events.events[i].data[0] == signer) {
      // excludes first 2 params not related to the policy which are the signer pub key and the len of the policy
      data = events.events[i].data?.slice(2);
      break;
    }
  }
  if (!data)
    throw 'Contract does not have a policy set onchain for this signer';

  return eventToPolicy(data);
};

/**
 * If an address is in the 0x0 format change it to 0x
 * @param policy
 * @returns
 */
const sanitize0x = (policy: Policy): Policy => {
  if (policy.address) policy.address = policy.address.replace('0x0', '0x');
  if (policy.allowlist)
    policy.allowlist = policy.allowlist.map((addr) =>
      addr.replace('0x0', '0x')
    );

  return policy;
};

/**
 * Extracts the 'allowlist' field from a 'policy' object.
 *
 * @param {Policy[]} policy - The policy array from the JSON data.
 *
 * @returns {string[]} - An array of addresses from the 'allowlist' field if found,
 * otherwise an empty array.
 *
 */
function extractAllowlistAddresses(policy: Policy[]): string[] {
  for (const item of policy) {
    if (item.allowlist) {
      return item.allowlist;
    }
  }
  return [];
}

function extractTransferInfo(
  trace: FunctionInvocation,
  caller_address: string
): TransferEvent[] {
  let transferEvents: TransferEvent[] = [];

  const eventData = trace.events
    .filter(
      (event) =>
        event.keys[0] === transferEventKey &&
        (event.data[1] === caller_address || event.data[0] === caller_address)
    )
    .map((event) => {
      console.log(event);
      return {
        sender: event.data[0],
        receiver: event.data[1],
        amount: event.data[2],
      };
    });

  transferEvents.push(...eventData);

  // Recursively search in internal_calls
  for (const internalCall of trace.internal_calls) {
    transferEvents = [
      ...transferEvents,
      ...extractTransferInfo(internalCall, caller_address),
    ];
  }

  return transferEvents;
}

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
  const extractedAddresses = trace.function_invocation
    ? extractContractAddresses(trace.function_invocation, 0, 2)
    : [];

  const userAddresses: string[] = extractAllowlistAddresses(policySanitized);
  // Filter extractedAddresses to only include addresses that are not in userAddressesSet
  const userAddressesSet = new Set(userAddresses).add(account);
  const missingAddresses = extractedAddresses.filter(
    (address) => !userAddressesSet.has(address)
  );

  const balanceChanges = trace.function_invocation
    ? extractTransferInfo(trace.function_invocation, account)
    : [];

  console.log(balanceChanges);

  // Returns an array of addresses not present in the userAddresses array.
  // If all addresses are present, it will return an empty array.
  if (missingAddresses.length) {
    console.log(missingAddresses);
    return missingAddresses;
  }

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
  return num.toBigInt(policy.amount) <= num.toBigInt(event.calldata[1]);
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
  if (
    !policy.ids ||
    event.events.some((event) => event.keys[0] === approvalForAllEventKey)
  )
    return true;
  return policy.ids
    .map((id) => num.toBigInt(id))
    .reduce(
      (flag, idBn) => flag || idBn == num.toBigInt(event.calldata[1]),
      false
    );
};

export default {
  verifyPolicy,
  verifyPolicyWithTrace,
  extractContractAddresses,
  encodePolicy,
  getPolicies,
};
