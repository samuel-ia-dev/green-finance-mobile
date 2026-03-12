# Architecture

## Stack

- Expo + React Native + TypeScript
- React Navigation para fluxo autenticado e tabs principais
- Zustand para estado financeiro global
- Firebase Auth para autenticação quando configurado
- Firestore para dados em tempo real quando configurado
- AsyncStorage para cache local

## Modos de execução

- modo Firebase: usa Auth + Firestore reais com listeners em tempo real
- modo demo local: entra com sessão local persistida e dados financeiros salvos em `AsyncStorage`

## Modelagem Firestore

Coleções principais:

- `users/{userId}`
- `settings/{userId}`
- `transactions/{transactionId}`
- `categories/{categoryId}`
- `goals/{goalId}`

Campos de `transactions`:

- `userId`
- `type`
- `amount`
- `categoryId`
- `categoryName`
- `description`
- `date`
- `isRecurring`
- `recurringFrequency`
- `recurringStartDate`
- `recurringEndDate`
- `parentRecurringId`
- `createdAt`
- `updatedAt`

## Recorrência

- a transação raiz recorrente é criada pelo formulário
- ocorrências futuras são geradas com base em `parentRecurringId`
- o hook `useFinanceRealtime` garante cobertura futura e evita duplicação por data já existente
- o card da Home soma apenas as ocorrências recorrentes do mês corrente

## Fluxo de dados

1. Auth provider observa o Firebase Auth ou a sessão local de demonstração.
2. RootNavigator protege as rotas com base no usuário resolvido pelo provider.
3. `useFinanceRealtime` abre listeners de transactions, categories, goals e settings no Firestore ou no fallback local.
4. a store do Zustand hidrata a UI e recalcula o dashboard.
5. AsyncStorage guarda o último snapshot para modo offline básico e para o modo demo.

## Pastas

```text
src/
  components/     componentes reutilizáveis de UI
  screens/        telas de auth e app
  services/       Firebase, exportação e cache
  hooks/          sincronização em tempo real
  context/        auth e tema
  utils/          regras de negócio e formatação
  navigation/     stacks e tabs
  theme/          tokens e themes
  store/          Zustand store
  types/          contratos de domínio
```
