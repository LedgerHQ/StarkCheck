import policyService from '../src/services/policy';
import { readFileSync } from 'fs';

describe('policy service', () => {
    test('ERC20 policy pass', async () => {
        const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
        const policy = JSON.parse(readFileSync("test/policy1.json").toString());
        const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
        console.log(res);
        expect(res.length).toBe(0);
    });
    test('ERC20 policy amount greater than transfered', async () => {
        const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
        const policy = JSON.parse(readFileSync("test/policy1.json").toString());
        policy.policy[0].amount = "2";
        const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
        expect(res.length).toBe(1);
    });
    test('ERC20 policy without amount does not validate', async () => {
        const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
        const policy = JSON.parse(readFileSync("test/policy1.json").toString());
        policy.policy[0].amount = undefined;
        const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
        expect(res.length).toBe(1);

    });
  });