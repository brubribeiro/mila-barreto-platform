import type { Role } from '../../types';

export const ROLE_COLORS = ['#15998B', '#5BA8DE', '#9B7BD4', '#E0915B', '#D46B8A'] as const;

/** Cor do grupo; grupos antigos sem cor recebem uma da paleta pela posição na lista. */
export function roleColor(role: Pick<Role, 'color'>, index: number): string {
  return role.color ?? ROLE_COLORS[index % ROLE_COLORS.length];
}
