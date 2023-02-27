import { Request, Response } from 'express';
import { InvocationsDetailsWithNonce, Invocation } from 'starknet';

import policyService from '../services/policy';
import { Policy } from '../types/policy';

const verifyPolicy = async (req: Request, res: Response) => {
  // get the data from req.body
  const signer: string = req.body.signer;
  const transaction: Invocation & InvocationsDetailsWithNonce =
    req.body.transaction;
  try {
    const signature = await policyService.verifyPolicy(signer, transaction);
    return res.status(200).json({
      signature,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error,
    });
  }

  // return response
};

const encodePolicy = async (req: Request, res: Response) => {
  // get the data from req.body
  const policy: Policy = req.body.policy;
  try {
    const policyEncoded = await policyService.encodePolicy(policy);
    return res.status(200).json({
      policyEncoded,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error,
    });
  }
};

const getPolicies = async (req: Request, res: Response) => {
  // get the data from req.body
  const address: string = req.params.address;
  try {
    const policies = await policyService.getPolicies(address);
    return res.status(200).json({
      policies,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error,
    });
  }
};

export default { verifyPolicy, encodePolicy, getPolicies };
