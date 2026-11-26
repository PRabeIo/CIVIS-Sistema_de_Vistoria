// Montado em /empreendimentos já com auth + apenasAdmin (ver routes/index.js).
import { Router } from 'express';
import * as empreendimentoController from '../controllers/empreendimento.controller';
import { uploadImagemEmDisco } from '../utils/upload';

const router = Router();
const imagem = uploadImagemEmDisco('empreendimentos', 'anexos', 10);

router.post('/', ...imagem, empreendimentoController.criar);
router.get('/', empreendimentoController.listar);
router.get('/:id', empreendimentoController.buscarPorId);
router.get('/:id/imoveis', empreendimentoController.listarImoveis);
router.put('/:id', ...imagem, empreendimentoController.atualizar);
router.delete('/:id', empreendimentoController.deletar);

export = router;
