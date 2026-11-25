import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export async function login(req: Request, res: Response) {
  const { email, senha } = req.body ?? {};

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
  }

  try {
    const result = await authService.autenticar(email, senha);
    if (result.erro !== undefined) {
      return res.status(result.status).json({ erro: result.erro });
    }
    return res.status(200).json({ token: result.token, usuario: result.usuario });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}
