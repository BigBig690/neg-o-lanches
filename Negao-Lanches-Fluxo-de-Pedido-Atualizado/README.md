# Negão Lanches — versão estática com fluxo de compra

Versão básica do site, sem banco de dados, sem login, sem painel administrativo e sem API. O cliente escolhe um produto, personaliza os adicionais, revisa o carrinho e envia o resumo do pedido pelo WhatsApp.

## Experiência visual

O início apresenta a marca, uma chamada geral e o cardápio completo. Não há uma vitrine de “especial da casa”; todos os produtos aparecem de forma regular no catálogo e podem ser selecionados conforme a disponibilidade cadastrada.

## Páginas

- `index.html`: início e cardápio completo (110 produtos).
- `pedido.html`: detalhes do produto, quantidade e adicionais.
- `carrinho.html`: revisão do pedido, ajuste de quantidades e remoção de itens.
- `finalizar.html`: dados do cliente e envio do resumo pelo WhatsApp.
- `css/styles.css`: identidade visual responsiva.
- `js/app.js`: busca, filtros, personalização, carrinho e conclusão.
- `data/catalog.json`: catálogo local, sem conexão a banco de dados.
- `assets/images/`: imagens e logos da marca.

O catálogo inclui os produtos disponíveis no cardápio local. Confira preços, composição e disponibilidade com a loja antes de divulgar.

## Testar localmente no Windows

Como o navegador bloqueia algumas leituras de arquivo local, abra um terminal na pasta extraída do projeto e execute:

```powershell
python -m http.server 8000
```

Depois visite `http://localhost:8000`.

## Publicar na Vercel (sem DB / Hobby)

1. Crie um repositório novo no GitHub, por exemplo `negao-lanches-basico`.
2. Extraia o ZIP e envie **o conteúdo da pasta** (não o arquivo ZIP fechado) para a raiz do repositório. A raiz deve conter `index.html`, `pedido.html`, `carrinho.html`, `finalizar.html`, `css/`, `js/`, `data/` e `assets/`.
3. Na Vercel, escolha **Add New → Project** e importe esse repositório.
4. Deixe **Root Directory** como raiz (`./` ou vazio, conforme a interface). Não selecione uma subpasta.
5. Como é HTML/CSS/JS estático, não é necessário banco, variáveis de ambiente, comandos de build ou instalação de dependências. O framework pode ficar como **Other** se a Vercel pedir.
6. Clique em Deploy. Ao terminar com status `Ready`, teste a página inicial, a página de produto, o carrinho e a finalização.

## Importante

- O número de WhatsApp está configurado em `js/app.js` como `5514996135661`. Altere `WHATSAPP_NUMBER` para o número oficial da loja (país + DDD + número, só dígitos) antes de divulgar.
- O checkout abre uma mensagem preenchida no WhatsApp; o cliente ainda precisa tocar em **Enviar** no WhatsApp. O site não processa pagamento e não salva pedidos num servidor.
- Os valores de entrega são confirmados diretamente pela loja e não estão incluídos no subtotal.
- O catálogo é local. Para atualizar nome, descrição, preço ou disponibilidade, edite `data/catalog.json`.
