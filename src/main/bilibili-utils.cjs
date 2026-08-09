function parseCookies(headers) {
  const result = {};
  for (const row of headers || []) {
    const pair = row.split(';', 1)[0];
    const at = pair.indexOf('=');
    if (at > 0) result[pair.slice(0, at)] = pair.slice(at + 1);
  }
  return result;
}

function normalizeGift(raw, config = {}) {
  const cmd = String(raw.cmd || '').split(':')[0];
  const d = raw.data || {};
  if (cmd === 'SEND_GIFT') {
    const blind = d.blind_gift || d.blindGift || null;
    const count = Number(d.num || 1);
    const unitPrice = blind && !config.blindboxCalcOriginal ? Number(blind.original_gift_price || d.price || 0) : Number(d.price || 0);
    return { type: blind ? 'blindbox' : 'gift', sender: d.uname || d.user_info?.uname || '观众', face: d.face || d.user_info?.face || '', gift: blind?.gift_name || d.giftName || '礼物', blindboxName: d.giftName || '盲盒', count, price: unitPrice * count / 1000, coinType: d.coin_type || d.coinType || 'gold' };
  }
  if (cmd === 'GUARD_BUY') return { type: 'guard', sender: d.username || d.uname || '观众', face: d.face || '', gift: d.gift_name || ['总督', '提督', '舰长'][Number(d.guard_level || 3) - 1] || '大航海', count: Number(d.num || 1), price: Number(d.price || 0) * Number(d.num || 1) / 1000 };
  if (cmd === 'SUPER_CHAT_MESSAGE') return { type: 'sc', sender: d.user_info?.uname || d.uname || '观众', face: d.user_info?.face || '', gift: '醒目留言', count: 1, price: Number(d.price || 0), content: d.message || '' };
  return null;
}

module.exports = { parseCookies, normalizeGift };
