import policyService from '../src/services/policy';
import { readFileSync } from 'fs';
import app from '../src/app';
import supertest from 'supertest';
import { RpcProviderOptions, RPC, SequencerProviderOptions } from 'starknet';

const txNotRespected = JSON.parse(
  readFileSync('test/getSimulateTransaction/txNotRespected.json', 'utf8')
);
const txRespected = JSON.parse(
  readFileSync('test/getSimulateTransaction/txRespected.json', 'utf8')
);

const trace = JSON.parse(
  readFileSync('test/getSimulateTransaction/trace/transferEth.json', 'utf8')
);
const traceTooMuch = JSON.parse(
  readFileSync(
    'test/getSimulateTransaction/trace/transferEthTooMuchSpent.json',
    'utf8'
  )
);
const events = JSON.parse(readFileSync('test/getPolicies/events.json', 'utf8'));

// increase timeout to prevent failure on github action
jest.setTimeout(20000);

// create a mock function that will replace the real implementation of
// (new RpcProvider(...)).getEvents. keeping the reference of the mocked
// function allow us to update the return value of the mocked function
// for each test case
const mockedGetEvents = jest.fn();
const mockedGetTrace = jest.fn();

// mock relevant object in starknetjs
jest.mock('starknet', () => ({
  // transform the module to es6 module, to avoid the read-only allocation error
  __esModule: true,
  // import the actual module to make sure we don't mock the actual implementation of starknetjs
  ...jest.requireActual('starknet'),
  // mock the RpcProvider class using a minimalist class that mock the important methods
  RpcProvider: jest.fn().mockImplementation(() => {
    class MockedRpcProvider extends jest.requireActual('starknet').RpcProvider {
      constructor(args: RpcProviderOptions) {
        super(args);
      }

      async getEvents(): Promise<RPC.GetEventsResponse> {
        // everytime the getEvents method is called, call the mockedGetEvents function
        // and return the value returned by the mocked function
        return mockedGetEvents();
      }

      // intercept all the requests made by the initial implementation and return a dumb value
      async fetchEndpoint() {
        // TODO: write a switch for all the possible endpoint and return coherent values
        return new Promise((resolve) => resolve(true));
      }
    }

    // return a new instance of the mocked class instead of the actual implementation
    return new MockedRpcProvider({
      nodeUrl: 'https://starknet-fakenetwork.infura.io/v3/fake-key',
    });
  }),
  SequencerProvider: jest.fn().mockImplementation(() => {
    class MockedSequencerProvider extends jest.requireActual('starknet')
      .SequencerProvider {
      constructor(args: SequencerProviderOptions) {
        super(args);
      }

      async getSimulateTransaction(): Promise<RPC.GetEventsResponse> {
        return mockedGetTrace();
      }
    }

    return new MockedSequencerProvider({
      network: 'goerli-alpha',
    });
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
    mockedGetEvents.mockReturnValue(events);
  });

  test('OK', async () => {
    mockedGetTrace.mockReturnValue(trace);
    const response = await request
      .post('/starkchecks/verify')
      .send(txRespected)
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
    mockedGetTrace.mockReturnValue(traceTooMuch);
    const response = await request
      .post('/starkchecks/verify')
      .send(txNotRespected)
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual(
      '1 event(s) found that does not respect the policy'
    );
  });

  test('Event has no policy for signer', async () => {
    const tx = { ...txRespected };
    tx.signer =
      '0x6bccce5bf55d75bfa115cb83b881e345de57343957680761adb1367d70ace82';
    mockedGetTrace.mockReturnValue(trace);
    const response = await request
      .post('/starkchecks/verify')
      .send(tx)
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.status).toEqual(400);
    expect(response.body.message).toEqual(
      'Contract does not have a policy set onchain for this signer'
    );
  });
});
