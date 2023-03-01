import policyService from '../src/services/policy';
import { readFileSync } from 'fs';
import app from '../src/app';
import supertest from 'supertest';

const trace = JSON.parse(
  readFileSync('test/getSimulateTransaction/transferEth.json', 'utf8')
);
const traceTooMuch = JSON.parse(
  readFileSync(
    'test/getSimulateTransaction/transferEthTooMuchSpent.json',
    'utf8'
  )
);
const events = JSON.parse(readFileSync('test/getPolicies/events.json', 'utf8'));

// increase timeout to prevent failure on github action
jest.setTimeout(20000);

// mock relevant object in starknetjs
jest.mock('starknet', () => ({
  // transform the module to es6 module, to avoid the read-only allocation error
  __esModule: true,
  // import the actual module to make sure we don't mock the actual implementation of starknetjs
  ...jest.requireActual('starknet'),
  // mock the RpcProvider class using a minimalist implementation
  // this mock is required because the provider fire the fetchEndpoint method on instantiation
  // that request the RPC endpoint
  RpcProvider: jest.fn().mockReturnValue({
    getEvents: jest.fn((_) => events),
  }),
  SequencerProvider: jest.fn().mockReturnValue({
    chainId: '0x534e5f474f45524c49',
    getSimulateTransaction: jest
      .fn()
      .mockImplementationOnce((_) => trace)
      .mockImplementationOnce((_) => traceTooMuch),
  }),
}));

describe('policy detection tests', () => {
  describe('ERC20', () => {
    test('ERC20 policy pass', async () => {
      const trace = JSON.parse(readFileSync('test/txTrace1.json', 'utf8'));
      const policy = JSON.parse(readFileSync('test/policyERC20.json', 'utf8'));
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(0);
    });
    test('ERC20 policy pass - policy 0x0 format', async () => {
      const trace = JSON.parse(readFileSync('test/txTrace1.json', 'utf8'));
      const policy = JSON.parse(readFileSync('test/policyERC20.json', 'utf8'));
      policy.policy[0].address =
        '0x072df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7';
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(0);
    });
    test('simple ERC20 transfer policy - Account 0x0 format', async () => {
      const trace = JSON.parse(
        readFileSync('test/simpleTransfer.json', 'utf8')
      );
      const policy = JSON.parse(
        readFileSync('test/policySimpleTransfer.json', 'utf8')
      );
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(1);
    });
    test('ERC20 policy amount greater than transfered', async () => {
      const trace = JSON.parse(readFileSync('test/txTrace1.json', 'utf8'));
      const policy = JSON.parse(readFileSync('test/policyERC20.json', 'utf8'));
      policy.policy[0].amount = '2';
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(1);
    });
    test('ERC20 policy amount greater than transfered - 0x0 format', async () => {
      const trace = JSON.parse(readFileSync('test/txTrace1.json', 'utf8'));
      const policy = JSON.parse(readFileSync('test/policyERC20.json', 'utf8'));
      policy.policy[0].amount = '2';
      policy.policy[0].address =
        '0x072df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7';
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(1);
    });
    test('ERC20 policy without amount does not validate', async () => {
      const trace = JSON.parse(readFileSync('test/txTrace1.json', 'utf8'));
      const policy = JSON.parse(readFileSync('test/policyERC20.json', 'utf8'));
      policy.policy[0].amount = undefined;
      const res = await policyService.verifyPolicyWithTrace(
        policy.account,
        policy.policy,
        trace
      );
      expect(res.length).toBe(1);
    });
  });
  describe('ERC-721', () => {
    describe('setApproveAll', () => {
      test('ERC-721 policy with ids', async () => {
        const trace = JSON.parse(
          readFileSync('test/traceApproveAll.json', 'utf8')
        );
        const policy = JSON.parse(
          readFileSync('test/policyERC721.json', 'utf8')
        );
        policy.policy[0].ids = ['7'];
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(1);
      });
      test('ERC-721 policy without IDS does not validate', async () => {
        const trace = JSON.parse(
          readFileSync('test/traceApproveAll.json', 'utf8')
        );
        const policy = JSON.parse(
          readFileSync('test/policyERC721.json', 'utf8')
        );
        policy.policy[0].ids = undefined;
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(1);
      });
    });
    describe('Approve ids', () => {
      test('ERC-721 policy pass', async () => {
        const trace = JSON.parse(
          readFileSync('test/traceApprove.json', 'utf8')
        );
        const policy = JSON.parse(
          readFileSync('test/policyERC721Approve.json', 'utf8')
        );
        policy.policy[0].ids = ['1337'];
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(0);
      });
      test('ERC-721 policy with ids', async () => {
        const trace = JSON.parse(
          readFileSync('test/traceApprove.json', 'utf8')
        );
        const policy = JSON.parse(
          readFileSync('test/policyERC721Approve.json', 'utf8')
        );
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(1);
      });
      test('ERC-721 policy without IDS does not validate', async () => {
        const trace = JSON.parse(
          readFileSync('test/traceApprove.json', 'utf8')
        );
        const policy = JSON.parse(
          readFileSync('test/policyERC721Approve.json', 'utf8')
        );
        policy.policy[0].ids = undefined;
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(1);
      });
    });
    describe('check policy does not block during mint', () => {
      test('ERC-721 policy with ids', async () => {
        const trace = JSON.parse(readFileSync('test/traceMint.json', 'utf8'));
        const policy = JSON.parse(
          readFileSync('test/policyERC721Approve.json', 'utf8')
        );
        policy.account =
          '0x64225cd4ea2ab991a5539106336037d048e8d37c6d9b9cc49001df6a995d527';
        const res = await policyService.verifyPolicyWithTrace(
          policy.account,
          policy.policy,
          trace
        );
        expect(res.length).toBe(0);
      });
    });
  });
});

describe('policy API tests', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = supertest(app);
  });

  test('OK', async () => {
    const params = {
      signer:
        '0x6bccce5bf55d75bfa115cb83b881e345de57343957680761adb1367d70ace83',
      transaction: {
        nonce: '0',
        contractAddress:
          '0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0',
        calldata: [
          '0x1',
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
          '0x0',
          '0x3',
          '0x3',
          '0x5537071ea21b91a3b3743866ea12cf197f0b37a6b83be41dd0bbfec6a2cf8ef',
          '0x1000',
          '0x0',
        ],
        signature: [
          '0x05de0e9c122815097f71160805ecc9ada9b3694c1ecb80b55c5c171ebb44cc73',
          '1365647468420381883774098781551149124302310791256113135105364144492070570671',
          '2880894951324392555368269251218181147005460850072884989728825877787588076066',
        ],
        version: '1',
        maxFee: '11292252158384',
      },
    };
    const response = await request
      .post('/starkchecks/verify')
      .send(params)
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      signature: [
        '2574783916812235641217606860108264420836035622606275116211565106945357098436',
        '619937207968326657681386252878381755810713851287768744122286509072016201999',
      ],
    });
  });

  test('Policy not respected', async () => {
    const params = {
      signer:
        '0x6bccce5bf55d75bfa115cb83b881e345de57343957680761adb1367d70ace83',
      transaction: {
        nonce: '0',
        contractAddress:
          '0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0',
        calldata: [
          '0x1',
          '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          '0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e',
          '0x0',
          '0x3',
          '0x3',
          '0x5537071ea21b91a3b3743866ea12cf197f0b37a6b83be41dd0bbfec6a2cf8ef',
          '0x38d7ea4c68000',
          '0x0',
        ],
        signature: [
          '0x05de0e9c122815097f71160805ecc9ada9b3694c1ecb80b55c5c171ebb44cc73',
          '1577752799871498268109729476040605377222532826203412949027912072108808209957',
          '3351820308540296392371264187894666898033840131738263783210120114437364986098',
        ],
        version: '1',
        maxFee: '11292252158384',
      },
    };
    const response = await request
      .post('/starkchecks/verify')
      .send(params)
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual(
      '1 event(s) found that does not respect the policy'
    );
  });
});
