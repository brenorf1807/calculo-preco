import { Router, Request, Response, NextFunction } from "express";
import { calculoPrecoSchema, engenhariaReversaSchema } from "./schemas.js";
import { calcularPrecoDeVenda, calcularMargemRealParaPreco } from "../services/calculo.service.js";

export const calculoRouter = Router();

calculoRouter.post("/preco", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = calculoPrecoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos.", detalhes: parsed.error.issues });
    }
    res.json(await calcularPrecoDeVenda(parsed.data));
  } catch (err) {
    next(err);
  }
});

calculoRouter.post("/engenharia-reversa", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = engenhariaReversaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos.", detalhes: parsed.error.issues });
    }
    res.json(await calcularMargemRealParaPreco(parsed.data));
  } catch (err) {
    next(err);
  }
});
