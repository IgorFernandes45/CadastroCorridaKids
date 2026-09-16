/* Gera o payload "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central) */
(function (global) {
  function tlv(id, value) {
    return id + String(value.length).padStart(2, '0') + value;
  }

  // Remove acentos e caracteres fora do padrão aceito pelos bancos
  function limpar(texto, max) {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .toUpperCase().trim().slice(0, max);
  }

  // CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF)
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function gerarPix({ chave, nome, cidade, valor, txid }) {
    const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave);
    const id = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

    let payload =
      tlv('00', '01') +
      tlv('26', conta) +
      tlv('52', '0000') +
      tlv('53', '986') +
      (valor ? tlv('54', Number(valor).toFixed(2)) : '') +
      tlv('58', 'BR') +
      tlv('59', limpar(nome, 25)) +
      tlv('60', limpar(cidade, 15)) +
      tlv('62', tlv('05', id)) +
      '6304';

    return payload + crc16(payload);
  }

  global.Pix = { gerarPix, crc16 };
})(window);
