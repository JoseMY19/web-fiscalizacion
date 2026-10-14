/**
 * Fórmula única de cálculo del monto pasible de multa/deuda, compartida
 * entre backend (CalcularMontoPasibleMultaUseCase) y apps/web-campo
 * (cálculo local offline con uitCache) — nunca dos implementaciones de la
 * misma cuenta. Solo aplica cuando baseCalculo = UIT_FIJO; para
 * VALOR_OBRA/POR_VOLUMEN no hay fórmula, se decide en oficina (SP5).
 */
export function calcularMontoPasibleMulta(porcentajeUit: number, uitSoles: number): number {
  return (porcentajeUit / 100) * uitSoles;
}
