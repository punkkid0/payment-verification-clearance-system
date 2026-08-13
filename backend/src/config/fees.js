// Centralized school fee amounts (Naira)
const FEE_AMOUNTS = {
  indigene: 75600,
  nonIndigene: 81500,
};

function getExpectedFee(isIndigene) {
  return isIndigene ? FEE_AMOUNTS.indigene : FEE_AMOUNTS.nonIndigene;
}

module.exports = {
  FEE_AMOUNTS,
  getExpectedFee,
};