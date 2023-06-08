import policyService from '../src/services/policy';
import { readFileSync } from 'fs';
import app from '../src/app';
import supertest from 'supertest';
import { RpcProviderOptions, RPC, SequencerProviderOptions } from 'starknet';

import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

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

    enum NetworkName {
      SN_MAIN = 'SN_MAIN',
      SN_GOERLI = 'SN_GOERLI',
      SN_GOERLI2 = 'SN_GOERLI2',
    }

    return new MockedSequencerProvider({
      network: NetworkName.SN_GOERLI,
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

  describe('AllowList', () => {
    /**
        "0x04aec73f0611a9be0524e7ef21ab1679bdf9c97dc7d72614f15373d431226b6a", // Alpha Road: Swap Controller
        "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",  //ETH
        "0x71dc40f7a57befa889f77d9c912523843a7fc978f4ee422f1b4573a80108b73",  // your account
        "0x72df4dc5b6c4df72e4288857317caf2ce9da166ab8719ab8306516a2fddfff7",  // ERC20 (BTC)
        "0x373c71f077b96cbe7a57225cd503d29cadb0056ed741a058094234d82de2f9",  // Alpha Road: Pool Factory
        "0x61fdcf831f23d070b26a4fdc9d43c2fbba1928a529f51b5335cd7b738f97945" // Alpha Road: ETH/arfBTC LP
     */
    test('policy pass', async () => {
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
        '3099236959300687300105724214960915423019936850019242140414748483763011225193',
        '2711129915003034886921698814745367841144106610119676458373505776106460938419',
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
