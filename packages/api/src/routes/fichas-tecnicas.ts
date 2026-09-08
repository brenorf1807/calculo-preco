import { createCrudRouter } from "./crud.js";
import { fichaTecnicaRepository } from "../repositories/store.js";
import { fichaTecnicaSchema } from "./schemas.js";

export const fichasTecnicasRouter = createCrudRouter(fichaTecnicaRepository, fichaTecnicaSchema);
