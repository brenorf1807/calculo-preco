import { createCrudRouter } from "./crud.js";
import { canalVendaRepository } from "../repositories/store.js";
import { canalVendaSchema } from "./schemas.js";

export const canaisVendaRouter = createCrudRouter(canalVendaRepository, canalVendaSchema);
