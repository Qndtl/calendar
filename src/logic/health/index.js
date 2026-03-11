import {
  calculateHealthInsuranceDeduction as existingDeduction,
  calculateHealthInsuranceRefund as existingRefund,
} from './existing';

import {
  calculateHealthInsuranceDeduction as newDeduction,
  calculateHealthInsuranceRefund as newRefund,
} from './new';

export const getHealthLogic = (logicType) => {
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
