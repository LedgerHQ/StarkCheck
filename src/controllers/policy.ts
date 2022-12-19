import { Request, Response, NextFunction } from 'express';
import policyService from '../services/policy';

import { Policy } from '../types/policy';

// adding a post
const verifyPolicy = async (req: Request, res: Response, next: NextFunction) => {
    // get the data from req.body
    let policy: Policy[] = req.body.policy;
    let account: String = req.body.account;
    let transaction: String = req.body.transaction;
    
    const policyRes: any = await policyService.verifyPolicy(account, policy, transaction);

    // return response
    return res.status(200).json({
        message: policyRes
    });
};

export default { verifyPolicy };
