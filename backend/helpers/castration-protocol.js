const SystemSetting = require('../models/SystemSetting')

function seqKey(year) {
  return `castration_protocol_seq_${year}`
}

async function nextCastrationProtocol(date = new Date()) {
  const year = date.getFullYear()
  const setting = await SystemSetting.findOneAndUpdate(
    { key: seqKey(year) },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  const seq = setting.value || 1
  if (setting.value === undefined) {
    await SystemSetting.updateOne({ key: seqKey(year) }, { value: seq })
  }
  return `CAST-${year}-${String(seq).padStart(6, '0')}`
}

module.exports = { nextCastrationProtocol, seqKey }
