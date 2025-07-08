"use client"
import './Calendar.css';
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

// 상수 정의
const WORK_YEAR = 2025;
const HEALTH_INSURANCE_THRESHOLD = 8;
const PENSION_INCOME_THRESHOLD = 2200000;
const WAGE_OPTIONS = [
  { value: 150000, label: "150000 8일 발생" },
  { value: 370000, label: "370000 6일 발생" },
  { value: 550000, label: "550000 4일 발생" }
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
const formatDate = (year, month, day = null) => {
  const monthStr = month.toString().padStart(2, '0');
  return day ? `${year}-${monthStr}-${day.toString().padStart(2, '0')}` : `${year}-${monthStr}`;
};

const groupDatesByYearMonth = (dateStrSet) => {
  const groups = {};
  for (const dateStr of dateStrSet) {
    const yearMonth = dateStr.slice(0, 7);
    if (!groups[yearMonth]) {
      groups[yearMonth] = [];
    }
    groups[yearMonth].push(dateStr);
  }
  return groups;
};

const getMonthKey = (workMonth, monthOffset) => {
  const targetMonth = parseInt(workMonth) + monthOffset;

  if (targetMonth <= 0) {
    return formatDate(WORK_YEAR - 1, 12 + targetMonth);
  } else if (targetMonth > 12) {
    return formatDate(WORK_YEAR + 1, targetMonth - 12);
  }

  return formatDate(WORK_YEAR, targetMonth);
};

const isFirstDayOfMonth = (dateStr, month) => {
  return dateStr === `${formatDate(WORK_YEAR, month)}-01`;
};

// 건강보험 공제 계산 로직
const calculateHealthInsuranceDeduction = (groupedDates, workMonth) => {
  console.clear();
  console.log('%c건강보험 공제 대상 체크 시작', 'color: #ff0000');

  const twoMonthsAgo = groupedDates[getMonthKey(workMonth, -2)] || [];
  const oneMonthAgo = groupedDates[getMonthKey(workMonth, -1)] || [];
  const currentMonth = groupedDates[getMonthKey(workMonth, 0)] || [];

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
  if (isFirstDayOfMonth(sortedDates.oneMonthAgo[0], parseInt(workMonth) - 1)) {
    console.log('전월 초일 출역한 경우');
    deductibles8.push(sortedDates.currentMonth[7]);
    deductiblesOver.push(...sortedDates.currentMonth.slice(8));
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

  console.log('전월 초일 출역 안한 경우');

// 전월 출역일수가 7일 이하인 경우 - early return
  if (sortedDates.oneMonthAgo.length <= 7) {
    const result = handlePartialPreviousMonth(
      sortedDates.oneMonthAgo,
      sortedDates.currentMonth,
      workMonth
    );
    deductibles8 = result.eight;
    deductiblesOver = result.over;
    return {
      eight: deductibles8.filter(Boolean),
      over: deductiblesOver.filter(Boolean)
    };
  }

// 전월 첫출역일 ~ 전월 말일 출역 7일 초과인 경우 (마지막 케이스)
  console.log('전월 첫출역일 ~ 전월 말일 출역 7일 초과인 경우');
  deductibles8.push(sortedDates.currentMonth[7]);
  deductiblesOver.push(...sortedDates.currentMonth.slice(8));

  return {
    eight: deductibles8.filter(Boolean),
    over: deductiblesOver.filter(Boolean)
  };
};

const handlePartialPreviousMonth = (oneMonthAgo, currentMonth, workMonth) => {
  console.log('전월 첫출역일 ~ 전월 말일 출역 7일 이하인 경우');

  const isSpecialCase = oneMonthAgo[0] === '2025-01-30' || oneMonthAgo[0] === '2025-01-31';

  if (isSpecialCase) {
    console.log('전월 첫 출역일 = 1월 30일 또는 1월 31일인 경우');
    return handleSpecialDateCase(oneMonthAgo, currentMonth);
  } else {
    console.log('전월 첫 출역일 = 1월 30일 또는 1월 31일 아닌 경우');
    return handleNormalDateCase(oneMonthAgo, currentMonth);
  }
};

const handleSpecialDateCase = (oneMonthAgo, currentMonth) => {
  const merged = [...oneMonthAgo, ...currentMonth].sort();

  if (merged.length === 8) {
    console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일인 경우');
    return { eight: [merged[7]], over: merged.slice(8) };
  } else if (merged.length > 8) {
    console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일 초과인 경우');
    return { eight: [merged[7]], over: merged.slice(8) };
  } else {
    console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일 미만인 경우');
    return { eight: [currentMonth[7]], over: currentMonth.slice(8) };
  }
};

const handleNormalDateCase = (oneMonthAgo, currentMonth) => {
  const merged = [...oneMonthAgo, ...currentMonth].sort();
  const firstDate = new Date(oneMonthAgo[0]);
  const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));

  const filtered = merged.filter(item => {
    const date = new Date(item);
    return date >= firstDate && date <= lastFromFirstDate;
  });

  if (filtered.length < 8) {
    console.log('전월 첫 ~ +30일 8일 미만');
    return { eight: [currentMonth[7]], over: currentMonth.slice(8) };
  } else {
    console.log('전월 첫 ~ +30일 8일 이상');
    const filtered2 = currentMonth.filter(item => {
      const date = new Date(item);
      const eighth = new Date(filtered[7]);
      return date > eighth;
    });

    return {
      eight: [filtered[7]],
      over: currentMonth.length >= 8 ? filtered2 : []
    };
  }
};

// 국민연금 공제 계산 로직
const calculatePensionDeduction = (groupedDates, workMonth, wage) => {
  //console.clear();
  console.log('%c국민연금 공제 대상 체크 시작', 'color: #ff0000');

  const currentMonthDates = groupedDates[getMonthKey(workMonth, 0)] || [];
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
  const [workMonth, setWorkMonth] = useState(6);
  const [totalSelectedDates, setTotalSelectedDates] = useState(new Set());
  const [deductibles, setDeductibles] = useState({ eight: [], over: [] });
  const [stateDeductibles, setStateDeductibles] = useState({ eight: [], over: [] });
  const [wage, setWage] = useState(150000);

  const setTotalDates = useCallback((dates) => {
    setTotalSelectedDates(dates);
  }, []);

  const reset = useCallback(() => {
    setTotalSelectedDates(new Set());
  }, []);

  const checkDeductibleDates = useCallback((dates) => {
    return calculateHealthInsuranceDeduction(dates, workMonth);
  }, [workMonth]);

  const checkStateDeductibleDates = useCallback((dates) => {
    return calculatePensionDeduction(dates, workMonth, wage);
  }, [wage, workMonth]);

  const getCalendarProps = useCallback((monthOffset, isShaded = false) => {
    const targetMonth = parseInt(workMonth) + monthOffset;
    let year = WORK_YEAR;
    let month = targetMonth;

    if (targetMonth <= 0) {
      year = WORK_YEAR - 1;
      month = 12 + targetMonth;
    } else if (targetMonth > 12) {
      year = WORK_YEAR + 1;
      month = targetMonth - 12;
    }

    return {
      totalSelectedDates,
      setTotalDates,
      year,
      month,
      currentMonth: parseInt(workMonth),
      shade: isShaded
    };
  }, [workMonth, totalSelectedDates, setTotalDates]);

  useEffect(() => {
    const groupedDates = groupDatesByYearMonth(totalSelectedDates);

    const deductibleDates = checkDeductibleDates(groupedDates);
    setDeductibles(deductibleDates);

    const stateDeductibleDates = checkStateDeductibleDates(groupedDates);
    setStateDeductibles(stateDeductibleDates);
  }, [wage, workMonth, checkDeductibleDates, totalSelectedDates, checkStateDeductibleDates]);

  const renderCalendarRow = (title, deductibleData) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <h2>{title}</h2>
      {[-2, -1, 0, 1, 2].map(offset => (
        <Calendar
          key={offset}
          deductibles={deductibleData}
          {...getCalendarProps(offset, offset === null)}
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

      {renderCalendarRow("건강", deductibles)}
      {renderCalendarRow("국민", stateDeductibles)}
    </div>
  );
};

export default Page;