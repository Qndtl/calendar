import { getMonthKey } from '../utils';

const PENSION_INCOME_THRESHOLD = 2200000;

const groupByCompanyId = (array, wage) => {
  const itemsWithWage = array.map(item => ({ ...item, wage }));

  const groupedByCompany = itemsWithWage.reduce((acc, item) => {
    const { companyId } = item;
    if (!acc[companyId]) {
      acc[companyId] = [];
    }
    acc[companyId].push(item);
    return acc;
  }, {});

  return Object.entries(groupedByCompany).map(([companyId, histories]) => {
    const sortedHistories = histories.sort((a, b) => a.workDate.localeCompare(b.workDate));

    let cumulativeWage = 0;
    let overWageDate = null;

    for (const item of sortedHistories) {
      cumulativeWage += item.wage;
      if (cumulativeWage >= PENSION_INCOME_THRESHOLD && !overWageDate) {
        overWageDate = item.workDate;
        break;
      }
    }

    const wageSum = histories.reduce((sum, item) => sum + item.wage, 0);
    const workCount = histories.length;

    return {
      companyId: parseInt(companyId),
      isOverEight: workCount >= 8,
      isOverWage: wageSum >= PENSION_INCOME_THRESHOLD,
      overWageDate,
      wageSum,
      workCount,
      histories: sortedHistories
    };
  });
};

// [공제]220만원 초과한 날짜 조회
const findThresholdDate = (dates, wage) => {
  let totalAmount = 0;
  let targetIndex = null;

  for (let i = 0; i < dates.length; i++) {
    totalAmount += parseInt(wage);
    if (totalAmount >= PENSION_INCOME_THRESHOLD) {
      targetIndex = i;
      break;
    }
  }

  return { targetIndex };
};

const handleEightOrMoreDays = (dates, targetIndex) => {
  if (targetIndex !== null && targetIndex < 7) {
    console.log('8일 이상인데 220만원을 8일 전에 초과한 경우');
    return {
      eight: [dates[targetIndex]],
      over: dates.filter((_, index) => index > targetIndex)
    };
  }

  return {
    eight: [dates[7]],
    over: dates.filter((_, index) => index > 7)
  };
};

const handleLessThanEightDays = (dates, targetIndex) => {
  if (targetIndex === null) {
    return { eight: [], over: [] };
  }

  return {
    eight: [dates[targetIndex]],
    over: dates.filter((_, index) => index > targetIndex)
  };
};

// 국민연금 공제 계산 로직
export const calculatePensionDeduction = (groupedDates, workYear, workMonth, wage) => {
  console.log('%c국민연금 공제 대상 체크 시작', 'color: #ff0000');
  const sortByWorkDate = (a, b) => a.workDate.localeCompare(b.workDate);

  const currentMonthDates = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];
  const sortedDates = currentMonthDates.sort(sortByWorkDate);

  if (sortedDates.length === 0) {
    return { eight: [], over: [] };
  }

  // const { targetIndex } = findThresholdDate(sortedDates, wage);
  const targetIndex = null;

  if (sortedDates.length >= 8) {
    console.log('당월 8일 이상 출역');
    return handleEightOrMoreDays(sortedDates.map(item => item.workDate), targetIndex);
  } else {
    console.log('당월 8일 미만 출역');
    return handleLessThanEightDays(sortedDates.map(item => item.workDate), targetIndex);
  }
};

// 국민연금 환급 계산 로직
export const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  const sortByWorkDate = (a, b) => a.workDate.localeCompare(b.workDate);

  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || [];
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || [];

  const sortedDates = {
    oneMonthAgo: oneMonthAgo.sort(sortByWorkDate),
    currentMonth: currentMonth.sort(sortByWorkDate),
    oneMonthAfter: oneMonthAfter.sort(sortByWorkDate),
  };

  const groupedSortedDates = {
    oneMonthAgo: groupByCompanyId(sortedDates.oneMonthAgo, wage),
    currentMonth: groupByCompanyId(sortedDates.currentMonth, wage),
    oneMonthAfter: groupByCompanyId(sortedDates.oneMonthAfter, wage),
  };

  const refunds = [];
  const deducts = [];
  console.log('%c국민연금 환급 대상 체크 시작', 'color: yellow');

  const allDeducts = [
    ...sortedDates.currentMonth.filter(item => item.workDate <= deductibles.eight),
    ...sortedDates.currentMonth.filter(item => deductibles.over.includes(item.workDate))
  ];

  if (groupedSortedDates.currentMonth.length > 0) {
    console.log(`%c현장 그룹`, 'color: orange', '단위 환급 로직');
    for (const group of groupedSortedDates.currentMonth) {
      console.log(`%ccompanyId: ${group.companyId} 환급/징수 계산`, 'color: pink');
      const filteredOneMonthAgo = groupedSortedDates.oneMonthAgo.find(item => item.companyId === group.companyId) ?? [];
      const filteredCurrentMonth = groupedSortedDates.currentMonth.find(item => item.companyId === group.companyId) ?? [];
      const filteredOneMonthAfter = groupedSortedDates.oneMonthAfter.find(item => item.companyId === group.companyId) ?? [];
      const filteredDeducts = allDeducts.filter(item => item.companyId === group.companyId) ?? [];
      const refundAndDeducts = handleStatePensionRefundAndDeduct(filteredOneMonthAgo, filteredCurrentMonth, filteredOneMonthAfter, filteredDeducts, sortedDates.oneMonthAfter);
      refunds.push(...refundAndDeducts.refunds?.map(item => item.workDate));
      deducts.push(...refundAndDeducts.deducts?.map(item => item.workDate));
    }

    return { refunds, deducts };
  }

  console.log(`%c청구 업체`, 'color: orange', '단위 환급 로직');
  const refundAndDeducts = handleStatePensionRefundAndDeduct(sortedDates.oneMonthAgo, sortedDates.currentMonth, sortedDates.oneMonthAfter, allDeducts, sortedDates.oneMonthAfter);

  return {
    refunds: refundAndDeducts.refunds.map(item => item.workDate),
    deducts: refundAndDeducts.deducts.map(item => item.workDate),
  };
};

const handleStatePensionRefundAndDeduct = (oneMonthAgo, currentMonth, oneMonthAfter, deductibles, totalOneMonthAfter) => {
  const deductibleDates = deductibles.map(item => item.workDate);
  const oneMonthAgoHistories = oneMonthAgo.histories ?? [];
  const currentMonthHistories = currentMonth.histories ?? [];
  const oneMonthAfterHistories = oneMonthAfter.histories ?? [];
  const oneMonthAfterTotalHistories = totalOneMonthAfter.histories ?? [];

  const refunds = [];
  const deducts = [];

  if (oneMonthAgoHistories.length > 0) {
    console.log('4개월 전 출역 이력이 있는 경우');
    if (currentMonthHistories.length >= 8) {
      console.log('3개월 전 8일 이상 출역한 경우');
      console.log('환급 비대상');
      return { refunds, deducts };
    }

    console.log('3개월 전 8일 미만 출역한 경우');
    if (currentMonth.isOverWage) {
      console.log('3개월 전 출역 이력 220만원 이상인 경우');
      deducts.push(...currentMonthHistories.filter(date => !deductibleDates.includes(date.workDate)));
      return { refunds, deducts };
    }

    console.log('3개월 전 출역 이력 220만원 미만인 경우');
    refunds.push(...deductibles);
    console.log('공제 내역 환급');
    return { refunds, deducts };
  }

  console.log('4개월 전 출역 이력이 없는 경우');
  const firstDayOfCurrentMonth = currentMonthHistories[0]?.workDate;

  if (currentMonthHistories.length >= 8) {
    console.log('3개월 전 출역 8일 이상인 경우');
    if (firstDayOfCurrentMonth.endsWith('-01')) {
      console.log('3개월 전 초일 출역한 경우');
      if (oneMonthAfterHistories.length > 0) {
        console.log('2개월 전 출역한 경우');
        console.log('환급 비대상');
        return { refunds, deducts };
      }
      console.log('2개월 전 출역 안한 경우');
      if (oneMonthAfterTotalHistories.length > 0) {
        console.log('2개월 전 청구 업체 기준 출역한 경우');
        console.log('환급 비대상');
        return { refunds, deducts };
      }
      console.log('2개월 전 청구 업체 기준 출역 안한 경우');
      console.log('환급 대상');
      refunds.push(...deductibles);
      return { refunds, deducts };
    }
    console.log('3개월 전 초일 출역 안한 경우');
    if (oneMonthAfterHistories.length >= 8) {
      console.log('2개월 전 8일 이상 출역한 경우');
      console.log('환급 비대상');
      return { refunds, deducts };
    }
    console.log('2개월 전 8일 이상 출역 안한 경우');
    if (oneMonthAfter.isOverWage) {
      console.log('2개월 전 220만원 이상인 경우');
      deducts.push(...currentMonthHistories.filter(date => !deductibleDates.includes(date.workDate)));
      console.log(`%c공제 내역 징수`, 'color: red', deducts);
    }
    console.log('2개월 전 220만원 미만인 경우');
    refunds.push(...deductibles);
    console.log('공제 내역 환급');
    return { refunds, deducts };
  }

  console.log('3개월 전 출역 8일 미만인 경우');
  if (currentMonth.isOverWage) {
    console.log('3개월 전 220만원 이상인 경우');
    if (firstDayOfCurrentMonth.endsWith('-01')) {
      console.log('3개월 전 초일 출역한 경우');
      if (oneMonthAfterHistories.length > 0) {
        console.log('2개월 전 출역한 경우');
        console.log('환급 비대상');
        return { refunds, deducts };
      }
      console.log('2개월 전 출역 안한 경우');
      if (oneMonthAfterTotalHistories.length > 0) {
        console.log('2개월 전 청구 업체 기준 출역한 경우');
        console.log('환급 비대상');
        return { refunds, deducts };
      }
      console.log('2개월 전 청구 업체 기준 출역 안한 경우');
      console.log('환급 대상');
      refunds.push(...deductibles);
      return { refunds, deducts };
    }
    console.log('3개월 전 초일 출역 안한 경우');
    if (oneMonthAfterHistories.length >= 8) {
      console.log('2개월 전 8일 이상 출역한 경우');
      console.log('환급 비대상');
      return { refunds, deducts };
    }
    console.log('2개월 전 8일 이상 출역 안한 경우');
    if (oneMonthAfter.isOverWage) {
      console.log('2개월 전 220만원 이상인 경우');
      deducts.push(...deductibles);
      console.log(`%c공제 내역 징수`, 'color: red', deducts);
    }
    console.log('2개월 전 220만원 미만인 경우');
    refunds.push(...deductibles);
    console.log('공제 내역 환급');
    return { refunds, deducts };
  }

  console.log('3개월 전 220만원 미만인 경우 환급');
  refunds.push(...deductibles);
  console.log('공제 내역 환급');
  return { refunds, deducts };
};
