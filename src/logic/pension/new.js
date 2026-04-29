// 신규 국민연금 공제 로직
import { getMonthKey, isFirstDayOfMonth, isLastDayOfMonth } from '../utils';

const sortByDate = (a, b) => a.workDate.localeCompare(b.workDate);

const applyDeduction = (siteCount, billingDates, eightSet, overSet) => {
  if (siteCount === 8) {
    eightSet.add(billingDates[7]);
  } else if (siteCount > 8) {
    eightSet.add(billingDates[7]);
    billingDates.slice(8).forEach(d => overSet.add(d));
  }
  // < 8: 비대상
};

export const calculatePensionDeduction = (groupedDates, workYear, workMonth, wage) => {
  console.log('%c[신규] 국민연금 공제 대상 체크', 'color: #00aaff');

  const allPrevMonth = groupedDates[getMonthKey(workYear, workMonth, -1)] || [];
  const allCurrentMonth = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];

  const billingCurrentDates = [...allCurrentMonth].sort(sortByDate).map(i => i.workDate);

  const companyIds = [...new Set([
    ...allPrevMonth.map(item => item.companyId),
    ...allCurrentMonth.map(item => item.companyId),
  ])];

  const eightSet = new Set();
  const overSet = new Set();
  let needsBillingCheck = false;

  for (const companyId of companyIds) {
    const sitePrevMonth = allPrevMonth.filter(item => item.companyId === companyId);
    const siteCurrentMonth = [...allCurrentMonth.filter(item => item.companyId === companyId)].sort(sortByDate);

    if (sitePrevMonth.length >= 1) {
      console.log(`현장${companyId} 전월 출역 있음 → STEP 3`);
      applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
    } else {
      const workedOnFirst = isFirstDayOfMonth(siteCurrentMonth[0]?.workDate, workYear, parseInt(workMonth));
      if (workedOnFirst) {
        console.log(`현장${companyId} 전월 출역 없음 + 당월 초일 출역 → STEP 3`);
        applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
      } else {
        console.log(`현장${companyId} 전월 출역 없음 + 당월 초일 미출역 → 청구업체 체크`);
        needsBillingCheck = true;
      }
    }
  }

  if (needsBillingCheck) {
    if (allPrevMonth.length >= 1) {
      console.log('청구업체 전월 출역 있음 → STEP 6');
      applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
    } else {
      const billingWorkedOnFirst = isFirstDayOfMonth(billingCurrentDates[0], workYear, parseInt(workMonth));
      if (billingWorkedOnFirst) {
        console.log('청구업체 당월 초일 출역 → STEP 6');
        applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
      } else {
        console.log('청구업체 당월 초일 미출역 → 공제 비대상');
      }
    }
  }

  return {
    eight: [...eightSet],
    over: [...overSet],
  };
};

const PENSION_THRESHOLD = 2200000;

// 신규 국민연금 환급 로직
export const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  console.log('%c[신규] 국민연금 환급 대상 체크 시작', 'color: #00aaff');

  const threeMonthsAgoKey = getMonthKey(workYear, targetMonth, 0);
  const [tmYear, tmMonth] = threeMonthsAgoKey.split('-').map(Number);

  const allFourMonthsAgo = [...(groupedDates[getMonthKey(workYear, targetMonth, -1)] || [])].sort(sortByDate);
  const allThreeMonthsAgo = [...(groupedDates[threeMonthsAgoKey] || [])].sort(sortByDate);
  const allTwoMonthsAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || [];

  const allDeductDates = [...(deductibles.eight || []), ...(deductibles.over || [])];
  const hasDeduction = allDeductDates.length > 0;

  const billingCurrentDates = allThreeMonthsAgo.map(i => i.workDate);
  const billingCurrentCount = billingCurrentDates.length;
  const billingCurrentWage = billingCurrentCount * wage;

  const billingWorkedOnFirst = billingCurrentCount > 0 && isFirstDayOfMonth(billingCurrentDates[0], tmYear, tmMonth);
  const billingWorkedOnLast = billingCurrentCount > 0 && isLastDayOfMonth(billingCurrentDates[billingCurrentCount - 1], tmYear, tmMonth);
  const billingHasFour = allFourMonthsAgo.length > 0;
  const billingMeetsThreshold = billingCurrentCount >= 8 || billingCurrentWage >= PENSION_THRESHOLD;

  const refunds = [];
  const deducts = [];

  const reconcileDeduction = () => {
    const expectedDeductDates = billingCurrentCount >= 8
      ? billingCurrentDates.slice(7)
      : billingCurrentDates;
    refunds.push(...allDeductDates.filter(d => !expectedDeductDates.includes(d)));
    deducts.push(...expectedDeductDates.filter(d => !allDeductDates.includes(d)));
  };

  const addSiteRefund = (siteWorkDates) => {
    if (hasDeduction) refunds.push(...siteWorkDates);
  };

  const companyIds = [...new Set(allThreeMonthsAgo.map(i => i.companyId))];
  if (companyIds.length === 0) return { refunds: [], deducts: [] };

  for (const companyId of companyIds) {
    const siteFourMonthsAgo = allFourMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentMonth = allThreeMonthsAgo.filter(i => i.companyId === companyId);
    const siteCurrentWorkDates = siteCurrentMonth.map(i => i.workDate);
    const siteCurrentCount = siteCurrentMonth.length;
    const siteCurrentWage = siteCurrentCount * wage;

    const hasSiteFour = siteFourMonthsAgo.length > 0;
    const siteWorkedFirst = siteCurrentWorkDates.length > 0 && isFirstDayOfMonth(siteCurrentWorkDates[0], tmYear, tmMonth);
    const siteWorkedLast = siteCurrentWorkDates.length > 0 && isLastDayOfMonth(siteCurrentWorkDates[siteCurrentWorkDates.length - 1], tmYear, tmMonth);
    const siteMeetsThreshold = siteCurrentCount >= 8 || siteCurrentWage >= PENSION_THRESHOLD;

    if (hasSiteFour) {
      if (siteMeetsThreshold || billingMeetsThreshold) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else if (billingHasFour) {
      if (billingMeetsThreshold) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else if (siteWorkedFirst && siteWorkedLast) {
      if (siteMeetsThreshold || billingMeetsThreshold) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else if (!siteWorkedLast && allTwoMonthsAfter.some(i => i.companyId === companyId)) {
      if (siteMeetsThreshold) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else if (billingWorkedOnFirst && billingWorkedOnLast) {
      if (billingMeetsThreshold) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else if (billingWorkedOnFirst && allTwoMonthsAfter.length > 0) {
      if (billingCurrentCount >= 8) reconcileDeduction();
      else addSiteRefund(siteCurrentWorkDates);
    } else {
      addSiteRefund(siteCurrentWorkDates);
    }
  }

  return {
    refunds: [...new Set(refunds)],
    deducts: [...new Set(deducts)],
  };
};
