import express from "express";
import cors from "cors";
import { insumosRouter } from "./routes/insumos.js";
import { fichasTecnicasRouter } from "./routes/fichas-tecnicas.js";
import { custosFixosRouter } from "./routes/custos-fixos.js";
import { canaisVendaRouter } from "./routes/canais-venda.js";
import { empresaRouter } from "./routes/empresa.js";
import { calculoRouter } from "./routes/calculo.js";
import { errorHandler } from "./error-handler.js";
import { seedDemoData } from "./seed.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/insumos", insumosRouter);
app.use("/api/fichas-tecnicas", fichasTecnicasRouter);
app.use("/api/custos-fixos", custosFixosRouter);
app.use("/api/canais-venda", canaisVendaRouter);
app.use("/api/empresa", empresaRouter);
app.use("/api/calculo", calculoRouter);

app.use(errorHandler);

async function start(): Promise<void> {
  await seedDemoData();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API de precificação rodando em http://localhost:${PORT}`);
  });
}

start();
