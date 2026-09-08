export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: string, item: T): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Implementação em memória do MVP. Quando a integração com Firebase entrar,
 * cada `InMemoryRepository<X>` vira um `FirestoreRepository<X>` que
 * implementa a mesma interface `Repository<X>` apontando para a collection
 * indicada no comentário de cada repositório concreto — nenhuma rota HTTP
 * muda.
 */
export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private readonly items = new Map<string, T>();

  async list(): Promise<T[]> {
    return [...this.items.values()];
  }

  async get(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async create(item: T): Promise<T> {
    if (this.items.has(item.id)) {
      throw new Error(`Já existe um registro com id "${item.id}".`);
    }
    this.items.set(item.id, item);
    return item;
  }

  async update(id: string, item: T): Promise<T | null> {
    if (!this.items.has(id)) return null;
    this.items.set(id, item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
