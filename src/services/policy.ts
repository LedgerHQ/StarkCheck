import { SequencerProvider, number } from "starknet";
import { Policy } from '../types/policy';
import BN from 'bn.js';

const approveSelector = "0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c";
const transferFromSelector = "0x41b033f4a31df8067c24d1e9b550a2ce75fd4a29e1147af9752174f0e6cb20";
const transferSelector= "0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e";

const network = "goerli-alpha";
const provider = new SequencerProvider({ network });

/**
 * recursively returns an array of events, if the current internal has an events field populated
 * this events has to match the selector we are watching
 * @param {*} trace 
 * @returns Arrray of Events
 */
 const extractEvents = (trace: any) => {
  return trace.events.length && (trace.selector == approveSelector || trace.selector == transferSelector || trace.selector == transferFromSelector) ? 
    [trace].concat(trace.internal_calls.length ? trace.internal_calls.flatMap( (it: any) => extractEvents(it)) : [])
  : trace.internal_calls.length ? trace.internal_calls.flatMap( (it: any) => extractEvents(it)) : []
}

const getTrace = async(transaction: any) => {
  // starknet.js is not very smart
  let trace: any = await provider.simulateTransaction(transaction, transaction);
  return trace.trace
}


const verifyPolicy = async (account: String, policy: Policy[], transaction: String) => {
    let trace: any = await getTrace(transaction);
    const res = verifyPolicyWithTrace(account, policy, trace);
    return "res:" + res.length
}

const verifyPolicyWithTrace = (account: String, policy: Policy[], trace: any) => {
  const events = extractEvents(trace.function_invocation);
  return events.filter( (event: any) => 
    policy.reduce( (flag, policy) => 
        flag || event.caller_address == account 
        && (policy.address == event.contract_address) 
        && number.toBN(policy.amount || "0", 10).lte(number.toBN(event.calldata[1])) // note: should branch if no amount 
        , false)
    );
}


export default { verifyPolicy, verifyPolicyWithTrace }


