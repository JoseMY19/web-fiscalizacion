/** Si el usuario pidió reducir animaciones en su sistema operativo. */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
