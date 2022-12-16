const fs = require('fs');

const trace = JSON.parse(fs.readFileSync("txTrace1.json"));
const policyJSON = JSON.parse(fs.readFileSync("policy1.json"));

const approveSelector = "0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c"
const transferFromSelector = "0x41b033f4a31df8067c24d1e9b550a2ce75fd4a29e1147af9752174f0e6cb20"
const transferSelector= "0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e"

/**
 * recursively returns an array of events, if the current internal has an events field populated
 * this events has to match the selector we are watching
 * @param {*} trace 
 * @returns Arrray of Events
 */
const extractEvents = (trace) => 
  trace.events.length && (trace.selector == approveSelector || trace.selector == transferSelector || trace.selector == transferFromSelector) ? 
    [trace].concat(trace.internal_calls.length ? trace.internal_calls.flatMap( it => extractEvents(it)) : [])
  : trace.internal_calls.length ? trace.internal_calls.flatMap( it => extractEvents(it)) : []


const events = extractEvents(trace.function_invocation);

const owner = policyJSON.address;
// const owner = "0x071dc40f7a57befa889f77d9c912523843a7fc978f4ee422f1b4573a80108b73";
const res = events.filter( event =>
  policyJSON.policy.reduce( (flag, policy) => 
    flag || event.caller_address == owner && (policy.address == event.contract_address)
    , false)
)

const explainEvent = event => console.log("function on contract " + event.contract_address + "is trying to approve or send more than your policy")

const explainFlag = ( events => 
  events.map( explainEvent )
)

explainFlag(res)