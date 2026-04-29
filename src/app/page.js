"use client"
import './Calendar.css';
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getHealthLogic } from "@/logic/health";
import { getPensionLogic } from "@/logic/pension";

const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

// 상수 정의
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
const groupDatesByYearMonth = (dateArray) => {
  const grouped = {};
  const second = {};
  const third = {};
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
    if (!third[key]) {
      third[key] = [];
    }
    if(companyId === 3) {
      third[key].push(workDate);
    }
  });
  return {grouped, second, third};
};

const stateGroupDatesByYearMonth = (dateArray, wage) => {
  const grouped = {};
  dateArray.forEach(({ workDate, companyId }) => {
    const [year, month] = workDate.split('-');
    const key = `${year}-${month}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push({workDate, companyId, wage});
  });
  return grouped;
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
  const [thirdRefunds, setThirdRefunds] = useState([]);
  const [healthDeducts, setHealthDeducts] = useState([]);
  const [secondHealthDeducts, setSecondHealthDeducts] = useState([]);
  const [thirdHealthDeducts, setThirdHealthDeducts] = useState([]);
  const [thirdDeductibles, setThirdDeductibles] = useState({ eight: [], over: [] });
  const [stateRefunds, setStateRefunds] = useState([]);
  const [stateDeducts, setStateDeducts] = useState([]);
  const [wage, setWage] = useState(150000);
  const [logicType, setLogicType] = useState('existing');

  const setTotalDates = useCallback((dates) => {
    setTotalSelectedDates(dates);
  }, []);

  const reset = useCallback(() => {
    setTotalSelectedDates([]);
  }, []);

  const checkDeductibleDates = useCallback((dates, companyId) => {
    const { calculateDeduction } = getHealthLogic(logicType);
    return calculateDeduction(dates, workYear, workMonth, companyId);
  }, [logicType, workYear, workMonth]);

  const checkStateDeductibleDates = useCallback((dates) => {
    const { calculateDeduction } = getPensionLogic(logicType);
    return calculateDeduction(dates, workYear, workMonth, wage);
  }, [logicType, wage, workYear, workMonth]);

  const checkRefundDates = useCallback((dates, healthDeductibles, companyId) => {
    const { calculateRefund } = getHealthLogic(logicType);
    return calculateRefund(dates, workYear, workMonth, healthDeductibles, companyId);
  }, [logicType, workYear, workMonth]);

  const checkStateRefundDates = useCallback((dates, currentStateDeductibles) => {
    const { calculateRefund } = getPensionLogic(logicType);
    return calculateRefund(dates, workYear, workMonth, wage, currentStateDeductibles);
  }, [logicType, wage, workYear, workMonth]);

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
    const stateGroupedDates = stateGroupDatesByYearMonth(totalSelectedDates, wage);

    // 건강보험 공제 건설사1
    const deductibleDates = checkDeductibleDates(healthGroupedDates.grouped, 1);
    setDeductibles(deductibleDates);

    // 건강보험 공제 건설사2
    const secondDeductibleDates = checkDeductibleDates(healthGroupedDates.second, 2);
    setSecondDeductibles(secondDeductibleDates);

    // 건강보험 공제 건설사3
    const thirdDeductibleDates = checkDeductibleDates(healthGroupedDates.third, 3);
    setThirdDeductibles(thirdDeductibleDates);

    // 국민연금 공제
    const stateDeductibleDates = checkStateDeductibleDates(stateGroupedDates);
    setStateDeductibles(stateDeductibleDates);

    // 건강보험 환급 건설사1
    const refundResult1 = checkRefundDates(healthGroupedDates.grouped, deductibleDates, 1);
    const refundDates1 = Array.isArray(refundResult1) ? refundResult1 : refundResult1.refunds;
    const deductDates1 = Array.isArray(refundResult1) ? [] : refundResult1.deducts;
    setRefunds(refundDates1);
    setHealthDeducts(deductDates1);

    // 건강보험 환급 건설사2
    const refundResult2 = checkRefundDates(healthGroupedDates.second, secondDeductibleDates, 2);
    const refundDates2 = Array.isArray(refundResult2) ? refundResult2 : refundResult2.refunds;
    const deductDates2 = Array.isArray(refundResult2) ? [] : refundResult2.deducts;
    setSecondRefunds(refundDates2);
    setSecondHealthDeducts(deductDates2);

    // 건강보험 환급 건설사3
    const refundResult3 = checkRefundDates(healthGroupedDates.third, thirdDeductibleDates, 3);
    const refundDates3 = Array.isArray(refundResult3) ? refundResult3 : refundResult3.refunds;
    const deductDates3 = Array.isArray(refundResult3) ? [] : refundResult3.deducts;
    setThirdRefunds(refundDates3);
    setThirdHealthDeducts(deductDates3);

    // 국민연금 환급 및 징수
    const stateRefundAndDeducts = checkStateRefundDates(stateGroupedDates, stateDeductibleDates);
    setStateRefunds(stateRefundAndDeducts.refunds);
    setStateDeducts(stateRefundAndDeducts.deducts);

  }, [wage, workYear, workMonth, checkDeductibleDates, totalSelectedDates, checkStateDeductibleDates, checkRefundDates, checkStateRefundDates]);

  const renderCalendarRow = (title, deductibleData, secondDeductiblesData, thirdDeductiblesData, refundData, secondRefundData, thirdRefundData, healthDeductData = [], secondHealthDeductData = [], thirdHealthDeductData = [], stateDeductData) => (
    <div style={{ width: '100%', maxWidth: '100%' }}>
      <h2 style={{ textAlign: 'center', margin: '8px 0 4px' }}>{title}</h2>
      <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', margin: '0 auto' }}>
          {[-2, -1, 0, 1, 2].map(offset => (
            <Calendar
              key={offset}
              title={title}
              shade={
                (title === '국민' && (offset === -2 || offset === 2)) ||
                (logicType === 'new' && title === '건강' && offset === 2) ||
                (logicType === 'new' && title === '국민' && offset === 1)
              }
              deductibles={deductibleData}
              secondDeductibles={secondDeductiblesData}
              thirdDeductibles={thirdDeductiblesData}
              refundData={refundData}
              secondRefundData={secondRefundData}
              thirdRefundData={thirdRefundData}
              healthDeductData={healthDeductData}
              secondHealthDeductData={secondHealthDeductData}
              thirdHealthDeductData={thirdHealthDeductData}
              stateDeductData={stateDeductData}
              {...getCalendarProps(offset)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 'bold' }}>로직 선택:</span>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            name="logicType"
            value="existing"
            checked={logicType === 'existing'}
            onChange={() => setLogicType('existing')}
          />
          {' '}기존
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input
            type="radio"
            name="logicType"
            value="new"
            checked={logicType === 'new'}
            onChange={() => setLogicType('new')}
          />
          {' '}신규
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
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

      {renderCalendarRow("건강", deductibles, secondDeductibles, thirdDeductibles, refunds, secondRefunds, thirdRefunds, healthDeducts, secondHealthDeducts, thirdHealthDeducts)}
      {renderCalendarRow("국민", stateDeductibles, {eight: [], over: []}, {eight: [], over: []}, stateRefunds, [], [], [], [], [], stateDeducts)}
    </div>
  );
}

export default Page;