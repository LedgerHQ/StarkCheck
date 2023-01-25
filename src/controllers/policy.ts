import { Request, Response, NextFunction } from 'express';
import { InvocationsDetailsWithNonce, Invocation } from "starknet";

import policyService from '../services/policy';

// adding a post
const verifyPolicy = async (req: Request, res: Response, next: NextFunction) => {
    // get the data from req.body
    let account: string = req.body.account;
    let transaction: Invocation & InvocationsDetailsWithNonce = req.body.transaction;
    try {
        const signature = await policyService.verifyPolicy(account, transaction);
        return res.status(200).json({
            signature
        });
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            message: error
        });
    }
};

const verifySignatureRequest = async (req: Request, res: Response, next: NextFunction) => {
    // get the data from req.body
    let account: string = req.body.account;
    let signatureRequest: object = req.body.signatureRequest;
    try {
        const policyRes: any = await policyService.verifySignatureRequest(account, signatureRequest);
        return res.status(200).json({
            message: policyRes
        });
    } catch (error) {
        return res.status(400).json({
            message: error
        });
    }
};

export default { verifyPolicy, verifySignatureRequest };
