import { Request, Response, NextFunction } from "express";
import { PrecoImpossivelError } from "@calculo-preco/engine";
import { EmpresaNaoConfiguradaError } from "./services/calculo.service.js";

const STATUS_POR_NOME_DE_ERRO: Record<string, number> = {
  PrecoImpossivelError: 422,
  EmpresaNaoConfiguradaError: 409,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const error = err as Error;
  const status = STATUS_POR_NOME_DE_ERRO[error?.name ?? ""] ?? (error instanceof Error && error.message.includes("não encontrad") ? 404 : 400);

  const detalheAdicional =
    err instanceof PrecoImpossivelError
      ? " Este é um erro esperado pelo motor de cálculo — nunca um preço negativo ou infinito é retornado."
      : "";

  res.status(status).json({
    erro: error?.message ?? "Erro interno.",
    tipo: error?.name ?? "Error",
    detalheAdicional: detalheAdicional || undefined,
  });
}
