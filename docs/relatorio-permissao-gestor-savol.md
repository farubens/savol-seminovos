# Relatorio - permissao do Gestor Savol no Venda Seu Carro

## Contexto

- Frontend publico: `https://savolseminovos.com.br`
- WordPress/backend: `https://palevioletred-lark-270684.hostingersite.com`
- Fluxo afetado: painel do gestor para criar vendedores, delegar leads e exportar PDF dos leads do Venda Seu Carro.

## Sintoma

Ao clicar em exportar PDF, a URL acessada era:

`/wp-admin/admin-post.php?action=savol_vsc_export_pdf&lead_id=...&_wpnonce=...`

O WordPress retornava:

`Acesso restrito ao Painel Savol.`

## Causa raiz

O erro nao vinha do frontend em `savolseminovos.com.br` e tambem nao vinha do handler de PDF do plugin `savol-veiculos-cpt`.

A mensagem `Acesso restrito ao Painel Savol.` e gerada pelo plugin `savol-painel-comercial`, na regra `restrict_gestor_admin()`.

Esse plugin funciona como um bloqueio de seguranca para o papel `gestor_savol`, impedindo acesso a telas comuns do WordPress. O problema e que ele permitia telas como:

- dashboard do Painel Savol;
- lista de veiculos;
- lista de leads;
- edicao de veiculos/leads;
- upload/media.

Mas ele nao permitia `admin-post.php`, que e justamente o endpoint interno usado pelo WordPress para executar acoes como:

- criar vendedor;
- delegar lead;
- reenviar e-mail;
- exportar PDF.

Resultado: o bloqueio do Painel Comercial rodava antes da acao do plugin de CPT e matava a requisicao com 403.

## Correcao aplicada

No plugin `savol-painel-comercial`, foram liberadas explicitamente apenas as acoes internas do fluxo Venda Seu Carro:

- `savol_vsc_create_seller`
- `savol_vsc_assign_lead`
- `savol_vsc_email_lead`
- `savol_vsc_export_pdf`

Essas acoes continuam protegidas no plugin `savol-veiculos-cpt` por:

- nonce do WordPress;
- checagem de permissao;
- validacao do lead;
- validacao do vendedor.

Ou seja: o Painel Comercial deixa a requisicao passar, mas quem decide se pode ou nao executar continua sendo o plugin dono do lead.

## Sobre os dominios separados

Ter o frontend em `savolseminovos.com.br` e o WordPress em `palevioletred-lark-270684.hostingersite.com` nao e a causa desse erro de permissao.

Esse erro acontece dentro do admin do WordPress, ja no dominio do backend. O dominio separado impacta outros pontos, como origem do lead, URL salva no payload, cookies de sessao se houver iframe ou troca de dominio, e configuracao de endpoint no Next. Para o PDF do gestor, o fator decisivo era a regra de bloqueio do plugin `savol-painel-comercial`.

## Versoes corrigidas

- `savol-painel-comercial`: `0.5.5`
- `savol-veiculos-cpt`: mantem o fluxo de vendedores/leads/PDF no plugin correto.

## Como validar em producao

1. Atualizar o plugin `savol-painel-comercial` para a versao `0.5.5`.
2. Entrar com um usuario que tenha o papel `gestor_savol`.
3. Acessar:
   `/wp-admin/edit.php?post_type=venda_carro_lead&page=savol-venda-seu-carro-vendedores`
4. Delegar um lead a um vendedor.
5. Clicar em exportar PDF.
6. O PDF deve baixar sem cair na tela `Acesso restrito ao Painel Savol.`
