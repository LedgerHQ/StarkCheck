import { SequencerProvider, RpcProvider, RPC, number, InvocationsDetailsWithNonce, Invocation, shortString, Signature } from "starknet";
import { Policy } from '../types/policy';
const approveSelector = "0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c";
const approveAllSelector = "0x2d4c8ea4c8fb9f571d1f6f9b7692fff8e5ceaf73b1df98e7da8c1109b39ae9a";
const transferFromSelector = "0x41b033f4a31df8067c24d1e9b550a2ce75fd4a29e1147af9752174f0e6cb20";
const transferSelector= "0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e";
const safeTransferSelector= "0x19d59d013d4aa1a8b1ce4c8299086f070733b453c02d0dc46e735edc04d6444";

import { signTransactionHash } from './signer';

require('dotenv').config()

const network: any = process.env.NETWORK || "goerli-alpha";
const SET_POLICY_EVENT_SELECTOR = "0x302e25484ae07e6b4f3f8dab280ac0e8f921a0d73b2a39d2fe7fcbc03b8f9d5";
const provider = new SequencerProvider({ network });
const rpcPovider = new RpcProvider({ nodeUrl: process.env.NODE_RPC_URL || "" });

/**
 * recursively returns an array of events, if the current internal has an events field populated
 * this events has to match the selector we are watching
 * @param {*} trace 
 * @returns Arrray of Events
 */
 const extractEvents = (trace: any) => {
  return trace.events.length && (
      trace.selector == approveSelector || 
      trace.selector == approveAllSelector || 
      trace.selector == transferSelector || 
      trace.selector == transferFromSelector ||
      trace.selector == safeTransferSelector
    ) ? 
    [trace].concat(trace.internal_calls.length ? trace.internal_calls.flatMap( (it: any) => extractEvents(it)) : [])
  : trace.internal_calls.length ? trace.internal_calls.flatMap( (it: any) => extractEvents(it)) : []
}

const getTrace = async(transaction: Invocation & InvocationsDetailsWithNonce) => {
  // starknet.js is not very smart
  let trace: any = await provider.getSimulateTransaction(transaction, transaction);
  return trace.trace
}

const getPolicyFromEvents = async(account: string): Promise<Policy[]> => {
  const eventFilter: RPC.EventFilter = {
    address: account,
    keys: [SET_POLICY_EVENT_SELECTOR],
    chunk_size: 20
  }
  const events = await rpcPovider.getEvents(eventFilter);
  // PoC works with only one events for policy. Might take only last one for tests/replacements
  // excludes first 2 params not related to the policy
  let data;
  try {
     data = events.events[0].data?.slice(2);
  } catch (error) {
      throw "Contract does not have a policy set onchain"
  }
  // transform the chuncks into one string and converts felt into hex and replace all ',' by nothing to convert into base64 later 
  const policyString = data.map( d => shortString.decodeShortString(d)).join().split(',').join('');
  // convert string to base64 and parse it to JSON. TODO try catch
  try {
    return JSON.parse(Buffer.from(policyString, 'base64').toString('utf8'));  
  } catch (error) {
    throw error
  }
} 

const verifyPolicy = async (account: string, transaction: Invocation & InvocationsDetailsWithNonce): Promise<Signature> => {
  try {
    let trace: any = await getTrace(transaction);
    const policyFromEvents = await getPolicyFromEvents(account);
    console.log(trace)
    // for PoC if res > 0 it means a policy is not respected
    const res = verifyPolicyWithTrace(account, policyFromEvents, trace);
    console.log(res);
    if ( res.length == 0 ) {
      const signedTransaction = signTransactionHash(transaction);
      return signedTransaction;
    } else {
      throw res;
    }
  } catch (error) {
    throw error
  }
}

const verifyPolicyWithTrace = (account: string, policy: Policy[], trace: any) => {
  const events = extractEvents(trace.function_invocation);
  return events.filter( (event: any) => 
    policy.reduce( (flag, policy) => 
        flag || event.caller_address == account 
        && (policy.address == event.contract_address) 
        && number.toBN(policy.amount || "0", 10).lte(number.toBN(event.calldata[1])) // note: should branch if no amount 
        && findNFTIds(event, policy)
        , false)
    );
}

const findNFTIds = (event: any, policy: Policy): boolean => {
  console.log(policy.ids, event);
  if ( !policy.ids || event.selector == approveAllSelector ) return true;
  const res = policy.ids.map( id => number.toBN(id) ).reduce( (flag, idBn) => flag || idBn.eq(number.toBN(event.calldata[1])), false);
  // console.log(res, policy.ids||[].map(number.toBN), number.toBN(event.calldata[1]));
  return res;
}
 

export default { verifyPolicy, verifyPolicyWithTrace }


