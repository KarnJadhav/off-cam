export async function getPremiumInvite() {
  return process.env.TELEGRAM_PREMIUM_GROUP_LINK || null;
}
