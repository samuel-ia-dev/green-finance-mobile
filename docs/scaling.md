# Scaling

## Próximos passos naturais

- mover geração de recorrência para Cloud Functions para consistência server-side
- criar coleção `summaries` para relatórios pesados por mês
- indexar filtros compostos do histórico no Firestore
- paginar o histórico com cursores
- separar charts em componentes lazy

## Performance

- listeners segmentados por coleção
- cache local para última hidratação
- dashboard calculado na store em vez de repetir lógica na UI
- listas simples e reutilizáveis

## Evolução da modelagem

- `transactions` pode ganhar campo `source` para importações
- `goals` pode ganhar contribuições separadas por evento
- `settings` pode receber alertas, limites e preferências regionais
