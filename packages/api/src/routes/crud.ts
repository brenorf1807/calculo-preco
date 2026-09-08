import { randomUUID } from "node:crypto";
import { Router, Request, Response, NextFunction } from "express";
import { ZodType, ZodTypeDef } from "zod";
import { Repository } from "../repositories/repository.js";

/**
 * Fábrica de rotas CRUD REST padrão para um recurso apoiado em `Repository<T>`.
 * `Input` é deixado solto (não igual ao Output) porque schemas com `.default(...)`
 * têm campos opcionais na entrada e obrigatórios na saída — é a saída (o que
 * `safeParse` devolve) que precisa bater com `Omit<T, "id">`.
 */
export function createCrudRouter<T extends { id: string }>(
  repository: Repository<T>,
  createSchema: ZodType<Omit<T, "id">, ZodTypeDef, unknown>,
): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await repository.list());
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await repository.get(req.params.id as string);
      if (!item) return res.status(404).json({ erro: "Registro não encontrado." });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ erro: "Dados inválidos.", detalhes: parsed.error.issues });
      }
      const item = { id: randomUUID(), ...parsed.data } as T;
      res.status(201).json(await repository.create(item));
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ erro: "Dados inválidos.", detalhes: parsed.error.issues });
      }
      const id = req.params.id as string;
      const item = { id, ...parsed.data } as T;
      const updated = await repository.update(id, item);
      if (!updated) return res.status(404).json({ erro: "Registro não encontrado." });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await repository.delete(req.params.id as string);
      if (!removed) return res.status(404).json({ erro: "Registro não encontrado." });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
