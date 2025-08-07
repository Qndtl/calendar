"use client"
import './Calendar.css';
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

// 상수 정의
const HEALTH_INSURANCE_THRESHOLD = 8;
const PENSION_INCOME_THRESHOLD = 2200000;
const WAGE_OPTIONS = [
  { value: 150000, label: "150000 8일 발생" },
  { value: 370000, label: "370000 6일 발생" },
  { value: 550000, label: "550000 4일 발생" }
];
const YEAR_OPTIONS = [
  { value: 2025, label: '2025년' },
  { value: 2026, label: '2026년' },
  { value: 2027, label: '2027년' },
  { value: 2028, label: '2028년' },
  { value: 2029, label: '2029년' },
  { value: 2030, label: '2030년' },
  { value: 2031, label: '2031년' },
  { value: 2032, label: '2032년' },
  { value: 2033, label: '2033년' },
  { value: 2034, label: '2034년' },
];
const MONTH_OPTIONS = [
  { value: 1, label: "1월" },
  { value: 2, label: "2월" },
  { value: 3, label: "3월" },
  { value: 4, label: "4월" },
  { value: 5, label: "5월" },
  { value: 6, label: "6월" },
  { value: 7, label: "7월" },
  { value: 8, label: "8월" },
  { value: 9, label: "9월" },
  { value: 10, label: "10월" },
  { value: 11, label: "11월" },
  { value: 12, label: "12월" },
];

// 유틸리티 함수들
const formatFromDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const formatDate = (year, month, day = null) => {
  const monthStr = month.toString().padStart(2, '0');
  return day ? `${year}-${monthStr}-${day.toString().padStart(2, '0')}` : `${year}-${monthStr}`;
};

const groupDatesByYearMonth = (dateArray) => {
  const grouped = {};
  const second = {};
  dateArray.forEach(({ companyId, workDate }) => {
    const [year, month] = workDate.split('-');
    const key = `${year}-${month}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    if(companyId === 1) {
      grouped[key].push(workDate);
    }
    if (!second[key]) {
      second[key] = [];
    }
    if(companyId === 2) {
      second[key].push(workDate);
    }
  });
  return {grouped, second};
};

const stateGroupDatesByYearMonth = (dateArray) => {
  const grouped = {};
  dateArray.forEach(({ workDate }) => {
    const [year, month] = workDate.split('-');
    const key = `${year}-${month}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(workDate);
  });
  return grouped;
};

const getMonthKey = (workYear, workMonth, monthOffset) => {
  const targetMonth = parseInt(workMonth) + monthOffset;

  if (targetMonth <= 0) {
    return formatDate(workYear - 1, 12 + targetMonth);
  } else if (targetMonth > 12) {
    return formatDate(workYear + 1, targetMonth - 12);
  }

  return formatDate(workYear, targetMonth);
};

// 초일 출역 여부
const isFirstDayOfMonth = (dateStr, workYear, month) => {
  return dateStr === `${formatDate(workYear, month)}-01`;
};

// 말일 출역 여부
const isLastDayOfMonth = (dateStr, workYear, month) => {
  const lastDayOfMonth = new Date(workYear, month, 0).getDate();

  return dateStr.endsWith(`-${lastDayOfMonth}`);
}

// 건강보험 공제 계산 로직
const calculateHealthInsuranceDeduction = (groupedDates, workYear, workMonth, companyId) => {
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

// 전월 출역이 없는 경우 - early return
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

// 전전월 출역이 있는 경우 - early return
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

// 전월 초일 출역한 경우 - early return
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
  console.log('전월 첫 출역일이 1월 30일 또는 1월 31일인 경우');

  // 전월 + 당월
  const merged = [...oneMonthAgo, ...currentMonth].sort();
  if(isSpecialCase) {
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

  // 전월 첫 출역일 ~ +30일
  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date >= firstDate && date <= lastFromFirstDate;
  });

  if(filtered.length < 8) {
    console.log('전월 첫 출역일 ~ +30일 < 8 인 경우');
    deductibles8.push(currentMonth[7]);
    deductiblesOver.push(...currentMonth.slice(8));
    return {
      eight: deductibles8,
      over: deductiblesOver
    }
  }

  if(merged.length > 0) {
    console.log('전월 + 당월 있는 경우');
    deductibles8.push(merged[7]);
    deductiblesOver.push(...merged.slice(8));
    return {
      eight: deductibles8,
      over: deductiblesOver
    }
  }

  console.log('비공제');
  return {
    eight: deductibles8.filter(Boolean),
    over: deductiblesOver.filter(Boolean)
  };
};

// 국민연금 공제 계산 로직
const calculatePensionDeduction = (groupedDates, workYear, workMonth, wage) => {
  //console.clear();
  console.log('%c국민연금 공제 대상 체크 시작', 'color: #ff0000');

  const currentMonthDates = groupedDates[getMonthKey(workYear, workMonth, 0)] || [];
  const sortedDates = currentMonthDates.sort();

  if (sortedDates.length === 0) {
    return { eight: [], over: [] };
  }

  const { targetIndex } = findThresholdDate(sortedDates, wage);

  if (sortedDates.length >= 8) {
    console.log('당월 8일 이상 출역');
    return handleEightOrMoreDays(sortedDates, targetIndex);
  } else {
    console.log('당월 8일 미만 출역');
    return handleLessThanEightDays(sortedDates, targetIndex);
  }
};

// 건강보험 환급 계산 로직
// groupedDates: 선택된 날짜
// workYear: 선택된 년도
// targetMonth: 환급 대상 월
// deductibles: 건강보험 공제 내역
const calculateHealthInsuranceRefund = (groupedDates, workYear, targetMonth, deductibles, companyId) => {
  const twoMonthsAgo = groupedDates[getMonthKey(workYear, targetMonth, -2)] || []; // 5개월 전
  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || []; // 4개월 전
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || []; // 3개월 전(환급 대상 월)
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || []; // 2개월 전
  const twoMonthsAfter = groupedDates[getMonthKey(workYear, targetMonth, 2)] || []; // 1개월 전

  // 건강보험 공제 대상
  const healthDeductibles = [...deductibles['eight'], ...deductibles['over']].filter(Boolean);

  const sortedDates = {
    twoMonthsAgo: twoMonthsAgo.sort(),
    oneMonthAgo: oneMonthAgo.sort(),
    currentMonth: currentMonth.sort(),
    oneMonthAfter: oneMonthAfter.sort(),
    twoMonthsAfter: twoMonthsAfter.sort()
  };

  let refunds = [];

  // 4개월 전 + 3개월 전 출역 이력
  const merged = [...oneMonthAgo, ...currentMonth].sort();
  // 4개월 전 첫 출역일
  const firstDate = new Date(sortedDates.oneMonthAgo[0]);
  // 4개월 전 첫 출역일 +30일
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  console.log(`%c건강보험 건설사${companyId} 환급 대상 체크 시작`, 'color: yellow');

  // 4개월 전 출역이 없는 경우
  if (oneMonthAgo.length === 0) {
    return refundHandleNoOneMonthAgoWork(sortedDates, currentMonth, oneMonthAfter, twoMonthsAfter, workYear, targetMonth, groupedDates, refunds, healthDeductibles);
  }

  console.log('4개월 전 출역이 있는 경우');

  // 5개월 전 출역이 있는 경우
  if (twoMonthsAgo.length > 0) {
    return refundHandleWithTwoMonthsAgoWork(currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds);
  }

  console.log('5개월 전 출역이 없는 경우');

  // 4개월 전 초일 출역한 경우
  if (isFirstDayOfMonth(sortedDates.oneMonthAgo[0], workYear, parseInt(targetMonth) - 1)) {
    return refundHandleFirstDayWork(currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds);
  }

  console.log('4개월 전 초일 출역 안한 경우');

  // 4개월 전 첫 출역이 1월 30일 또는 1월 31일인 경우
  const isSpecial = sortedDates.oneMonthAgo[0].endsWith('-01-30') || oneMonthAgo[0].endsWith('-01-31');
  if (isSpecial) {
    return refundHandleSpecialDateWork(merged, currentMonth, sortedDates, oneMonthAfter, workYear, targetMonth, healthDeductibles, refunds);
  }

  console.log('4개월 전 첫 출역 1/30, 31 일이 아닌 경우');

  // 4개월 전 출역이 8일 이상인 경우
  if (oneMonthAgo.length >= 8) {
    console.log('4개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  return refundHandleLessThanEightDays(merged, lastFromFirstDate, currentMonth, healthDeductibles, refunds);
};

// 국민연금 환급 계산 로직
// groupedDates: 선택된 날짜
// workYear: 선택된 년도
// targetMonth: 환급 대상 월
// wage: 하루 노임
// deductibles: 건강보험 공제 내역
const calculateStatePensionRefund = (groupedDates, workYear, targetMonth, wage, deductibles) => {
  const oneMonthAgo = groupedDates[getMonthKey(workYear, targetMonth, -1)] || []; // 4개월 전
  const currentMonth = groupedDates[getMonthKey(workYear, targetMonth, 0)] || []; // 3개월 전(환급 대상 월)
  const oneMonthAfter = groupedDates[getMonthKey(workYear, targetMonth, 1)] || []; // 2개월 전

  const sortedDates = {
    oneMonthAgo: oneMonthAgo.sort(),
    currentMonth: currentMonth.sort(),
    oneMonthAfter: oneMonthAfter.sort(),
  };

  let refunds = [];

  console.log('%c국민연금 환급 대상 체크 시작', 'color: yellow');
  // todo: 국민연금 환급 로직

  return refunds;
}

// [환급]4개월 전 출역이 없는 경우 처리
const refundHandleNoOneMonthAgoWork = (sortedDates, currentMonth, oneMonthAfter, twoMonthsAfter, workYear, targetMonth, groupedDates, refunds, healthDeductibles) => {
  console.log('4개월 전 출역이 없는 경우');

  const firstDayWorked = isFirstDayOfMonth(sortedDates.currentMonth[0], workYear, parseInt(targetMonth));

  if(!firstDayWorked) {
    console.log('3개월 전 초일 출역이 아닌 경우');

    // 3개월 전 첫 출역이 1월 30일 또는 1월 31일인 경우
    const isSpecial = sortedDates.currentMonth[0]?.endsWith('-01-30') || sortedDates.currentMonth[0]?.endsWith('-01-31');
    if (isSpecial) {
      return refundHandleCurrentMonthSpecialDate(currentMonth, oneMonthAfter, sortedDates, twoMonthsAfter, workYear, targetMonth, refunds);
    }

    console.log('3개월 전 첫 출역이 1월 30일 또는 1월 31일 아닌 경우');
    return refundHandleCurrentMonthRegularDate(currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles);
  }

  // 3개월 전 초일 출역한 경우
  console.log('3개월 전 초일 출역한 경우');

  // 3개월 전 1일 ~ 3개월 전 말일 출역 < 8
  if(currentMonth.length < 8) {
    console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8')
    // 공제 내역과 환급 대상 교집합
    const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

    if(intersect.length > 0) {
      console.log('3개월 전 1일 ~ 3개월 전 말일 출역 < 8, 3개월 전 지급단 공제 금액 환급');
      refunds.push(...intersect);
      return refunds;
    }

    console.log('환급 비대상');
    return refunds;
  }

  console.log('3개월 전 1일 ~ 3개월 전 말일 출역 >= 8');

  // 3개월 전 말일 출역 여부
  const lastDayWorked = isLastDayOfMonth(sortedDates.currentMonth[currentMonth.length - 1], workYear, targetMonth);

  if (lastDayWorked) { // 3개월 전 말일 출역
    console.log('3개월 전 말일 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 말일 출역 X');

  if (oneMonthAfter.length > 0) { // 2개월 전 출역이 있는 경우
    console.log('2개월 전 출역');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  // 공제 내역과 환급 대상 교집합
  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if(intersect.length > 0) {
    console.log('2개월 전 출역 없는 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...intersect);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]5개월 전 출역이 있는 경우 처리
const refundHandleWithTwoMonthsAgoWork = (currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds) => {
  console.log('5개월 전 출역이 있는 경우');

  if (currentMonth.length >= 8) {
    console.log('3개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 출역 8일 미만인 경우');

  // 공제 내역과 환급 대상 교집합
  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('3개월 전 출역 8일 미만인 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...intersect);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]4개월 전 초일 출역한 경우 처리
const refundHandleFirstDayWork = (currentMonth, merged, lastFromFirstDate, healthDeductibles, refunds) => {
  console.log('4개월 전 초일 출역한 경우');

  if (currentMonth.length >= 8) {
    console.log('3개월 전 출역 8일 이상인 경우');
    console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
    return refunds;
  }

  console.log('3개월 전 출역 8일 미만인 경우');

  // 공제 내역과 환급 대상 교집합
  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('3개월 전 출역 8일 미만인 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...intersect);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]4개월 전 첫 출역이 1월 30일 또는 1월 31일인 특수 케이스 처리
const refundHandleSpecialDateWork = (merged, currentMonth, sortedDates, oneMonthAfter, workYear, targetMonth, healthDeductibles, refunds) => {
  console.log('4개월 전 첫 출역 1/30, 31 일인 경우');

  if(merged.length < 8) {
    console.log('1/30 or 31 ~ 2월 말일 출역 8일 미만');
    // 공제 내역과 환급 대상 교집합
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
  // 공제 내역과 환급 대상 교집합
  const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

  if (intersect.length > 0) {
    console.log('2개월 전 출역이 없는 경우, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]4개월 전 출역이 8일 미만인 경우 처리
const refundHandleLessThanEightDays = (merged, lastFromFirstDate, currentMonth, healthDeductibles, refunds) => {
  console.log('4개월 전 출역 8일 미만인 경우');

  // 4개월 전 첫 출역일 ~ +30일 출역 이력
  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date <= lastFromFirstDate;
  });

  if (filtered.length >= 8) {
    console.log('4개월 전 ~ +30일 출역 8일 이상인 경우');
    if(merged.includes(lastFromFirstDate)) {
      console.log('4개월 전 출역일 +30일 출역한 경우')
      console.log('%c금액 비교 후 징수 or 환급', 'color: #FFA500');
      return refunds;
    }

    console.log('4개월 전 출역일 +30일 출역 안한 경우')
    // 4개월 전 + 3개월 전 중 lastFromFirstDate 이후 출역 이력
    const filtered = merged.filter(item => {
      const date = new Date(item);
      return date > lastFromFirstDate;
    });

    if(filtered.length === 0) {
      const intersect = currentMonth.filter(date => healthDeductibles.includes(date));

      if (intersect.length > 0) {
        console.log('4개월 전 첫 출역 + 31일 ~ 3개월 전 말일 공제값 Y > 0, 3개월 전 지급단 공제 금액 환급');
        refunds.push(...intersect);
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
    refunds.push(...intersect);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]3개월 전 첫 출역이 1월 30일 또는 1월 31일인 특수 케이스 처리
const refundHandleCurrentMonthSpecialDate = (currentMonth, oneMonthAfter, sortedDates, twoMonthsAfter, workYear, targetMonth, refunds) => {
  console.log('3개월 전 첫 출역이 1월 30일 또는 1월 31일 인 경우');

  // 3개월 전 + 2개월 전 출역 이력
  const merged = [...currentMonth, ...oneMonthAfter].sort();

  if(merged.length < 8) {
    console.log('1/30 ~ 2월말 까지 8일 미만 출역, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...currentMonth);
    return refunds;
  }

  console.log('1/30 ~ 2월말 까지 8일 이상 출역');
  const lastDayWorked = isLastDayOfMonth(sortedDates.currentMonth[currentMonth.length - 1], workYear, targetMonth);

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

// [환급]3개월 전 첫 출역이 1월 30일 or 1월 31일 아닌(일반적인 날짜인) 경우 처리
const refundHandleCurrentMonthRegularDate = (currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles) => {
  if(currentMonth.length < 8) {
    console.log('3개월 전 8일 미만 출역한 경우');
    return refundHandleCurrentMonthLessThanEight(currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles);
  }

  console.log('3개월 전 8일 이상 출역한 경우');
  // 3개월 전 첫 출역일
  const firstDate = new Date(sortedDates.currentMonth[0]);
  // 3개월 전 첫 출역일 +30일
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

// [환급]3개월 전 첫 출역일 +30일 이후 체크
const refundHandleThirtyDaysAfterCheck = (currentMonth, oneMonthAfter, lastFromFirstDate, refunds) => {
  // 3개월 전 + 2개월 전
  const merged = [...currentMonth, ...oneMonthAfter].sort();

  // 3개월 전 첫 출역 + 30 일 보다 큰 경우
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

// [환급]3개월 전 8일 미만 출역한 경우 처리
const refundHandleCurrentMonthLessThanEight = (currentMonth, oneMonthAfter, sortedDates, groupedDates, refunds, healthDeductibles) => {
  // 3개월 전 + 2개월 전 출역 이력
  const merged = [...currentMonth, ...oneMonthAfter].sort();
  const firstDate = new Date(sortedDates.currentMonth[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  // 3개월 전 첫 출역일 ~ +30일 출역 이력
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
  if(intersect.length > 0) {
    console.log('3개월전 첫 출역일 ~ +30일에서 8일 미만 출역, 3개월 전 지급단 공제 금액 환급');
    refunds.push(...intersect);
    return refunds;
  }

  console.log('환급 비대상');
  return refunds;
};

// [환급]220만원 초과한 날짜 조회
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
    const filtered = dates.filter((item, index) => index > targetIndex);
    return {
      eight: [dates[targetIndex]],
      over: filtered
    };
  }

  const filtered = dates.filter((item, index) => index > 7);
  return {
    eight: [dates[7]],
    over: filtered
  };
};

const handleLessThanEightDays = (dates, targetIndex) => {
  if (targetIndex === null) {
    return { eight: [], over: [] };
  }

  const filtered = dates.filter((item, index) => index > targetIndex);
  return {
    eight: [dates[targetIndex]],
    over: filtered
  };
};

const Page = () => {
  const [workYear, setWorkYear] = useState(new Date().getFullYear());
  const [workMonth, setWorkMonth] = useState(new Date().getMonth() + 1);
  const [totalSelectedDates, setTotalSelectedDates] = useState([]);
  const [deductibles, setDeductibles] = useState({ eight: [], over: [] });
  const [secondDeductibles, setSecondDeductibles] = useState({ eight: [], over: [] });
  const [stateDeductibles, setStateDeductibles] = useState({ eight: [], over: [] });
  const [refunds, setRefunds] = useState([]);
  const [secondRefunds, setSecondRefunds] = useState([]);
  const [stateRefunds, setStateRefunds] = useState([]);
  const [wage, setWage] = useState(150000);

  const setTotalDates = useCallback((dates) => {
    setTotalSelectedDates(dates);
  }, []);

  const reset = useCallback(() => {
    setTotalSelectedDates([]);
  }, []);

  const checkDeductibleDates = useCallback((dates, companyId) => {
    return calculateHealthInsuranceDeduction(dates, workYear, workMonth, companyId);
  }, [workYear, workMonth]);

  const checkStateDeductibleDates = useCallback((dates) => {
    return calculatePensionDeduction(dates, workYear, workMonth, wage);
  }, [wage, workYear, workMonth]);

  const checkRefundDates = useCallback((dates, healthDeductibles, companyId) => {
    return calculateHealthInsuranceRefund(dates, workYear, workMonth, healthDeductibles, companyId);
  }, [workYear, workMonth]);

  const checkStateRefundDates = useCallback((dates) => {
    return calculateStatePensionRefund(dates, workYear, workMonth, wage)
  }, [wage, workYear, workMonth]);

  const getCalendarProps = useCallback((monthOffset) => {
    const targetMonth = parseInt(workMonth) + monthOffset;
    let year = workYear;
    let month = targetMonth;

    if (targetMonth <= 0) {
      year = workYear - 1;
      month = 12 + targetMonth;
    } else if (targetMonth > 12) {
      year = workYear + 1;
      month = targetMonth - 12;
    }

    return {
      totalSelectedDates,
      setTotalDates,
      year,
      month,
      currentMonth: parseInt(workMonth),
    };
  }, [workYear, workMonth, totalSelectedDates, setTotalDates]);

  useEffect(() => {
    console.clear();
    console.log(totalSelectedDates)
    const healthGroupedDates = groupDatesByYearMonth(totalSelectedDates);
    const stateGroupedDates = stateGroupDatesByYearMonth(totalSelectedDates);

    // 건강보험 공제 건설사1
    const deductibleDates = checkDeductibleDates(healthGroupedDates.grouped, 1);
    setDeductibles(deductibleDates);

    // 건강보험 공제 건설사2
    const secondDeductibleDates = checkDeductibleDates(healthGroupedDates.second, 2);
    setSecondDeductibles(secondDeductibleDates);

    // 국민연금 공제
    const stateDeductibleDates = checkStateDeductibleDates(stateGroupedDates);
    setStateDeductibles(stateDeductibleDates);

    // 건강보험 환급 건설사1
    const refundDates = checkRefundDates(healthGroupedDates.grouped, deductibleDates, 1);
    setRefunds(refundDates);

    // 건강보험 환급 건설사2
    const secondRefundDates = checkRefundDates(healthGroupedDates.second, secondDeductibleDates, 2);
    setSecondRefunds(secondRefundDates);

    // 국민연금 환급
    const stateRefundDates = checkStateRefundDates(stateGroupedDates);
    setStateRefunds(stateRefundDates);

  }, [wage, workYear, workMonth, checkDeductibleDates, totalSelectedDates, checkStateDeductibleDates, checkRefundDates, checkStateRefundDates]);

  const renderCalendarRow = (title, deductibleData, refundData, secondRefundData) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <h2>{title}</h2>
      {[-2, -1, 0, 1, 2].map(offset => (
        <Calendar
          key={offset}
          title={title}
          shade={title === '국민' && (offset === -2 || offset === 2)}
          deductibles={deductibleData}
          secondDeductibles={secondDeductibles}
          refundData={refundData}
          secondRefundData={secondRefundData}
          {...getCalendarProps(offset)}
        />
      ))}
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button style={{ width: '80px', height: '30px' }} onClick={reset}>
          reset
        </button>

        <select
          style={{ width: '80px', height: '30px' }}
          value={workYear}
          onChange={(e) => setWorkYear(parseInt(e.target.value))}
        >
          {YEAR_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>


        <select
          style={{ width: '80px', height: '30px' }}
          value={parseInt(workMonth)}
          onChange={(e) => setWorkMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          style={{ width: '130px', height: '30px' }}
          value={wage}
          onChange={(e) => setWage(parseInt(e.target.value))}
        >
          {WAGE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {renderCalendarRow("건강", deductibles, refunds, secondRefunds)}
      {renderCalendarRow("국민", stateDeductibles, stateRefunds)}
    </div>
  );
}

export default Page;