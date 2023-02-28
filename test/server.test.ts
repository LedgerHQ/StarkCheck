// import policyService from '../src/services/policy';
import app from '../src/app';
import supertest from 'supertest';
import { readFileSync } from 'fs';

const events = JSON.parse(readFileSync('test/getPolicies/events.json', 'utf8'));
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
    getEvents: jest.fn().mockResolvedValue({
      events: [
        {
          block_hash:
            '0x1c32ea67fefbf43e98e6833139ad5eb6033ad6fc19edf92d0d936d9e9bb78b1',
          block_number: 732669,
          data: [
            '0x6bccce5bf55d75bfa115cb83b881e345de57343957680761adb1367d70ace83',
            '0x5',
            '0x573373695957526b636d567a63794936496a42344e446c6b4d7a59314e7a42',
            '0x6b4e4755304e6d59304f4755354f5459334e474a6b4d325a6a597a67304e6a',
            '0x51305a47526b4e6d49354e6d5933597a63304d5749784e545979596a67795a',
            '0x6a6c6c4d4441305a474d33496977695957317664573530496a6f694d544177',
            '0x4d4441774d4441774d434a3958513d3d',
          ],
          from_address:
            '0x38b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0',
          keys: [
            '0xa79c31a86c9b0b2abf73ad994711fbad4da038921b96087ff074964aecc528',
          ],
          transaction_hash:
            '0x6f66f7630300845150a2e9a399b2b2c1d0022cd01b875fa19c9934608cd45f0',
        },
        {
          block_hash:
            '0x7745dbc8b2a4c6eaad794b837e87c878871aeccbb4afb301fca0302b73d6ce6',
          block_number: 768603,
          data: [
            '0xbabe123',
            '0xa',
            '0x573373695957526b636d567a63794936496a42344e446c6b4d7a59314e7a42',
            '0x6b4e4755304e6d59304f4755354f5459334e474a6b4d325a6a597a67304e6a',
            '0x51305a47526b4e6d49354e6d5933597a63304d5749784e545979596a67795a',
            '0x6a6c6c4d4441305a474d33496977695957317664573530496a6f694d544177',
            '0x4d4441774d4441774d434a394c4873695957526b636d567a63794936496a42',
            '0x344e7a49335954597a5a6a63345a57557a5a6a46695a4445345a6a63344d44',
            '0x41354d4459334e4445785957497a4e6a6c6a4d7a466b5a574e6c4d57466c4d',
            '0x6a4a6c4d545a6d4e5459334f5441324e4441354f544131496977696157527a',
            '0x496a7062496a42344d6a49784e434973496a42344d6a49784f434a64665630',
            '0x3d',
          ],
          from_address:
            '0x38b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0',
          keys: [
            '0xa79c31a86c9b0b2abf73ad994711fbad4da038921b96087ff074964aecc528',
          ],
          transaction_hash:
            '0x31fa9ccaf283c3e447e08db12be4de48de5f24d92acf93f007b2031cda7823',
        },
      ],
    }),
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

  describe('getPolicies', () => {
    beforeEach(() => {
      // jest.spyOn('starknet', 'getEvents', 'lol')
    });
    test('/getPolicies', async () => {
      // const innerInvokeEstFeeSpy = jest.spyOn(account.signer, 'signTransaction');
      const response = await request
        .get(
          '/starkchecks/getPolicies/0x038b6f1f5e39f5965a28ff2624ab941112d54fe71b8bf1283f565f5c925566c0'
        )
        .set('Accept', 'application/json');

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        policies: [
          {
            signer: '0xbabe123',
            policy: [
              {
                address:
                  '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
                amount: '1000000000',
              },
              {
                address:
                  '0x727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905',
                ids: ['0x2214', '0x2218'],
              },
            ],
          },
          {
            signer:
              '0x6bccce5bf55d75bfa115cb83b881e345de57343957680761adb1367d70ace83',
            policy: [
              {
                address:
                  '0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
                amount: '1000000000',
              },
            ],
          },
        ],
      });
    });
  });
});
