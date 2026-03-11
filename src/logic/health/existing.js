import { formatFromDate, getMonthKey, isFirstDayOfMonth, isLastDayOfMonth } from '../utils';

// 건강보험 공제 계산 로직
export const calculateHealthInsuranceDeduction = (groupedDates, workYear, workMonth, companyId) => {
  console.log(`%c건강보험 건설사${companyId} 공제 대상 체크 시작`, 'color: #ff0000');

  const twoMonthsAgo = groupedDates[getMonthKey(workYear, workMonth, -2)] || [];
  const oneMonthAgo = groupedDates[getMonthKey(workYear, workMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];

  const sortedDates = {
    twoMonthsAgo: twoMonthsAgo.sort(),
    oneMonthAgo: oneMonthAgo.sort(),
    currentMonth: currentMonth.sort()
  };

  let deductibles8 = [];
  let deductiblesOver = [];

  if (sortedDates.oneMonthAgo.length < 1) {
    console.log('전월 출역이 없는 경우');
    deductibles8.push(sortedDates.currentMonth[7]);
    deductiblesOver.push(...sortedDates.currentMonth.slice(8));
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

  console.log('전월 출역 있는 경우');

  if (sortedDates.twoMonthsAgo.length >= 1) {
    console.log('전전월 출역이 있는 경우');
    deductibles8.push(sortedDates.currentMonth[7]);
    deductiblesOver.push(...sortedDates.currentMonth.slice(8));
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

  console.log('전전월 출역이 없는 경우');

  if (isFirstDayOfMonth(sortedDates.oneMonthAgo[0], workYear, parseInt(workMonth) - 1)) {
    console.log('전월 초일 출역한 경우');
    deductibles8.push(sortedDates.currentMonth[7]);
    deductiblesOver.push(...sortedDates.currentMonth.slice(8));
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

  console.log('전월 초일 출역 안한 경우');

  const firstDateOfOneMonthAgo = oneMonthAgo[0];
  const isSpecialCase = firstDateOfOneMonthAgo.endsWith('-01-30') || firstDateOfOneMonthAgo.endsWith('-01-31');

  const merged = [...oneMonthAgo, ...currentMonth].sort();
  if (isSpecialCase) {
    console.log('전월 첫 출역일이 1월 30일 또는 1월 31일인 경우');
    deductibles8.push(merged[7]);
    deductiblesOver.push(...merged.slice(8));
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

  const firstDate = new Date(oneMonthAgo[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date >= firstDate && date <= lastFromFirstDate;
  });

  if (filtered.length < 8) {
    console.log('전월 첫 출역일 ~ +30일 < 8 인 경우');
    deductibles8.push(currentMonth[7]);
    deductiblesOver.push(...currentMonth.slice(8));
    return {
      eight: deductibles8,
      over: deductiblesOver
    };
  }

  if (merged.length > 0) {
    console.log('전월 + 당월 있는 경우');
    deductibles8.push(merged[7]);
    deductiblesOver.push(...merged.slice(8));
    return {
      eight: deductibles8,
      over: deductiblesOver
    };
  }

  console.log('비공제');
  return {
    eight: deductibles8.filter(Boolean),
    over: deductiblesOver.filter(Boolean)
  };
};

// 건강보험 환급 계산 로직
export const calculateHealthInsuranceRefund = (groupedDates, workYear, targetMonth, deductibles, companyId) => {
  const twoMonthsAgo = groupedDates[getMonthKey(workYear, targetMonth, -2)] || [];
  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || [];
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || [];
  const twoMonthsAfter = groupedDates[getMonthKey(workYear, targetMonth, 2)] || [];

  const healthDeductibles = [...deductibles['eight'], ...deductibles['over']].filter(Boolean);

  const sortedDates = {
    twoMonthsAgo: twoMonthsAgo.sort(),
    oneMonthAgo: oneMonthAgo.sort(),
    currentMonth: currentMonth.sort(),
    oneMonthAfter: oneMonthAfter.sort(),
    twoMonthsAfter: twoMonthsAfter.sort()
  };

  let refunds = [];

  const merged = [...oneMonthAgo, ...currentMonth].sort();
  const firstDate = new Date(sortedDates.oneMonthAgo[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  console.log(`%c건강보험 건설사${companyId} 환급 대상 체크 시작`, 'color: yellow');

  if (oneMonthAgo.length === 0) {
    return refundHandleNoOneMonthAgoWork(sortedDates, currentMonth, oneMonthAfter, twoMonthsAfter, workYear, targetMonth, groupedDates, refunds, healthDeductibles);
  }

  console.log('4개월 전 출역이 있는 경우');

  if (twoMonthsAgo.length > 0) {
    return refundHandleWithTwoMonthsAgoWork(currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds);
  }

  console.log('5개월 전 출역이 없는 경우');

  if (isFirstDayOfMonth(sortedDates.oneMonthAgo[0], workYear, parseInt(targetMonth) - 1)) {
    return refundHandleFirstDayWork(currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds);
  }

  console.log('4개월 전 초일 출역 안한 경우');

  const isSpecial = sortedDates.oneMonthAgo[0].endsWith('-01-30') || oneMonthAgo[0].endsWith('-01-31');
  if (isSpecial) {
    return refundHandleSpecialDateWork(merged, currentMonth, sortedDates, oneMonthAfter, workYear, targetMonth, healthDeductibles, refunds);
  }

  console.log('4개월 전 첫 출역 1/30, 31 일이 아닌 경우');

  if (oneMonthAgo.length >= 8) {
    console.log('4개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  return refundHandleLessThanEightDays(merged, lastFromFirstDate, currentMonth, healthDeductibles, refunds);
};

const refundHandleNoOneMonthAgoWork = (sortedDates, currentMonth, oneMonthAfter, twoMonthsAfter, workYear, targetMonth, groupedDates, refunds, healthDeductibles) => {
  console.log('4개월 전 출역이 없는 경우');

  const firstDayWorked = isFirstDayOfMonth(sortedDates.currentMonth[0], workYear, parseInt(targetMonth));

  if (!firstDayWorked) {
    console.log('3개월 전 초일 출역이 아닌 경우');

    const isSpecial = sortedDates.currentMonth[0]?.endsWith('-01-30') || sortedDates.currentMonth[0]?.endsWith('-01-31');
    if (isSpecial) {
      return refundHandleCurrentMonthSpecialDate(currentMonth, oneMonthAfter, sortedDates, twoMonthsAfter, workYear, targetMonth, refunds);
    }

    console.log('3개월 전 첫 출역이 1월 30일 또는 1월 31일 아닌 경우');
    return refundHandleCurrentMonthRegularDate(currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles);
  }

  console.log('3개월 전 초일 출역한 경우');

  if (currentMonth.length < 8) {
    console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8');
    const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

    if (intersect.length > 0) {
      console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8, 3개월 전 지급단 공제 금액 환급');
      refunds.push(...currentMonth);
      return refunds;
    }

    console.log('환급 비대상');
    return refunds;
  }

  console.log('3개월 전 1일 ~ 3개월 전 말일 출역 >= 8');

  const lastDayWorked = isLastDayOfMonth(sortedDates.currentMonth[currentMonth.length - 1], workYear, targetMonth);

  if (lastDayWorked) {
    console.log('3개월 전 말일 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 말일 출역 X');

  if (oneMonthAfter.length > 0) {
    console.log('2개월 전 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('2개월 전 출역 없는 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

const refundHandleWithTwoMonthsAgoWork = (currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds) => {
  console.log('5개월 전 출역이 있는 경우');

  if (currentMonth.length >= 8) {
    console.log('3개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 출역 8일 미만인 경우');

  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('3개월 전 출역 8일 미만인 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

const refundHandleFirstDayWork = (currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds) => {
  console.log('4개월 전 초일 출역한 경우');

  if (currentMonth.length >= 8) {
    console.log('3개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 출역 8일 미만인 경우');

  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('3개월 전 출역 8일 미만인 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

const refundHandleSpecialDateWork = (merged, currentMonth, sortedDates, oneMonthAfter, workYear, targetMonth, healthDeductibles, refunds) => {
  console.log('4개월 전 첫 출역 1/30, 31 일인 경우');

  if (merged.length < 8) {
    console.log('1/30 or 31 ~ 2월 말일 출역 8일 미만');
    const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

    if (intersect.length > 0) {
      console.log('2월 1일 ~ 말일 공제 Y > 0, 3개월 전 지급단 공제 금액 환급');
      refunds.push(...currentMonth);
      return refunds;
    }

    console.log('환급 비대상');
    return refunds;
  }

  console.log('1/30 or 31 ~ 2월 말일 출역 8일 이상');
  const lastDayWorked = isLastDayOfMonth(sortedDates.currentMonth[currentMonth.length - 1], workYear, targetMonth);

  if (lastDayWorked) {
    console.log('2월 말일 출역한 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('2월 말일 출역 안한 경우');

  if (oneMonthAfter.length > 0) {
    console.log('2개월 전 출역이 있는 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('2개월 전 출역이 없는 경우');
  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('2개월 전 출역이 없는 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

const refundHandleLessThanEightDays = (merged, lastFromFirstDate, currentMonth, healthDeductibles, refunds) => {
  console.log('4개월 전 출역 8일 미만인 경우');

  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date <= lastFromFirstDate;
  });

  if (filtered.length >= 8) {
    console.log('4개월 전 ~ +30일 출역 8일 이상인 경우');
    if (merged.includes(lastFromFirstDate)) {
      console.log('4개월 전 출역일 +30일 출역한 경우');
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      return refunds;
    }

    console.log('4개월 전 출역일 +30일 출역 안한 경우');
    const filteredAfter = merged.filter(item => {
      const date = new Date(item);
      return date > lastFromFirstDate;
    });

    if (filteredAfter.length === 0) {
      const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

      if (intersect.length > 0) {
        console.log('4개월 전 첫 출역 + 31일 ~ 3개월 전 말일 공제값 Y > 0, 3개월 전 지급단 공제 금액 환급');
        refunds.push(...currentMonth);
        return refunds;
      }

      console.log('환급 비대상');
      return refunds;
    }

    console.log('4개월 전 첫 출역일 +31일 ~ 3개월 전 말일 출역 > 0');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('4개월 전 ~ +30일 출역 8일 미만인 경우');

  if (currentMonth.length >= 8) {
    console.log('3개월 전 1일 ~ 3개월 전 말일 출역 >= 8');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8');

  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

const refundHandleCurrentMonthSpecialDate = (currentMonth, oneMonthAfter, sortedDates, twoMonthsAfter, workYear, targetMonth, refunds) => {
  console.log('3개월 전 첫 출역이 1월 30일 또는 1월 31일 인 경우');

  const merged = [...currentMonth, ...oneMonthAfter].sort();

  if (merged.length < 8) {
    console.log('1/30 ~ 2월말 까지 8일 미만 출역, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('1/30 ~ 2월말 까지 8일 이상 출역');
  const lastDayWorked = isLastDayOfMonth(sortedDates.oneMonthAfter[currentMonth.length - 1], workYear, parseInt(targetMonth) + 1);

  if (lastDayWorked) {
    console.log('2월 말일 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('2월 말일 미출역');
  if (twoMonthsAfter.length > 0) {
    console.log('1개월 전 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
  } else {
    console.log('1개월 전 미출역, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
  }
  return refunds;
};

const refundHandleCurrentMonthRegularDate = (currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles) => {
  if (currentMonth.length < 8) {
    console.log('3개월 전 8일 미만 출역한 경우');
    return refundHandleCurrentMonthLessThanEight(currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles);
  }

  console.log('3개월 전 8일 이상 출역한 경우');
  const firstDate = new Date(sortedDates.currentMonth[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  const formattedLastFromFirstDate = formatFromDate(lastFromFirstDate);

  if (oneMonthAfter.includes(formattedLastFromFirstDate)) {
    console.log('3개월 전 첫 출역일 +30일에 출역을 한 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 첫 출역일 +30일에 출역을 안한 경우');
  return refundHandleThirtyDaysAfterCheck(currentMonth, oneMonthAfter, lastFromFirstDate, refunds);
};

const refundHandleThirtyDaysAfterCheck = (currentMonth, oneMonthAfter, lastFromFirstDate, refunds) => {
  const merged = [...currentMonth, ...oneMonthAfter].sort();

  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date > lastFromFirstDate;
  });

  if (filtered.length > 0) {
    console.log('3개월 전 첫 출역일 + 31 ~ 2개월전 말일 출역이 있는 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
  } else {
    console.log('3개월 전 첫 출역일 + 31 ~ 2개월전 말일 출역이 없는 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
  }

  return refunds;
};

const refundHandleCurrentMonthLessThanEight = (currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles) => {
  const merged = [...currentMonth, ...oneMonthAfter].sort();
  const firstDate = new Date(sortedDates.currentMonth[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date <= lastFromFirstDate;
  });

  if (filtered.length >= 8) {
    console.log('3개월전 첫 출역일 ~ +30일에서 8일 이상 출역');
    const formattedLastFromFirstDate = formatFromDate(lastFromFirstDate);

    if (filtered.includes(formattedLastFromFirstDate)) {
      console.log('3개월 전 첫 출역일 +30일에 출역을 한 경우');
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      return refunds;
    }

    console.log('3개월 전 첫 출역일 +30일에 출역을 안한 경우');
    return refundHandleThirtyDaysAfterCheck(currentMonth, oneMonthAfter, lastFromFirstDate, refunds);
  }

  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));
  if (intersect.length > 0) {
    console.log('3개월전 첫 출역일 ~ +30일에서 8일 미만 출역, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};
