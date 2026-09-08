import { createCrudRouter } from "./crud.js";
import { insumoRepository } from "../repositories/store.js";
import { insumoSchema } from "./schemas.js";

export const insumosRouter = createCrudRouter(insumoRepository, insumoSchema);
