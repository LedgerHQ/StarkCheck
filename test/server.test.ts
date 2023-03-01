// import policyService from '../src/services/policy';
import app from '../src/app';
import supertest from 'supertest';
import { readFileSync } from 'fs';

const events = JSON.parse(readFileSync('test/getPolicies/events.json', 'utf8'));
const policyFormatted = JSON.parse(
  readFileSync('test/getPolicies/policyFormatted.json', 'utf8')
);
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
    getEvents: jest
      .fn()
      .mockImplementationOnce((_) => events)
      .mockImplementationOnce((_) => ({
        events: [],
      })),
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
