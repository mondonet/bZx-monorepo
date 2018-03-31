import B0xJS from "b0x.js";  // eslint-disable-line
import { getTrackedTokens } from "../../common/trackedTokens";
import { toBigNumber } from "../../common/utils";

export const getOrderHash = order => B0xJS.getLoanOrderHashHex(order);

const checkAllowance = async (b0x, accounts, tokenAddress) => {
  const allowance = await b0x.getAllowance({
    tokenAddress,
    ownerAddress: accounts[0].toLowerCase()
  });
  return allowance.toNumber() !== 0;
};

const checkCoinsApproved = async (
  b0x,
  accounts,
  order,
  collateralTokenAddress
) => {
  const makerRole = order.makerRole === `0` ? `lender` : `trader`;
  if (makerRole === `lender`) {
    // check that user has approved collateralToken and interestToken
    const { interestTokenAddress } = order;
    const a = await checkAllowance(b0x, accounts, interestTokenAddress);
    const b = await checkAllowance(b0x, accounts, collateralTokenAddress);
    return a && b;
  }
  // check that user has approved loanToken
  const { loanTokenAddress } = order;
  const a = await checkAllowance(b0x, accounts, loanTokenAddress);
  return a;
};

export const validateFillOrder = async (
  order,
  fillOrderAmount,
  collateralTokenAddress,
  tokens,
  b0x,
  accounts
) => {
  const makerRole = order.makerRole === `0` ? `lender` : `trader`;
  const trackedTokens = getTrackedTokens(tokens);
  if (makerRole === `lender`) {
    // check that user has tracked collateralToken and interestToken
    const { interestTokenAddress } = order;
    if (
      !trackedTokens.includes(interestTokenAddress) ||
      !trackedTokens.includes(collateralTokenAddress)
    ) {
      alert(
        `Your interest token or collateral token is not tracked, please add it in the balances tab.`
      );
      return false;
    }
  } else {
    // check that user has tracked loanToken
    const { loanTokenAddress } = order;
    if (!trackedTokens.includes(loanTokenAddress)) {
      alert(
        `Your loan token is not tracked, please add it in the balances tab.`
      );
      return false;
    }
  }

  const coinsApproved = await checkCoinsApproved(
    b0x,
    accounts,
    order,
    collateralTokenAddress
  );
  if (!coinsApproved) {
    alert(
      `Some of your coins are not approved, please check the balances tab.`
    );
    return false;
  }
  console.log(`validateFillOrder`);
  console.log(order, fillOrderAmount, collateralTokenAddress);
  return true;
};
export const submitFillOrder = async (
  order,
  fillOrderAmount,
  collateralTokenAddress,
  b0x,
  accounts
) => {
  const txOpts = { from: accounts[0].toLowerCase() };
  const makerIsLender = order.makerRole === `0`;

  console.log(`order`, order);
  console.log(`txOpts`, txOpts);
  console.log(`makerIsLender`, makerIsLender);

  let receipt;
  if (makerIsLender) {
    receipt = await b0x.takeLoanOrderAsTrader(
      order,
      collateralTokenAddress,
      toBigNumber(fillOrderAmount, 1e18),
      txOpts
    );
  } else {
    receipt = await b0x.takeLoanOrderAsLender(order, txOpts);
  }

  console.log(receipt);
  return true;
};
