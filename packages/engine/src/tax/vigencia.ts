export interface RegraVigente {
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  fonte: string;
}

export function estaVigente(regra: RegraVigente, dataReferencia: Date): boolean {
  const iniciou = regra.vigenciaInicio.getTime() <= dataReferencia.getTime();
  const naoTerminou = regra.vigenciaFim === null || regra.vigenciaFim.getTime() >= dataReferencia.getTime();
  return iniciou && naoTerminou;
}

export function encontrarVigente<T extends RegraVigente>(regras: T[], dataReferencia: Date): T[] {
  return regras.filter((r) => estaVigente(r, dataReferencia));
}
