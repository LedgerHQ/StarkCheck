import express from 'express';
import controller from '../controllers/policy';
const app = express.Router();

app.post('/starkchecks/verify', controller.verifyPolicy);
app.post('/starkchecks/encodePolicy', controller.encodePolicy);

export default app;