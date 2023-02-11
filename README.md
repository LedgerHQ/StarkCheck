## POC Starkcheck

This API in this current version takes a policy in a JSON format and a transaction in the starknet-js format. 
It simulates the transaction and check the emitted events to see a transaction respect a given policy.

## install

    npm i 

## tests

    npm tests

Tests are run against real trace transactions made onchain. On note.md you can see on starkscan the transaction.
To extract its trace run 

    starknet get_transaction_trace --hash <txHash> --network alpha-mainnet > trace.json

    starknet get_transaction_trace --hash 0x5e1cb5610d130f0da72128e746a493cbe6286b8c23ea2272d396722dce489e1 --network alpha-testnet > trace.json