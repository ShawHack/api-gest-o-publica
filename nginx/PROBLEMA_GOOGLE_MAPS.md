# Problema: google is not defined

## Erro
```
Uncaught ReferenceError: google is not defined
    at eval (eval at <anonymous> (markerwithlabel_packed.js:1:1), <anonymous>:1:641)
    at markerwithlabel_packed.js:1:1
```

## Causa
O script `markerwithlabel_packed.js` está tentando usar o objeto `google` (Google Maps API) antes que ele esteja carregado.

## Possíveis Causas

1. **Ordem de carregamento**: O script do Google Maps não está sendo carregado antes do `markerwithlabel_packed.js`
2. **Script bloqueado**: O script do Google Maps está sendo bloqueado (CSP, firewall, etc.)
3. **URL incorreta**: A URL do Google Maps não está sendo carregada corretamente

## Soluções Aplicadas

1. ✅ CSP atualizado para permitir Google Maps
2. ✅ Headers CORS configurados

## Próximos Passos

Este é um problema do **backend/HTML**, não do Nginx. O Nginx está funcionando corretamente como proxy.

### Verificar no Navegador:

1. Abra F12 → Network
2. Recarregue a página
3. Procure por requisições para:
   - `maps.googleapis.com`
   - `googleapis.com`
   - Qualquer script do Google Maps
4. Verifique:
   - Se as requisições estão sendo feitas
   - Se retornam 200 ou algum erro
   - A ordem de carregamento dos scripts

### Possível Solução no Backend:

O backend precisa garantir que o script do Google Maps seja carregado ANTES do `markerwithlabel_packed.js`. Isso pode ser feito:

1. Movendo o script do Google Maps para antes do `markerwithlabel_packed.js` no HTML
2. Usando `async` ou `defer` corretamente
3. Garantindo que o script do Google Maps tenha um callback que só executa quando estiver pronto

## Nota

O Nginx está funcionando corretamente. O problema é na ordem de carregamento dos scripts JavaScript no HTML retornado pelo backend.






