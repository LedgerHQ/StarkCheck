# Starkcheck

StarkCheck is a module to Ledger Fresh that simulates transaction sent by an user and ensure they respect a defined policy.
The goal is to protect the user assets by using a second signature made by StarkCheck to prevent malwares when using a less secured signer.

## How it works

The contract account is modified to take a second signature made by Starkcheck to validate its transaction. This signature is returned by this API if the tx respect the policy.
A policy is link to a signer of the acccount, so an user can define a policy based on the security of the signer. i.e a nano can be allowed to perform more operations.

## API

This API expose a route to submit a sign transaction with the signer pub_key. Under the hood the following steps are done.

- Fetch the policy on chain using the events.
- Simulate the transaction to get its trace
- On the trace get all events that are related to approve and transfer
- check that the policy is respected
- Sign the transactionHash is the policy is respected. Else returns the number of events that does not respect the policy

it also exposes routes to encode/decode a Policy

## Policy

### Policy type and expression

The policy is express as an Array of

```
interface Policy {
    address: string;
    amount?: string;
    ids?: string[];
}
```

if Amount is defined -> ERC20 rules for spending (per transaction)
if ids is defined -> ERC721 rules for protecting NFT. If ids = [] all NFTs from the collection are protected

### Policy storage

The policy is stored on starknet using the cheap storage of Events. Because a signer can be used on many devices we can't rely on local storage and we don't want to store the policy on starkchecks directly.

To save space the following encoding is done to the policy
![policy](https://user-images.githubusercontent.com/5360522/218427340-a840e045-4860-4ca4-aebf-7f9f08c89051.png)

The event looks like this

`event policy_Allowlist (signer_pub_key: felt,policy_len: felt,policy: felt*)`

## Getting Started

## Requirements

- Node >16.X

## Install

First install the dependencies

```shell
    pnpm install
```

Then install the pre-push hook using lefthook

```shell
    npx lefthook install pre-push
```

## Tests

```shell
    pnpm test
```

Tests are run against real trace transactions made onchain. On note.md you can see on starkscan the transaction.
To extract its trace run

    starknet get_transaction_trace --hash <txHash> --network alpha-mainnet > trace.json
