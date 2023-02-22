import { Policy } from "../types/policy"
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensure policy is an array of Policy
 */
export const policyCheckMiddleware = () => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.body.policy) {
        res.status(400).json({
            message: "policy is missing"
        });
    }
    else if (!Array.isArray(req.body.policy)) {
        res.status(400).json({
            message: "policy is not an array"
        });
    } else {
        const policyFormatOk = !req.body.policy.reduce( (res: boolean, pol: any) => {
            const key = Object.keys(pol);
            const ok = typeof pol.address === 'string' && (Array.isArray(pol.ids) || key.includes("amount"))
            return res || !ok;
        }, false)
        if (policyFormatOk) {
            next()
        } else {
            res.status(400).json({
                message: "policy malformed"
            });
        }
    }
}