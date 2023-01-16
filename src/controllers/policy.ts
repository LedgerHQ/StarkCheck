import { Request, Response, NextFunction } from 'express';
import policyService from '../services/policy';

import { Policy } from '../types/policy';

// adding a post
const verifyPolicy = async (req: Request, res: Response, next: NextFunction) => {
    // get the data from req.body
    let policy: Policy[] = req.body.policy;
    let account: string = req.body.account;
    let transaction: string = req.body.transaction;
    try {
        const policyRes: any = await policyService.verifyPolicy(account, policy, transaction);
        return res.status(200).json({
            message: policyRes
        });
    } catch (error) {
        return res.status(400).json({
            message: error
        });
    }

    // return response

};

export default { verifyPolicy };
