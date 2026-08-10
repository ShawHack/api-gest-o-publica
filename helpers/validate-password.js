// helpers/validate-password.js
module.exports = function validatePassword(password) {
  // mínimo 8 caracteres
  const lengthOK = /.{6,}/.test(password);
  // pelo menos uma letra minúscula
  const lowerOK = /[a-z]/.test(password);
  // pelo menos uma letra maiúscula
  const upperOK = /[A-Z]/.test(password);
  // pelo menos um dígito
  const numberOK = /\d/.test(password);
  // pelo menos um caractere especial
  const specialOK = /[@$!%*?&.,;:#+\-]/.test(password);

  return lengthOK && lowerOK && upperOK && numberOK && specialOK;
};
