# DM Aplicação Móvel — alterações

## Passo obrigatório no Supabase

Antes de gravar encomendas, abra o **SQL Editor** do projeto Supabase e execute todo o conteúdo de `supabase-orders.sql`.

A aplicação grava na tabela plural `orders`. O script cria essa tabela, os índices e as políticas de acesso para utilizadores autenticados.

## Grupos de cliente e associados

As listas iniciais já estão incluídas. Execute `supabase-client-options.sql` no SQL Editor para criar a tabela partilhada.

Depois disso, o utilizador `comercial@domingos-morgado.pt` pode abrir **Administração** e acrescentar novos grupos de cliente ou associados. Os restantes utilizadores podem consultar e utilizar os valores, mas não os podem alterar.

## PDF

- A ficha guardada pode ser aberta na lista de clientes e exportada em **Guardar PDF**.
- No histórico, tanto as fichas de cliente como as encomendas apresentam **Visualizar / guardar PDF**.
- Se o navegador bloquear a janela, permita pop-ups para o endereço da aplicação.
