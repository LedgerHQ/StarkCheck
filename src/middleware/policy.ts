import { Response, NextFunction } from 'express';
import { Policy } from '../types/policy';
import { TypedRequestBody } from '../types/common';

/**
 * Middleware that ensure policy is an array of Policy
 */
export const policyCheckMiddleware = () => (
    req: TypedRequestBody<{ policy: Policy }>,
    res: Response,
    next: NextFunction
) => {
    if (!req.body.policy)
        return res.status(400).json({ message: "policy is missing" });

    if (!Array.isArray(req.body.policy)) {
        return res.status(400).json({ message: "policy is not an array" });
    }

    const policyFormatOk = !req.body.policy.reduce((res: boolean, pol: Policy) => {
        const keys = Object.keys(pol);
        const ok = typeof pol.address === 'string' && (Array.isArray(pol.ids) || keys.includes("amount"))
        return res || !ok;
    }, false)

    policyFormatOk ? next() : res.status(400).json({ message: "policy malformed" });
}