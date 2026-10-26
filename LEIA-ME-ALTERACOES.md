# DM Aplicação Móvel — alterações

## Passo obrigatório no Supabase

Antes de gravar encomendas, abra o **SQL Editor** do projeto Supabase e execute todo o conteúdo de `supabase-orders.sql`.

A aplicação grava na tabela plural `orders`. O script cria essa tabela, os índices e as políticas de acesso para utilizadores autenticados.

## Grupos de cliente e associados

As listas iniciais já estão incluídas. Execute `supabase-client-options.sql` no SQL Editor para criar a tabela partilhada.

Depois disso, o utilizador `comercial@domingos-morgado.pt` pode abrir **Administração** e acrescentar novos grupos de cliente ou associados. Os restantes utilizadores podem consultar e utilizar os valores, mas não os podem alterar.

## Link público para o cliente e edição

Antes de usar **Criar link para o cliente**, execute no SQL Editor todo o conteúdo de `supabase-client-links-and-editing.sql`.

- Em **Clientes**, qualquer utilizador autenticado pode criar um link válido por 7 dias e utilizável uma única vez.
- O cliente abre `ficha-cliente.html`, preenche a ficha e, ao enviar, é criado um registo em `crm_clients`.
- O link fica inutilizado apenas depois de a ficha ser gravada com sucesso.
- Qualquer utilizador autenticado pode editar fichas do CRM e encomendas. Os clientes importados continuam apenas para consulta, porque pertencem a uma origem externa.
- A chave administrativa do Supabase não é utilizada no navegador; a gravação pública passa apenas pelas funções limitadas incluídas no SQL.

## PDF

- A ficha guardada pode ser aberta na lista de clientes e exportada em **Guardar PDF**, em A4 vertical e ajustada a uma página.
- No histórico, tanto as fichas de cliente como as encomendas apresentam **Visualizar / guardar PDF**.
- Se o navegador bloquear a janela, permita pop-ups para o endereço da aplicação.

O identificador técnico interno da encomenda não é apresentado no PDF. Na criação da encomenda, o botão **Ampliar encomenda** esconde temporariamente o menu lateral e aumenta a área da tabela.
