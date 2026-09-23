# Dia da Feijoada — Joias de Cristo

Aplicação de reservas para o Dia da Feijoada (26/10). Frontend em React + Vite,
dados gravados em uma planilha Google Sheets através de um backend em Google
Apps Script. Não usa Supabase nem nenhum outro banco de dados — depois de
publicado, o app roda de forma totalmente independente do Claude, hospedado
no GitHub Pages, Vercel, Netlify ou qualquer host de site estático.

## Como tudo se conecta

```
Navegador do cliente  →  React (Vite, estático)  →  fetch()  →  Google Apps Script (Web App)  →  Google Sheets
```

- O frontend nunca acessa a planilha diretamente e nunca guarda credencial nenhuma.
- O Apps Script é publicado como "Web App" e vira uma URL pública (`.../exec`).
- Essa URL é a única informação sensível de configuração, e mesmo ela só
  permite fazer o que o código do `Code.gs` permite (criar pedido, logar como
  admin, listar pedidos com token válido, mudar status com token válido).
- A senha do admin e o segredo de sessão ficam guardados dentro do próprio
  Apps Script (Propriedades do Script), nunca no frontend.

---

## Passo 1 — Configurar o Google Apps Script

1. Abra a planilha existente:
   `https://docs.google.com/spreadsheets/d/1rqi-byQV34vU3kGzUjC2s78agYKygZexqXX8ToeoRKs/edit`
2. No menu, vá em **Extensões → Apps Script**.
3. Apague o conteúdo do arquivo `Código.gs` (ou `Code.gs`) que abrir e cole o
   conteúdo do arquivo [`apps-script/Code.gs`](./apps-script/Code.gs) deste
   repositório.
4. No menu lateral do editor, clique no ícone de engrenagem (**Configurações
   do projeto**) e marque **"Mostrar arquivo de manifesto 'appsscript.json'
   no editor"**. Abra o `appsscript.json` criado e substitua o conteúdo pelo
   arquivo [`apps-script/appsscript.json`](./apps-script/appsscript.json)
   deste repositório.
5. Ainda em **Configurações do projeto**, role até **Propriedades do
   script** e adicione:
   | Propriedade | Valor |
   | --- | --- |
   | `ADMIN_PASSWORD` | a senha que você vai usar para entrar em `/admin` |
   | `TOKEN_SECRET` | uma string aleatória longa (ex: gere em https://1password.com/password-generator) |

   `SHEET_ID` é opcional: se você não criar essa propriedade, o script usa a
   planilha informada no briefing por padrão. Só crie essa propriedade se
   quiser apontar para outra planilha.

6. Clique em **Implantar → Nova implantação**.
   - Tipo: **Aplicativo da web**.
   - Executar como: **Eu (seu e-mail)**.
   - Quem pode acessar: **Qualquer pessoa**.
7. Autorize as permissões pedidas (é a sua própria conta acessando sua
   própria planilha).
8. Copie a **URL do aplicativo da web** gerada. Ela termina em `/exec`. É
   essa URL que vai para a variável `VITE_APPS_SCRIPT_URL` no passo 2.

> Sempre que você editar o `Code.gs`, é preciso ir em **Implantar → Gerenciar
> implantações → editar (ícone de lápis) → Nova versão → Implantar** para a
> mudança valer na URL publicada. Editar o código sem publicar uma nova
> versão não atualiza o comportamento do Web App.

A primeira reserva feita já cria automaticamente, na planilha, a aba
`Pedidos` com o cabeçalho certo (se ainda não existir) e a aba `Idempotency`,
usada internamente para nunca gravar o mesmo pedido duas vezes.

### Colunas da aba "Pedidos"

Nº Pedido · Data/Hora · Nome · WhatsApp · Feijoada P · Feijoada G · Suco
Maracujá · Suco Laranja ·Suco Abacaxi · Suco Goiaba · Total · Pagamento · Troco ·
Delivery/Retirada · Horário · Endereço · Referência · Status ·
IdempotencyKey (coluna técnica, pode ocultar na planilha)

---

## Passo 2 — Configurar o frontend

```bash
npm install
cp .env.example .env
```

Edite o `.env`:

```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID_DE_DEPLOY/exec
VITE_WHATSAPP_NUMERO=5511954951978
```

Rodar localmente:

```bash
npm run dev
```

Acesse `http://localhost:5173` para o fluxo de pedido e
`http://localhost:5173/admin` para o painel administrativo.

---

## Passo 3 — Publicar no GitHub

```bash
git init
git add .
git commit -m "Dia da Feijoada — app de reservas"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/dia-da-feijoada.git
git push -u origin main
```

O arquivo `.env` está no `.gitignore` e não sobe para o GitHub — cada
ambiente (local, Vercel, etc.) define suas próprias variáveis.

---

## Passo 4 — Deploy (Vercel, recomendado)

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**.
3. Em **Environment Variables**, adicione:
   - `VITE_APPS_SCRIPT_URL` → a URL do passo 1
   - `VITE_WHATSAPP_NUMERO` → o número de WhatsApp do evento
4. Deploy. Pronto, o site fica no ar e não depende mais desta conversa nem
   do Claude para funcionar.

Também funciona em Netlify ou GitHub Pages (nesse caso, configure as
variáveis de ambiente como "build-time env vars" na plataforma escolhida,
já que o Vite as embute no build estático).

---

## Fluxo do cliente

1. Escolhe quantidades de Feijoada P, Feijoada G e sucos (maracujá, laranja, abacaxi,
   goiaba).
2. Preenche nome, WhatsApp, retirada ou delivery, horário, forma de
   pagamento (e troco, se for dinheiro) e endereço (se for delivery).
3. Revê o pedido inteiro antes de confirmar.
4. Ao confirmar, o app gera uma **idempotency key** única para aquela
   tentativa de envio. O botão de confirmar fica desabilitado durante o
   envio, e mesmo que a rede falhe e o app tente de novo automaticamente ou
   o cliente clique de novo, a mesma key é reenviada — o backend reconhece a
   key repetida e devolve o número do pedido já criado, sem duplicar a linha
   na planilha.
5. Se o servidor confirmar o gravamento, aparece a tela de sucesso com o
   número do pedido (`FEI-0001`, `FEI-0002`, ...) e um botão para abrir o
   WhatsApp com uma mensagem pronta.
6. Se o servidor não confirmar (erro de rede, Apps Script fora do ar, etc.),
   o app **nunca mostra a tela de sucesso** — mostra um aviso de erro e
   deixa o cliente tentar de novo.

## Painel administrativo (`/admin`)

- Login por senha (definida em `ADMIN_PASSWORD` no Apps Script). A sessão
  fica salva no navegador (`sessionStorage`) por até 6 horas.
- Dashboard com total de pedidos, quantidade de P, G, sucos por sabor,
  faturamento, delivery e retirada — tudo calculado a partir dos pedidos
  reais da planilha, atualizado a cada 20 segundos.
- Tabela com todos os pedidos, busca por nome/número/WhatsApp, filtro por
  status e por tipo de entrega, modal de detalhes, alteração de status
  (Novo, Confirmado, Em preparo, Pronto, Entregue, Retirado, Cancelado) e
  exportação para CSV (respeitando os filtros aplicados na tela).

## Visão de produção (`/producao`)

Atalho dentro da área logada do admin com os totais que a cozinha precisa
saber de relance: quantidade de P, G, cada sabor de suco, total de pedidos
e faturamento. Atualiza sozinho a cada 15 segundos.

---

## Por que isso aguenta várias pessoas pedindo ao mesmo tempo

- Toda escrita na planilha (criar pedido, atualizar status) passa por
  `LockService.getScriptLock()` no Apps Script, que serializa as operações:
  mesmo que dois pedidos cheguem no mesmo instante, um espera o outro
  terminar antes de pegar o próximo número, então nunca dois pedidos saem
  com o mesmo `FEI-000X`.
- O número do pedido vem de um contador persistido em
  `PropertiesService` (sobrevive a reinícios do script), não de `Date.now()`
  nem de contagem de linhas.
- A `idempotencyKey` gerada no frontend, gravada numa aba própria
  (`Idempotency`), garante que retry de rede ou duplo clique nunca crie uma
  segunda linha para o mesmo pedido.
- Nenhum pedido fica só em memória do navegador: a tela de sucesso só
  aparece depois que o Apps Script confirma que a linha foi gravada na
  planilha.

## Estrutura de pastas

```
├── apps-script/
│   ├── Code.gs           # backend completo (cole no editor do Apps Script)
│   └── appsscript.json   # manifesto do projeto Apps Script
├── src/
│   ├── components/       # QuantityStepper, StickyCartBar, StatusBadge, modal de detalhes
│   ├── context/          # carrinho, autenticação do admin, toasts
│   ├── lib/               # api.js (fetch), products.js, orders.js (CSV/summary)
│   ├── pages/             # OrderFlow, AdminLogin, AdminDashboard, Producao
│   └── styles/global.css # identidade visual (marrom, laranja, amarelo, creme)
├── .env.example
└── README.md
```

## Possíveis melhorias futuras (fora do escopo deste MVP)

- Envio automático de mensagem de confirmação por WhatsApp via API oficial
  (hoje o botão abre uma conversa manual, para não depender de custos ou
  credenciais adicionais).
- Autenticação de admin mais robusta (hoje é uma senha única compartilhada,
  suficiente para o porte de um evento pontual).
