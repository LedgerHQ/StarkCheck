import express from 'express';
import controller from '../controllers/policy';
import { policyCheckMiddleware } from '../middleware/policy';
const app = express.Router();

app.post('/starkchecks/verify', controller.verifyPolicy);
app.post(
  '/starkchecks/encodePolicy',
  policyCheckMiddleware(),
  controller.encodePolicy
);
app.get('/starkchecks/getPolicies/:address', controller.getPolicies);

export default app;
