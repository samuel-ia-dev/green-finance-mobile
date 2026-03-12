# ADR 003: Recurring Expenses

## Status

Aceito.

## Decisão

Modelar recorrência na própria coleção `transactions`, usando:

- transação raiz recorrente
- ocorrências futuras com `parentRecurringId`

## Motivo

- simplifica leitura do histórico
- o dashboard soma as ocorrências reais do mês
- evita uma coleção paralela só para renderização

## Consequências

- é preciso evitar duplicação por data
- a geração futura deve ser idempotente
- uma evolução natural é mover essa geração para backend/Cloud Functions
