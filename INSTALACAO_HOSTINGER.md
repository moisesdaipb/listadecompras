# Guia de Deploy na Hostinger

Este projeto foi preparado para ser hospedado facilmente na Hostinger (ou qualquer hospedagem estática).

## 1. Variáveis de Ambiente

**IMPORTANTE:** Como este é um app React (estático), as variáveis de ambiente são "embutidas" no código durante o comando de build.

1. Verifique se o arquivo `.env` contém as chaves de **PRODUÇÃO** do seu projeto Supabase.
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```
2. Se você alterou o `.env` agora, precisa rodar o comando de build novamente:
   ```bash
   npm run build
   ```

## 2. Fazendo o Upload

1. Após rodar `npm run build`, uma pasta chamada `dist` foi criada na raiz do seu projeto.
2. Acesse o painel da Hostinger -> Gerenciador de Arquivos.
3. Entre na pasta `public_html`.
4. Faça o upload de **todo o conteúdo de DENTRO da pasta `dist`** para dentro da `public_html`.
   - Não suba a pasta `dist` em si, apenas os arquivos que estão dentro dela (`index.html`, pasta `assets`, etc).

## 3. Roteamento

O projeto já foi configurado para usar `HashRouter` (nas URLs você verá um `#`, ex: `seusite.com/#/home`). Isso evita erros de página não encontrada (404) ao recarregar a página em hospedagens compartilhadas simples como a Hostinger, sem necessidade de configurações extras no servidor.

Seu site deve estar pronto para uso!
