import policyService from '../src/services/policy';
import { readFileSync } from 'fs';

describe('policy service', () => {
    describe('ERC20', () => {
        test('ERC20 policy pass', async () => {
            const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
            const policy = JSON.parse(readFileSync("test/policyERC20.json").toString());
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(0);
        });
        test('ERC20 policy pass - policy 0x0 format', async () => {
            const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
            const policy = JSON.parse(readFileSync("test/policyERC20.json").toString());
            policy.policy[0].address = "0x072df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7";
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(0);
        });
        test('simple ERC20 transfer policy - Account 0x0 format', async () => {
            const trace = JSON.parse(readFileSync('test/simpleTransfer.json').toString());
            const policy = JSON.parse(readFileSync("test/policySimpleTransfer.json").toString());
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(1);
        });
        test('ERC20 policy amount greater than transfered', async () => {
            const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
            const policy = JSON.parse(readFileSync("test/policyERC20.json").toString());
            policy.policy[0].amount = "2";
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(1);
        });
        test('ERC20 policy amount greater than transfered - 0x0 format', async () => {
            const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
            const policy = JSON.parse(readFileSync("test/policyERC20.json").toString());
            policy.policy[0].amount = "2";
            policy.policy[0].address = "0x072df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7";
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(1);
        });
        test('ERC20 policy without amount does not validate', async () => {
            const trace = JSON.parse(readFileSync('test/txTrace1.json').toString());
            const policy = JSON.parse(readFileSync("test/policyERC20.json").toString());
            policy.policy[0].amount = undefined;
            const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
            expect(res.length).toBe(1);
        });
    });
    describe('ERC-721', () => {
        describe('setApproveAll', () => {
            test('ERC-721 policy with ids', async () => {
                const trace = JSON.parse(readFileSync('test/traceApproveAll.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721.json").toString());
                policy.policy[0].ids = ["7"];
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(1);
            });
            test('ERC-721 policy without IDS does not validate', async () => {
                const trace = JSON.parse(readFileSync('test/traceApproveAll.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721.json").toString());
                policy.policy[0].ids = undefined;
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(1);
            });
        });
        describe('Approve ids', () => {
            test('ERC-721 policy pass', async () => {
                const trace = JSON.parse(readFileSync('test/traceApprove.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721Approve.json").toString());
                policy.policy[0].ids = ["1337"];
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(0);
            });
            test('ERC-721 policy with ids', async () => {
                const trace = JSON.parse(readFileSync('test/traceApprove.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721Approve.json").toString());
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(1);
            });
            test('ERC-721 policy without IDS does not validate', async () => {
                const trace = JSON.parse(readFileSync('test/traceApprove.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721Approve.json").toString());
                policy.policy[0].ids = undefined;
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(1);
            });
        });
        describe('check policy does not block during mint', () => {
            test('ERC-721 policy with ids', async () => {
                const trace = JSON.parse(readFileSync('test/traceMint.json').toString());
                const policy = JSON.parse(readFileSync("test/policyERC721Approve.json").toString());
                policy.account = "0x64225cd4ea2ab991a5539106336037d048e8d37c6d9b9cc49001df6a995d527";
                const res = await policyService.verifyPolicyWithTrace(policy.account, policy.policy, trace);
                expect(res.length).toBe(0);
            });        
        });
    });
  });