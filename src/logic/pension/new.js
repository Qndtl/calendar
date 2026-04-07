// 신규 국민연금 공제 로직
import { getMonthKey, isFirstDayOfMonth } from '../utils';

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

  const sortByDate = (a, b) => a.workDate.localeCompare(b.workDate);
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

    // STEP 1: 현장 전월 출역 확인
    if (sitePrevMonth.length >= 1) {
      console.log(`현장${companyId} 전월 출역 있음 → STEP 3`);
      applyDeduction(siteCurrentMonth.length, billingCurrentDates, eightSet, overSet);
    } else {
      // STEP 2: 현장 당월 초일 출역 여부
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

  // STEP 4-6: 청구업체 체크 (현장 탈락 시)
  if (needsBillingCheck) {
    if (allPrevMonth.length >= 1) {
      console.log('청구업체 전월 출역 있음 → STEP 6');
      applyDeduction(billingCurrentDates.length, billingCurrentDates, eightSet, overSet);
    } else {
      // STEP 5: 청구업체 당월 초일 출역 여부
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

// 신규 국민연금 환급 로직 (구현 예정)
export const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  console.log('%c[신규] 국민연금 환급 대상 체크', 'color: #00aaff');
  return { refunds: [], deducts: [] };
};
