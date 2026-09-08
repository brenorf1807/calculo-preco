import { createCrudRouter } from "./crud.js";
import { despesaFixaRepository } from "../repositories/store.js";
import { despesaFixaSchema } from "./schemas.js";

export const custosFixosRouter = createCrudRouter(despesaFixaRepository, despesaFixaSchema);
