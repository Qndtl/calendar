"use client"
import './Calendar.css';
//import Calendar from "@/components/Calendar"
import {useCallback, useEffect, useState} from "react";
import dynamic from "next/dynamic";
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

const Page = () => {
  const workYear = 2025;
  const [workMonth, setWorkMonth] = useState(6);
  const [totalSelectedDates, setTotalSelectedDates] = useState(new Set);
  const [deductibles, setDeductibles] = useState({eight: [], over: []});
  const [stateDeductibles, setStateDeductibles] = useState({eight: [], over: []});
  const [wage, setWage] = useState(150000)

  const setTotalDates = (dates) => {
    setTotalSelectedDates(dates)
  }

  const reset = () => {
    setTotalSelectedDates(new Set)
  }

  function groupByYearMonth1(dateStrSet) {
    const groups = {};

    for (const dateStr of dateStrSet) {
      const yearMonth = dateStr.slice(0, 7); // "YYYY-MM" 추출

      if (!groups[yearMonth]) {
        groups[yearMonth] = [];
      }
      groups[yearMonth].push(dateStr);
    }

    return groups;
  }

  // 건강 보험 공제 체크 로직
  const checkDeductibleDates = useCallback((dates) => {
    console.clear()
    console.log('%c-----------------------------------------------------', 'color: #ff0000')
    console.log('건강보험 공제 대상 체크 시작');

    // console.log(`${parseInt(workMonth) === 2 ? 2024 : 2025}-${parseInt(workMonth) === 2 ? 12 : '0' + (parseInt(workMonth) - 2)}`)
    // console.log(`${parseInt(workMonth) === 2 ? 2025 : 2025}-0${parseInt(workMonth) === 2 ? 1 : parseInt(workMonth) - 1}`)
    // console.log(`2025-0${parseInt(workMonth)}`)

    const lastTwoMonths = dates[`${parseInt(workMonth) === 2 ? 2024 : 2025}-${parseInt(workMonth) === 2 ? 12 : '0' + (parseInt(workMonth) - 2)}`] ?? [];
    const lastOneMonths = dates[`${parseInt(workMonth) === 2 ? 2025 : 2025}-0${parseInt(workMonth) === 2 ? 1 : parseInt(workMonth) - 1}`] ?? [];
    const lastThisMonths = dates[`2025-0${parseInt(workMonth)}`] ?? [];
    const twoMonths = lastTwoMonths.sort();
    const oneMonths = lastOneMonths.sort();
    const thisMonths = lastThisMonths.sort();
    // console.log('전전월', twoMonths.sort())
    // console.log('전월', oneMonths.sort())
    // console.log('당월', thisMonths.sort())
    const deductibles8 = [];
    const deductiblesOver = [];

    if(oneMonths.length >= 1) { // 전월 출역 있는 경우
      console.log('전월 출역 있는 경우')
      if(twoMonths.length >= 1) { // 전전월 출역이 있는 경우 => 당월 1일부터 말일 출역일
        console.log('전전월 출역이 있는 경우')
        deductibles8.push(thisMonths[7])
        deductiblesOver.push(...thisMonths.slice(8))
      } else { // 전전월 출역이 없는 경우
        console.log('전전월 출역이 없는 경우')
        if(oneMonths[0] === `${parseInt(workMonth) === 2 ? 2025 : 2025}-${parseInt(workMonth) === 2 ? 12 : parseInt(workMonth) - 1}-01`) { // 전월 초일 출역한 경우 => 당월 1일부터 말일 출역일
          console.log('전월 초일 출역한 경우')
          deductibles8.push(thisMonths[7])
          deductiblesOver.push(...thisMonths.slice(8))
        } else { // 전월 초일 출역 안한 경우
          console.log('전월 초일 출역 안한 경우')
          if(oneMonths.length <= 7) { // 전월 첫출역일 ~ 전월 말일 출역 7일 이하인 경우
            console.log('전월 첫출역일 ~ 전월 말일 출역 7일 이하인 경우')
            if(oneMonths[0] === `2025-01-30` || oneMonths[0] === `2025-01-31`) { // 전월 첫 출역일 = 1월 30일 또는 1월 31일인 경우
              console.log('전월 첫 출역일 = 1월 30일 또는 1월 31일인 경우')
              const merged = [...oneMonths, ...thisMonths].sort();
              if(merged.length === 8) { // 전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일인 경우
                console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일인 경우')
                deductibles8.push(merged[7])
                deductiblesOver.push(...merged.slice(8))
              } else if(merged.length > 8) {
                console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일 초과인 경우')
                deductibles8.push(merged[7])
                deductiblesOver.push(...merged.slice(8))
              } else {
                console.log('전월 첫출역일 ~ 전월 말일 + 2월 1일 ~ 말일 출역 수 8일 미만인 경우')
                deductibles8.push(thisMonths[7])
                deductiblesOver.push(...thisMonths.slice(8))
              }
            } else { // 전월 첫 출역일 = 1월 30일 또는 1월 31일 아닌 경우
              console.log('전월 첫 출역일 = 1월 30일 또는 1월 31일 아닌 경우')
              const merged = [...oneMonths, ...thisMonths].sort();
              const firstOfOneMonth = oneMonths[0];
              const firstDate = new Date(firstOfOneMonth);
              const lastFromFirstDate = new Date(firstDate.getTime() + (30 * 24 * 60 * 60 * 1000));
              const filtered = merged.filter((item) => {
                const date = new Date(item);
                return date >= firstDate && date <= lastFromFirstDate;
              })
              if(filtered.length < 8) { // 전월 첫 ~ +30일 8일 미만
                console.log('전월 첫 ~ +30일 8일 미만')
                deductibles8.push(thisMonths[7])
                deductiblesOver.push(...thisMonths.slice(8))
              } else { // 전월 첫 ~ +30일 8일 이상
                console.log('전월 첫 ~ +30일 8일 이상')
                const filtered2 = thisMonths.filter((item) => {
                  const date = new Date(item);
                  const eighth = new Date(filtered[7]);
                  return date > eighth; // todo: 얘가 전월 8일째 여야 함
                })
                deductibles8.push(filtered[7])
                if(thisMonths.length >= 8) { // 당월 8일 이상
                  deductiblesOver.push(...filtered2)
                }
              }
            }
          } else { // 전월 첫출역일 ~ 전월 말일 출역 7일 초과인 경우
            console.log('전월 첫출역일 ~ 전월 말일 출역 7일 초과인 경우')
            deductibles8.push(thisMonths[7])
            deductiblesOver.push(...thisMonths.slice(8))
          }
        }
      }
    } else { // 전월 출역이 없는 경우
      console.log('전월 출역이 없는 경우')
      if(thisMonths[0] === `${parseInt(workMonth) === 2 ? 2025 : 2025}-${parseInt(workMonth)}-01`) { // 당월 초일 출역한 경우
        console.log('당월 초일 출역한 경우')
        deductibles8.push(thisMonths[7])
        deductiblesOver.push(...thisMonths.slice(8))
      } else { // 당월 초일 출역 안한 경우
        console.log('당월 초일 출역 안한 경우')
        deductibles8.push(thisMonths[7])
        deductiblesOver.push(...thisMonths.slice(8))
      }
    }

    return {
      'eight': deductibles8 ?? [],
      'over': deductiblesOver ?? [],
    };
  }, [workMonth])

  // 국민연금 공제 체크 로직
  const checkStateDeductibleDates = useCallback((dates) => {
    const lastThisMonths = dates[`2025-0${parseInt(workMonth)}`] ?? [];
    const thisMonths = lastThisMonths.sort();

    console.clear()
    console.log('국민연금 계산')

    const deductibles8 = [];
    const deductiblesOver = [];

    if(thisMonths.length === 0) {
      return {
        'eight': [],
        'over': []
      };
    }

    // 당월 출역 있는 경우
    if(thisMonths.length >= 8) { // 당월 8일 이상 출역
      console.log('당월 8일 이상 출역')

      let totalAmount = 0;
      let target = null; // 2200000 만원 달성된 대상
      let targetIndex = null;

      for(let i = 0; i <= thisMonths.length; i++) {
        totalAmount += parseInt(wage);
        if(totalAmount >= 2200000) {
          target = thisMonths[i];
          targetIndex = i;
          break;
        }
      }

      if(targetIndex !== null && targetIndex < 7) {
        console.log('8일 이상인데 220만원을 8일 전에 초과한 경우')
        const filtered = thisMonths.filter((item) => {
          const date = new Date(item);
          const eighth = new Date(thisMonths[targetIndex]);
          return date > eighth;
        })
        deductibles8.push(thisMonths[targetIndex]);
        deductiblesOver.push(...filtered);
        return {
          'eight': deductibles8,
          'over': deductiblesOver
        }
      }

      const filtered = thisMonths.filter((item) => {
        const date = new Date(item);
        const eighth = new Date(thisMonths[7]);
        return date > eighth;
      })
      deductibles8.push(thisMonths[7]);
      deductiblesOver.push(...filtered);
    } else { // 당월 8일 미만 출역
      console.log('당월 8일 미만 출역')
      let totalAmount = 0;
      let target = null; // 2200000 만원 달성된 대상
      let targetIndex = null;

      for(let i = 0; i < thisMonths.length; i++) {
        totalAmount += parseInt(wage);
        console.log(totalAmount)
        if(totalAmount >= 2200000) {
          target = thisMonths[i];
          targetIndex = i;
          break;
        }
      }

      if(target === thisMonths[targetIndex]){ // 220만원 달성된 날짜가 오늘인 경우
        deductibles8.push(thisMonths[targetIndex]);
      }

      if(thisMonths.length > targetIndex) { // 220만원 달성된 날짜가 오늘 이전인 경우
        const filtered = thisMonths.filter((item) => {
          const date = new Date(item);
          const eighth = new Date(thisMonths[targetIndex]);
          return date > eighth;
        })
        deductibles8.push(thisMonths[targetIndex]);
        deductiblesOver.push(...filtered);
      }
    }

    console.log(deductibles8, deductiblesOver)

    return {
      'eight': deductibles8,
      'over': deductiblesOver
    }
  }, [wage, workMonth]);

  useEffect(() => {
    const groupedDates = groupByYearMonth1(totalSelectedDates)

    const deductibleDates = checkDeductibleDates(groupedDates);
    setDeductibles(deductibleDates);

    const stateDeductibleDates = checkStateDeductibleDates(groupedDates);
    setStateDeductibles(stateDeductibleDates)
  }, [wage, workMonth, checkDeductibleDates, totalSelectedDates, checkStateDeductibleDates]);

  return <div style={{height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <button style={{width: '80px', height: '30px'}} onClick={reset}>reset</button>
      <select style={{width: '80px', height: '30px'}} value={parseInt(workMonth)} onChange={(e) => setWorkMonth(e.target.value)}>
        <option key={2} value={2}>2월</option>
        <option key={6} value={6}>6월</option>
      </select>
      <select style={{width: '130px', height: '30px'}} value={wage} onChange={(e) => setWage(parseInt(e.target.value))}>
        <option key={'150000'} value={150000}>150000 8일 발생</option>
        <option key={'370000'} value={370000}>370000 6일 발생</option>
        <option key={'550000'} value={550000}>550000 4일 발생</option>
      </select>
    </div>
    <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
      <h2>건강</h2>
      <Calendar
        deductibles={deductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={parseInt(workMonth) === 2 ? workYear - 1 : workYear}
        month={parseInt(workMonth) === 2 ? 12 : parseInt(workMonth) - 2}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={deductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={parseInt(workMonth) === 2 ? workYear : workYear}
        month={parseInt(workMonth) === 2 ? parseInt(workMonth) - 1 : parseInt(workMonth) - 1}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={deductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(workMonth)}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={deductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(parseInt(workMonth)) + 1}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={deductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(parseInt(workMonth)) + 2}
        currentMonth={parseInt(workMonth)} shade={false}/>
    </div>
    <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
      <h2>국민</h2>
      <Calendar
        deductibles={stateDeductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={parseInt(workMonth) === 2 ? workYear - 1 : workYear}
        month={parseInt(workMonth) === 2 ? 12 : parseInt(workMonth) - 2}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={stateDeductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={parseInt(workMonth) === 2 ? workYear : workYear}
        month={parseInt(workMonth) === 2 ? parseInt(workMonth) - 1 : parseInt(workMonth) - 1}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={stateDeductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(workMonth)}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={stateDeductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(parseInt(workMonth)) + 1}
        currentMonth={parseInt(workMonth)}/>
      <Calendar
        deductibles={stateDeductibles}
        totalSelectedDates={totalSelectedDates}
        setTotalDates={setTotalDates}
        year={workYear}
        month={parseInt(parseInt(workMonth)) + 2}
        currentMonth={parseInt(workMonth)} shade={false}/>
    </div>
  </div>
}

export default Page;