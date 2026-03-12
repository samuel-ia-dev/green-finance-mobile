# Security

## Regras do Firestore

O arquivo `firestore.rules` restringe leitura e escrita ao `request.auth.uid` correspondente ao `userId` do documento.

## Medidas aplicadas

- rotas autenticadas protegidas em `RootNavigator`
- sessão obrigatória para acesso ao app
- Firebase Auth obrigatório no modo conectado/produção
- modo demo local apenas para desenvolvimento sem credenciais
- regras por usuário em `users`, `settings`, `transactions`, `categories` e `goals`

## Boas práticas operacionais

- nunca gravar segredos reais no repositório
- usar `.env` local e CI secrets
- desabilitar ou esconder o modo demo em builds de produção se o app for distribuído publicamente
- revisar índices e regras junto com novos relatórios/coleções
- monitorar tentativas negadas no console do Firebase
