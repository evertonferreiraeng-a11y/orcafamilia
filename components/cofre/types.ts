import type { Cofre } from '@/types/database';

export type CofreSeguro = Omit<Cofre, 'senha_hash'> & { protegido: boolean };
