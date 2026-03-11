import {
  calculatePensionDeduction as existingDeduction,
  calculateStatePensionRefund as existingRefund,
} from './existing';

import {
  calculatePensionDeduction as newDeduction,
  calculateStatePensionRefund as newRefund,
} from './new';

export const getPensionLogic = (logicType) => {
  if (logicType === 'new') {
    return {
      calculateDeduction: newDeduction,
      calculateRefund: newRefund,
    };
  }

  return {
    calculateDeduction: existingDeduction,
    calculateRefund: existingRefund,
  };
};
