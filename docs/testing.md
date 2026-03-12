# Testing

## Estratégia

O projeto segue TDD estrito:

1. testes escritos antes da implementação
2. falha inicial validada
3. implementação mínima
4. refatoração
5. atualização de documentação

## Escopo da suíte

- unit tests para `src/utils`
- unit/integration tests para `src/services`
- tests para store Zustand
- component tests para Login, Home, Histórico, Adicionar e Configurações

## Casos cobertos

- autenticação
- listeners do Firestore
- criação, atualização e exclusão de transações
- recorrência
- filtros do histórico
- cálculo do dashboard
- insights automáticos
- exportação CSV/PDF
- hidratação do cache
- fallback local sem Firebase configurado

## Execução

```bash
npm test
npm run test:coverage
```

## Metas de cobertura

- global >= 95%
- `src/services` 100%
- `src/utils` 100%
- regras centrais de recorrência, insights e dashboard 100%
