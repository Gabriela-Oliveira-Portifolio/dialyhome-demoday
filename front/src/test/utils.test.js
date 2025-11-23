import { describe, it, expect } from 'vitest';
import { cn } from '../utils/utils'; // Importa a função a ser testada

describe('cn utility function', () => {

  it('deve combinar strings de classe simples', () => {
    const result = cn('text-red-500', 'bg-blue-200', 'p-4');
    // Deve retornar todas as classes combinadas por 'clsx'
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('deve lidar com valores falsy e ignorá-los', () => {
    const result = cn('class-a', null, undefined, false, 0, '');
    // Deve retornar apenas a classe válida
    expect(result).toBe('class-a');
  });

  it('deve resolver conflitos de Tailwind usando twMerge', () => {
    // Conflito: 'p-4' e 'p-8' (padding) / 'text-red-500' e 'text-green-500' (cor do texto)
    const result = cn('p-4', 'font-bold', 'p-8', 'text-red-500', 'text-green-500');

    // twMerge deve manter a última classe em caso de conflito
    expect(result).toBe('font-bold p-8 text-green-500');
  });

  it('deve lidar com arrays aninhados de classes', () => {
    const isActive = true;
    const result = cn(
      'base-class',
      ['array-class-1', { 'array-class-2': isActive }],
      'final-class'
    );
    // clsx deve resolver os arrays e objetos
    expect(result).toBe('base-class array-class-1 array-class-2 final-class');
  });

  // test desabilitado temporariamente
  it.skip('deve resolver conflitos dentro de múltiplas entradas', () => {
    const result = cn(
      'w-full',
      'flex',
      { 'w-1/2': true, 'p-4': true }, // w-1/2 substitui w-full
      'p-8', // p-8 substitui p-4
      'block'
    );
    // Esperado: w-1/2 (último w-*) e p-8 (último p-*)
    expect(result).toBe('flex block w-1/2 p-8');
  });

  it('deve retornar uma string vazia se nenhuma classe for fornecida', () => {
    const result = cn(null, false, undefined, {}, []);
    expect(result).toBe('');
  });
});