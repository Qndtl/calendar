# 건강보험 공제/환급 플로우차트

---

## 신규 공제 (new.js)

```mermaid
flowchart TD
    S[시작] --> A{"전월 있음?"}
    A -->|없음| B{"당월 초일 출역?"}
    B -->|X| Z1[비공제]
    B -->|O| CURR["당월 단독 판단"]
    A -->|있음| CURR
    CURR --> F{"당월 8일 이상?"}
    F -->|Y| R["당월 7번째 공제 및 초과분"]
    F -->|N| Z2[비공제]
```

---

## 신규 환급 (new.js v2)

> `합산`: sorted4=0이면 sorted3+sorted2, 아니면 sorted4+sorted3  
> `4개월전 기간` = 첫출역 ~ 첫출역+(해당월 일수-1)일 (초일이면 말일까지)  
> `3개월전 기간` = 첫출역 ~ 첫출역+(해당월 일수-1)일 (sorted2 날짜 포함 가능)  
> `allDates` = 4개월전 + 3개월전 + 2개월전

```mermaid
flowchart TD
    S[시작] --> A{"합산 8일 미만?\nsorted4=0: sorted3+sorted2\n그 외: sorted4+sorted3"}
    A -->|Y| A1{"공제내역?"}
    A1 -->|Y| REF[환급]
    A1 -->|N| NORE[비대상]
    A -->|N| B{"두 기간 모두 8일 미만?"}
    B -->|Y| B1{"공제내역?"}
    B1 -->|Y| REF
    B1 -->|N| NORE
    B -->|N| C{"4개월전 기간 8일 이상?"}
    C -->|Y| C1{"기간 종료일 이후 출역?"}
    C1 -->|Y| CCHK{"공제내역?"}
    C1 -->|N| REF
    CCHK -->|Y| AMT[금액비교]
    CCHK -->|N| DEDUCT[징수]
    C -->|N| D{"sorted5>0 또는 sorted4>0?"}
    D -->|Y| F{"sorted3 >= 8?"}
    F -->|Y| FCHK{"공제내역?"}
    FCHK -->|Y| AMT
    FCHK -->|N| DEDUCT
    F -->|N| REF
    D -->|N| E{"3개월전 기간 8일 이상?\n※sorted4=0일 때만 도달"}
    E -->|Y| E1{"기간 종료일 이후 출역?"}
    E1 -->|Y| ECHK{"공제내역?"}
    E1 -->|N| REF
    ECHK -->|Y| AMT
    ECHK -->|N| DEDUCT
    E -->|N| REF
```

---

## 기존 공제 (existing.js — 비교용)

```mermaid
flowchart TD
    S[시작] --> A{"전월 있음?"}
    A -->|없음| B{"당월 초일 출역?"}
    B -->|X| Z1[비공제]
    B -->|O| CURR["당월 단독 판단"]
    A -->|있음| C{"전전월 있음?"}
    C -->|Y| CURR
    C -->|N| D{"전월 초일 출역?"}
    D -->|Y| CURR
    D -->|N| E{"전월 첫출역 1.30 또는 1.31?"}
    E -->|Y| MERG["merged 기준 공제"]
    E -->|N| F{"inWindow 8일 이상?"}
    F -->|Y| MERG
    F -->|N| CURR
    CURR --> G{"당월 8일 이상?"}
    G -->|Y| R["당월 7번째 공제 및 초과분"]
    G -->|N| Z2[비공제]
```

> 신규 공제와의 차이: `전전월 있음`과 `전월 초일`을 별도 분기로 처리

---

## 기존 환급 (existing.js — 비교용)

```mermaid
flowchart TD
    S[시작] --> A{"4개월전 출역?"}

    A -->|없음| A1{"3개월전 초일 출역?"}
    A1 -->|O| A1a{"3개월전 8일 미만?"}
    A1a -->|Y| A1a1{"공제내역?"}
    A1a1 -->|Y| REF[환급]
    A1a1 -->|N| NORE[비대상]
    A1a -->|N| A1b{"3개월전 말일 출역?"}
    A1b -->|Y| AMT[금액비교]
    A1b -->|N| A1c{"2개월전 출역?"}
    A1c -->|Y| AMT
    A1c -->|N| A1d{"공제내역?"}
    A1d -->|Y| REF
    A1d -->|N| NORE

    A1 -->|X| A2{"3개월전 첫출역 1.30 또는 1.31?"}
    A2 -->|Y| A2a["merged = 3개월전 + 2개월전"]
    A2a --> A2b{"merged 8일 미만?"}
    A2b -->|Y| REF
    A2b -->|N| A2c{"2월 말일 출역?"}
    A2c -->|Y| AMT
    A2c -->|N| A2d{"1개월전 출역?"}
    A2d -->|Y| AMT
    A2d -->|N| REF

    A2 -->|N| A3{"3개월전 8일 이상?"}
    A3 -->|Y| A3a{"+30일 출역?"}
    A3a -->|Y| AMT
    A3a -->|N| A3b{"+31일부터 2개월전 출역?"}
    A3b -->|Y| AMT
    A3b -->|N| REF
    A3 -->|N| A4["filtered = 3+2개월전 window내"]
    A4 --> A4a{"filtered 8일 이상?"}
    A4a -->|Y| A4b{"+30일 출역?"}
    A4b -->|Y| AMT
    A4b -->|N| A4c{"+31일부터 2개월전 출역?"}
    A4c -->|Y| AMT
    A4c -->|N| A4d{"공제내역?"}
    A4d -->|Y| REF
    A4d -->|N| NORE
    A4a -->|N| A4e{"공제내역?"}
    A4e -->|Y| REF
    A4e -->|N| NORE

    A -->|있음| B{"5개월전 있음?"}
    B -->|Y| BC{"3개월전 8일 이상?"}
    B -->|N| C{"4개월전 초일 출역?"}
    C -->|Y| BC
    BC -->|Y| AMT
    BC -->|N| BC1{"공제내역?"}
    BC1 -->|Y| REF
    BC1 -->|N| NORE

    C -->|N| D{"4개월전 첫출역 1.30 또는 1.31?"}
    D -->|Y| D1["merged = 4개월전 + 3개월전"]
    D1 --> D2{"merged 8일 미만?"}
    D2 -->|Y| D3{"공제내역?"}
    D3 -->|Y| REF
    D3 -->|N| NORE
    D2 -->|N| D4{"3개월전 말일 출역?"}
    D4 -->|Y| AMT
    D4 -->|N| D5{"2개월전 출역?"}
    D5 -->|Y| AMT
    D5 -->|N| D6{"공제내역?"}
    D6 -->|Y| REF
    D6 -->|N| NORE

    D -->|N| E{"4개월전 8일 이상?"}
    E -->|Y| AMT

    E -->|N| F["filtered = 4+3개월전 window내"]
    F --> F1{"filtered 8일 이상?"}
    F1 -->|Y| F2{"+30일 출역?"}
    F2 -->|Y| AMT
    F2 -->|N| F3{"BUG +31일부터 3개월전 출역?"}
    F3 -->|Y| AMT
    F3 -->|N| F4{"공제내역?"}
    F4 -->|Y| REF
    F4 -->|N| NORE
    F1 -->|N| F5{"3개월전 8일 이상?"}
    F5 -->|Y| AMT
    F5 -->|N| F6{"공제내역?"}
    F6 -->|Y| REF
    F6 -->|N| NORE
```
