# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Architecture Overview

This is a Next.js 15 application that calculates Korean health insurance and pension deductions/refunds for construction workers. The app displays interactive calendars for date selection and real-time calculation results.

### Key Components

**Main Application Structure:**
- `src/app/page.js` - Main page component containing all business logic
- `src/components/Calendar.js` - Interactive calendar component with drag selection
- `src/app/Calendar.css` - Calendar styling with visual indicators

### Core Business Logic

**Date Selection System:**
- Workers can select dates with left-click (company ID 1) or right-click (company ID 2)
- Supports drag selection and individual date clicking
- Data structure: `{ companyId, workDate }` format

**Calculation Engine:**
The app calculates four main types:

1. **Health Insurance Deductions** (`calculateHealthInsuranceDeduction`)
    - Separate calculations for company 1 and 2
    - Based on 8-day thresholds and complex month-to-month rules
    - Handles special cases like January 30/31 start dates

2. **Pension Deductions** (`calculatePensionDeduction`)
    - Uses 2.2M KRW wage threshold logic
    - 8-day minimum work requirement

3. **Health Insurance Refunds** (`calculateHealthInsuranceRefund`)
    - Complex 5-month lookback logic with multiple edge cases
    - Separate processing for each company

4. **State Pension Refunds** (`calculateStatePensionRefund`)
    - Company-grouped processing with wage and day thresholds

### State Management Pattern

The main page uses multiple useState hooks with useEffect for reactive calculations:
```javascript
useEffect(() => {
  // Calculate deductions first
  const deductibleDates = checkDeductibleDates(data, companyId);
  
  // Then calculate refunds based on deductions
  const refundDates = checkRefundDates(data, deductibleDates, companyId);
}, [dependencies]);
```

**Important:** When modifying calculation functions, avoid circular dependencies in useCallback dependency arrays - this can cause infinite re-renders.

### Key Constants

- `PENSION_INCOME_THRESHOLD: 2200000` - KRW threshold for pension calculations
- `HEALTH_INSURANCE_THRESHOLD: 8` - Minimum days for health insurance
- Month offsets: -2, -1, 0, +1, +2 represent the 5-month calculation window

### Visual Indicators

- Black cells: 8th day deductions
- Grey cells: Over 8-day deductions
- Blue/Red borders: Company 1/2 distinctions
- Orange dots: Refund indicators
- Yellow highlighting: Current month selection

### Utility Functions

**Date Processing:**
- `groupDatesByYearMonth()` - Groups worker dates by company
- `getMonthKey()` - Calculates month keys with year rollover
- `isFirstDayOfMonth()` / `isLastDayOfMonth()` - Edge case detection

The business logic is heavily Korean labor law-specific with numerous edge cases for construction industry insurance calculations.