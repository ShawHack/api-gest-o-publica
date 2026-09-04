(function(){
  var isLocal = /^localhost$|^127\.0\.0\.1$|^192\.168\.|^10\./.test(location.hostname) || location.port === '5000';
  var isNginxServed = !location.port || location.port === '80' || location.port === '443' || location.port === '8080';
  window.__API_BASE__ = (isLocal && !isNginxServed) ? '' : '/api';
})();
