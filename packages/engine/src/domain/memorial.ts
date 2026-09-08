/**
 * Cada linha do memorial de cálculo registra uma etapa do resultado,
 * apontando a fórmula usada e — quando aplicável — a regra fiscal e a
 * fonte legal aplicada. É o que permite ao usuário e ao contador conferir
 * o número, não um detalhe opcional.
 */
export interface LinhaMemorial {
  ordem: number;
  descricao: string;
  formula?: string;
  valor?: string;
  regraAplicada?: string;
  fonte?: string;
}

export class MemorialCalculo {
  private linhas: LinhaMemorial[] = [];
  private proximaOrdem = 1;

  registrar(linha: Omit<LinhaMemorial, "ordem">): void {
    this.linhas.push({ ordem: this.proximaOrdem++, ...linha });
  }

  toArray(): LinhaMemorial[] {
    return [...this.linhas];
  }
}
