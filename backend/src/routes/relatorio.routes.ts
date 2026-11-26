import { Router } from 'express';
import { gerarRelatorio } from '../controllers/relatorio.controller';
import { apenasVistoriador } from '../middlewares/role.middleware';
import { COMODOS } from '../services/relatorio.service';
import { uploadFotosEmMemoria } from '../utils/upload';

const router = Router();

// Fotos só nos campos conhecidos (anexos_<cômodo>), em memória: vão direto para o PDF.
const fotos = uploadFotosEmMemoria(COMODOS.map((c: string) => `anexos_${c}`));

router.post('/gerar', apenasVistoriador, ...fotos, gerarRelatorio);

export = router;
