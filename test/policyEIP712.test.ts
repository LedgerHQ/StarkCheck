import policyService from '../src/services/policy';
import { readFileSync } from 'fs';

describe('policy EIP712 message service', () => {
    describe('ERC721', () => {
        test('Detect addresses from mint square message', async () => {
            const eip712message = JSON.parse(readFileSync('test/eip712/mintSquare.json').toString());
            const policy = JSON.parse(readFileSync("test/eip712/policyERC721.json").toString());
            const policyAddresses = policyService.policyToAddresses(policy.policy);
            const res = await policyService.verifySignatureRequestWithPolicy(policyAddresses, eip712message);
            expect(res.length).toBe(1);
        });
        test('Detect addresses from aspect message', async () => {
            const eip712message = JSON.parse(readFileSync('test/eip712/aspect.json').toString());
            const policy = JSON.parse(readFileSync("test/eip712/policyERC721.json").toString());
            const policyAddresses = policyService.policyToAddresses(policy.policy);
            const res = await policyService.verifySignatureRequestWithPolicy(policyAddresses, eip712message);
            expect(res.length).toBe(1);
        });
    });
  });