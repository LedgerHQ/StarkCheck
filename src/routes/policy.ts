import express from 'express';
import controller from '../controllers/policy';
const router = express.Router();

router.post('/starkchecks/verify', controller.verifyPolicy);
router.post('/starkchecks/encodePolicy', controller.encodePolicy);

export { router };