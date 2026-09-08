import { Router, Request, Response, NextFunction } from "express";
import { empresaStore } from "../repositories/store.js";
import { empresaSchema } from "./schemas.js";

export const empresaRouter = Router();

empresaRouter.get("/", (_req: Request, res: Response) => {
  const empresa = empresaStore.get();
  if (!empresa) return res.status(404).json({ erro: "Empresa ainda não configurada." });
  res.json(empresa);
});

empresaRouter.put("/", (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = empresaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ erro: "Dados inválidos.", detalhes: parsed.error.issues });
    }
    res.json(empresaStore.set(parsed.data));
  } catch (err) {
    next(err);
  }
});
