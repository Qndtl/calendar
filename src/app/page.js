"use client"
import './Calendar.css';
import Calendar from "@/components/Calendar";
import {useEffect, useState} from "react";

const Page = () => {
  const workMonth = 6;
  const [selectedDates, setSelectedDates] = useState(new Set);

  const setTotalDates = (dates) => {
    setSelectedDates(dates)
  }

  return <>
    <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
      <h2>지급</h2>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth - 2} currentMonth={workMonth}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth - 1} currentMonth={workMonth}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth} currentMonth={workMonth}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth + 1} currentMonth={workMonth} shade={true}/>
    </div>
    <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
      <h2>환급</h2>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth - 3} currentMonth={workMonth - 1} shade={false}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth - 2} currentMonth={workMonth - 1}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth - 1} currentMonth={workMonth - 1}/>
      <Calendar totalSelectedDates={selectedDates} setTotalDates={setTotalDates} year={2025} month={workMonth} currentMonth={workMonth - 1}/>
    </div>
  </>
}

export default Page;