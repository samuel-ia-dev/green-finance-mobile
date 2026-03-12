# Green Finance Mobile

Aplicativo mobile-first de controle financeiro pessoal com Expo, TypeScript, Firebase, React Navigation, Zustand e AsyncStorage.

## Instalação

```bash
npm install
```

## Configuração do Firebase

1. Copie `.env.example` para `.env`.
2. Preencha:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Sem essas variáveis, o app abre em modo demo local com dados persistidos em `AsyncStorage`.
Quando o Firebase está configurado, o fluxo real de Auth + Firestore é usado automaticamente.

## Execução

```bash
npx expo start
```

Atalhos úteis:

```bash
npm run web
npm run android
npm run ios
```

## Testes

Fluxo TDD executado:

1. testes criados antes da implementação
2. falha inicial validada com `module not found`
3. implementação mínima até a suíte passar
4. refino de tipagem, lint e cobertura

Comandos:

```bash
npm test
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
```

## Build

```bash
npx expo export
```

## Estrutura

```text
src/
  components/
  screens/
  services/
  hooks/
  context/
  utils/
  navigation/
  theme/
  store/
  types/
```

Documentação adicional:

- `docs/architecture.md`
- `docs/testing.md`
- `docs/security.md`
- `docs/scaling.md`
- `docs/adr/`

## Recursos principais

- autenticação com email e senha via Firebase Auth
- dashboard premium com saldo, receitas, despesas, recorrências e insights
- listeners em tempo real com Firestore
- cache local com AsyncStorage e hidratação offline básica
- histórico com filtros e ações de edição/remoção local
- metas financeiras com progresso visual
- exportação CSV/PDF via Expo FileSystem, Print e Sharing
- tema claro/escuro

## Observações

- A referência visual anexada não estava acessível no workspace. O design segue direção fintech premium com hero gradient, cards arredondados, tab central destacada e hierarquia forte.
- As regras do Firestore estão em `firestore.rules`.
- O modo demo local existe para desenvolvimento e visualização rápida. Em produção, configure o Firebase para autenticação real e sincronização multi-dispositivo.
