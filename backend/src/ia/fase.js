'use strict';
function calcularFaseVida(especie, idadeAnos) {
  const idade = Number(idadeAnos);
  if (isNaN(idade) || idade < 0) return null;
  const limiteIdoso = especie === 'gato' ? 10 : 7;
  if (idade < 1) return 'filhote';
  if (idade >= limiteIdoso) return 'idoso';
  return 'adulto';
}
module.exports = { calcularFaseVida };
