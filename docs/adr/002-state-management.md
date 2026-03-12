# ADR 002: State Management

## Status

Aceito.

## Decisão

Usar Zustand como store global do domínio financeiro.

## Motivo

- API enxuta
- baixa fricção com TypeScript
- simples para recalcular dashboard e sincronizar cache

## Consequências

- lógica derivada precisa ser mantida centralizada para evitar divergência
- listeners externos precisam hidratar a store de forma disciplinada
