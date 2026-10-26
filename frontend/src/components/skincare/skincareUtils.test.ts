import { describe, it, expect } from 'vitest';

import { canAdvance, emptySkinAnswers, generateRoutine, toggleCondition } from './skincareUtils';
import type { SkincareProduct, SkincareRule } from '../../types';

const product = (id: string, over: Partial<SkincareProduct>): SkincareProduct => ({
  id,
  name: id,
  brand: null,
  activeIngredient: null,
  moments: ['manha'],
  step: 'limpeza',
  tags: [],
  howTo: null,
  note: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const rule = (over: Partial<SkincareRule>): SkincareRule => ({
  id: Math.random().toString(),
  field: 'pele',
  value: 'sensivel',
  productIds: [],
  avoidTags: [],
  note: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('generateRoutine', () => {
  const products = [
    product('limpeza', { moments: ['manha', 'noite'], step: 'limpeza' }),
    product('retinal', { moments: ['noite'], step: 'tratamento', tags: ['retinoide'] }),
    product('vitc', { moments: ['manha'], step: 'tratamento' }),
    product('olhos-manha', { moments: ['manha'], step: 'olhos' }),
  ];

  it('soma as regras que batem e coloca cada produto nos momentos do cadastro', () => {
    const answers = { ...emptySkinAnswers(), pele: 'sensivel', afec: ['melasma'], idade: '35' };
    const rules = [
      rule({ productIds: ['limpeza'], note: 'Um ativo por vez.' }),
      rule({ field: 'afeccao', value: 'melasma', productIds: ['vitc'] }),
      rule({ field: 'idade', value: '55', productIds: ['retinal'] }),
    ];
    const { items, guidelines, avoided } = generateRoutine(answers, products, rules);
    expect(items.map((i) => `${i.moment}.${i.productId}`)).toEqual(['manha.limpeza', 'noite.limpeza', 'manha.vitc']);
    expect(guidelines).toEqual([{ text: 'Um ativo por vez.', source: 'Pele sensível' }]);
    expect(avoided).toEqual([]);
  });

  it('restrição remove o produto mesmo que outra regra o inclua', () => {
    const answers = { ...emptySkinAnswers(), pele: 'sensivel', idade: '35' };
    const rules = [
      rule({ avoidTags: ['retinoide'] }),
      rule({ field: 'idade', value: '35', productIds: ['retinal'] }),
    ];
    const { items, avoided } = generateRoutine(answers, products, rules);
    expect(items).toEqual([]);
    expect(avoided).toEqual([{ productId: 'retinal', name: 'retinal', reason: 'Retinoides · Pele sensível' }]);
  });

  it('ignora etapa que não existe no momento (olhos só à noite)', () => {
    const answers = { ...emptySkinAnswers(), pele: 'sensivel' };
    const { items } = generateRoutine(answers, products, [rule({ productIds: ['olhos-manha'] })]);
    expect(items).toEqual([]);
  });
});

describe('assistente', () => {
  it('"Não" é exclusivo nas afecções', () => {
    expect(toggleCondition(['melasma'], 'nao')).toEqual(['nao']);
    expect(toggleCondition(['nao'], 'acne')).toEqual(['acne']);
    expect(toggleCondition(['acne', 'melasma'], 'acne')).toEqual(['melasma']);
  });

  it('exige o texto de "Outra" e o tipo de olheira', () => {
    const a = { ...emptySkinAnswers(), afec: ['outra'], olheira: 'sim' as const };
    expect(canAdvance(2, a, true, '2026-10-16')).toBe(false);
    expect(canAdvance(2, { ...a, afecOutra: 'dermatite' }, true, '2026-10-16')).toBe(true);
    expect(canAdvance(3, a, true, '2026-10-16')).toBe(false);
    expect(canAdvance(0, a, false, '2026-10-16')).toBe(false);
  });
});
