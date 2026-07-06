export function requirePremium(req, res, next) {
  const hasActivePremium = req.user?.isPremium && (!req.user.subscriptionExpiry || req.user.subscriptionExpiry > new Date());
  if (!hasActivePremium) {
    return res.status(402).json({ message: 'Premium subscription required' });
  }
  next();
}
