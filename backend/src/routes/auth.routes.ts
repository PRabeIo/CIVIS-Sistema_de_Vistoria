import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import auth from '../middlewares/auth.middleware';
import { limiteLogin, limiteRefresh } from '../middlewares/seguranca.middleware';

const router = Router();

router.post('/login', limiteLogin, authController.login);
router.post('/refresh', limiteRefresh, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);

export = router;
