// import policyService from '../src/services/policy';
import app from '../src/app';
import supertest from 'supertest';
import { readFileSync } from 'fs';
import { RpcProviderOptions, RPC } from 'starknet';

const events = JSON.parse(readFileSync('test/getPolicies/events.json', 'utf8'));
const policyFormatted = JSON.parse(
  readFileSync('test/getPolicies/policyFormatted.json', 'utf8')
);

// create a mock function that will replace the real implementation of
// (new RpcProvider(...)).getEvents. keeping the reference of the mocked
// function allow us to update the return value of the mocked function
// for each test case
const mockedGetEvents = jest.fn();

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

      async getEvents(
        eventsFilter: RPC.EventFilter
      ): Promise<RPC.GetEventsResponse> {
        // everytime the getEvents method is called, call the mockedGetEvents function
        // and return the value returned by the mocked function
        return mockedGetEvents(eventsFilter);
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
}));

describe('server', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = supertest(app);
  });

  test('/ping', async () => {
    const response = await request
      .get('/ping')
      .set('Accept', 'application/json');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.status).toEqual(200);
    expect(response.body.message).toEqual('Server is up and running');
  });

  describe('/getPolicies', () => {
    test('OK', async () => {
      // mock the getEvents method to return the full list of events
      mockedGetEvents.mockReturnValue(events);

      const response = await request
        .get(
          '/starkchecks/getPolicies/0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0'
        )
        .set('Accept', 'application/json');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(policyFormatted);
    });

    test('No policy found', async () => {
      // mock the getEvents method to return an empty array
      mockedGetEvents.mockReturnValue({ events: [] });

      const response = await request
        .get(
          '/starkchecks/getPolicies/0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0'
        )
        .set('Accept', 'application/json');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.status).toEqual(400);
      expect(response.body.message).toEqual(
        'Contract does not have any policies set onchain'
      );
    });
  });
});
