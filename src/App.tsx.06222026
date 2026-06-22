import React, { useState, useMemo } from "react";

// 2026 Federal ordinary income brackets MFJ (estimated)
const FED_BRACKETS = [
  { min: 0,        max: 23850,   rate: 0.10 },
  { min: 23850,    max: 96950,   rate: 0.12 },
  { min: 96950,    max: 206700,  rate: 0.22 },
  { min: 206700,   max: 394600,  rate: 0.24 },
  { min: 394600,   max: 501050,  rate: 0.32 },
  { min: 501050,   max: 751600,  rate: 0.35 },
  { min: 751600,   max: Infinity,rate: 0.37 },
];
const FED_STD_MFJ      = 34700;  // $30,000 base + $1,600×2 existing senior add-on (both 65+)
const OBBBA_PER_PERSON = 6000;   // 2025-2028, up to $6,000 per qualifying senior
const OBBBA_PHASEOUT_START_MFJ = 150000;
const OBBBA_PHASEOUT_RATE      = 0.06;  // 6 cents per dollar over threshold

// OBBBA senior deduction — phases out 6% per dollar above $150K MAGI (MFJ)
// numSeniors = number of spouses age 65+ (1 or 2)
function obbbaDed(magi, numSeniors) {
  const perPerson = Math.max(0, OBBBA_PER_PERSON - OBBBA_PHASEOUT_RATE * Math.max(0, magi - OBBBA_PHASEOUT_START_MFJ));
  return perPerson * numSeniors;
}

// 2026 Federal LTCG brackets MFJ (estimated)
const LTCG_BRACKETS = [
  { min: 0,        max: 96700,   rate: 0.00 },
  { min: 96700,    max: 600050,  rate: 0.15 },
  { min: 600050,   max: Infinity,rate: 0.20 },
];

// NJ brackets MFJ
const NJ_BRACKETS = [
  { min: 0,        max: 20000,   rate: 0.01400 },
  { min: 20000,    max: 50000,   rate: 0.01750 },
  { min: 50000,    max: 70000,   rate: 0.02450 },
  { min: 70000,    max: 80000,   rate: 0.03500 },
  { min: 80000,    max: 150000,  rate: 0.05525 },
  { min: 150000,   max: 500000,  rate: 0.06370 },
  { min: 500000,   max: Infinity,rate: 0.08970 },
];
const NJ_EXEMPTION = 4000;
const NJ_RIE_MAX   = 100000; // NJ Retirement Income Exclusion MFJ max
const NJ_RIE_CLIFF = 150000; // No exclusion above this income

function calcTax(income, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return Math.max(0, tax);
}

// Federal tax with LTCG preferential rates + OBBBA senior deduction
function calcFedTax(ordinaryIncome, ltcgIncome, magi, numSeniors) {
  const obbba      = obbbaDed(magi, numSeniors);
  const ordTaxable = Math.max(0, ordinaryIncome - FED_STD_MFJ - obbba);
  const ordTax     = calcTax(ordTaxable, FED_BRACKETS);
  const ltcgTax    = calcTax(ordTaxable + ltcgIncome, LTCG_BRACKETS) - calcTax(ordTaxable, LTCG_BRACKETS);
  return ordTax + Math.max(0, ltcgTax);
}

// Net Investment Income Tax — 3.8% on NII when MAGI > $250K (MFJ)
const NIIT_THRESHOLD_MFJ = 250000;
const NIIT_RATE = 0.038;
function calcNIIT(magi, nii) {
  if (magi <= NIIT_THRESHOLD_MFJ) return 0;
  // NIIT applies to lesser of NII or amount of MAGI over threshold
  return Math.max(0, Math.min(nii, magi - NIIT_THRESHOLD_MFJ)) * NIIT_RATE;
}


function njRIEFraction(totalIncome) {
  if (totalIncome <  100000) return 1.00;
  if (totalIncome <  125000) return 0.50;
  if (totalIncome <  150000) return 0.25;
  return 0;
}

// NJ tax with RIE phase-out
function calcNJTax(totalNJIncome, annuityIncome) {
  const rieFrac = njRIEFraction(totalNJIncome);
  const rie     = Math.min(annuityIncome, NJ_RIE_MAX) * rieFrac;
  const taxable = Math.max(0, totalNJIncome - rie - NJ_EXEMPTION);
  return calcTax(taxable, NJ_BRACKETS);
}

// Annualization periods: cumulative Jan 1 through end of period
const PERIODS = [
  { label: "Q1", range: "Jan–Mar",  months: 3,  factor: 4.0,  due: "Apr 15, 2026",  wFrac: 3/12  },
  { label: "Q2", range: "Apr–May",  months: 5,  factor: 2.4,  due: "Jun 16, 2026",  wFrac: 5/12  },
  { label: "Q3", range: "Jun–Aug",  months: 8,  factor: 1.5,  due: "Sep 15, 2026",  wFrac: 8/12  },
  { label: "Q4", range: "Sep–Dec",  months: 12, factor: 1.0,  due: "Jan 15, 2027",  wFrac: 12/12 },
];

const fmt = n => {
  const abs = Math.abs(n);
  const str = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `($${str})` : `$${str}`;
};

// IRS 2026 estimated tax due dates and filing deadline
const DUE_DATES = [
  new Date(2026, 3, 15),  // Apr 15, 2026 — Q1
  new Date(2026, 5, 16),  // Jun 16, 2026 — Q2
  new Date(2026, 8, 15),  // Sep 15, 2026 — Q3
  new Date(2027, 0, 15),  // Jan 15, 2027 — Q4
];
const FILING_DATE = new Date(2027, 3, 15); // Apr 15, 2027

// Underpayment penalty estimator (IRS Form 2210 equal-installment method)
// Penalty accrues from each due date until the cumulative shortfall is resolved
function calcUnderpaymentPenalty(fedPaid, withholding, fedSHTot, rate = 0.07) {
  // Cumulative required at end of each quarter (withholding credited ratably)
  const cumReq  = PERIODS.map((p, i) => (i + 1) / 4 * fedSHTot);
  const cumPaid = PERIODS.map((p, i) =>
    fedPaid.slice(0, i + 1).reduce((s, v) => s + v, 0) + withholding * p.wFrac
  );

  let totalPenalty = 0;
  const details = PERIODS.map((_, i) => {
    const shortfall = Math.max(0, cumReq[i] - cumPaid[i]);
    if (shortfall <= 0) return { shortfall: 0, days: 0, penalty: 0 };

    // Find when this cumulative shortfall is first resolved by a future payment
    let resolvedDate = FILING_DATE;
    for (let j = i + 1; j < 4; j++) {
      if (cumPaid[j] >= cumReq[i]) { resolvedDate = DUE_DATES[j]; break; }
    }
    const days    = Math.round((resolvedDate.getTime() - DUE_DATES[i].getTime()) / 86400000);
    const penalty = shortfall * rate * days / 365;
    totalPenalty += penalty;
    return { shortfall, days, penalty };
  });

  return { totalPenalty, details };
}

function calcAllMethods({ annuity, niitAnnuity, divByQ, ss, ltcgByQ, stByQ, conversions, priorFed, priorNJ, withholding, numSeniors, fedPaid, njPaid, penaltyRate }) {
  const ssTaxable     = ss * 0.85;
  const totalDiv      = divByQ.reduce((s, v) => s + v, 0);
  const totalLTCG     = ltcgByQ.reduce((s, v) => s + v, 0);
  const totalST       = stByQ.reduce((s, v) => s + v, 0);  // net short-term (can be negative)
  const totalConversion = conversions.reduce((s, v) => s + v, 0);

  // Cumulative per-quarter income through end of period i
  const convCum  = PERIODS.map((_, i) => conversions.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const divCum   = PERIODS.map((_, i) => divByQ.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const ltcgCum  = PERIODS.map((_, i) => ltcgByQ.slice(0, i + 1).reduce((s, v) => s + v, 0));
  const stCum    = PERIODS.map((_, i) => stByQ.slice(0, i + 1).reduce((s, v) => s + v, 0));

  // Full-year income totals
  // Short-term gains are ordinary income; LTCG get preferential rates
  const regOrdFed   = annuity + totalDiv + ssTaxable + Math.max(0, totalST);
  const totalOrdFed = regOrdFed + totalConversion;
  // LTCG can offset ST losses (net them first, remainder goes to LTCG bracket)
  const netLTCG     = Math.max(0, totalLTCG + Math.min(0, totalST)); // ST loss offsets LTCG
  const regMAGI     = regOrdFed + netLTCG;
  const totalMAGI   = totalOrdFed + netLTCG;

  // Full year federal tax
  const fullFedTax = calcFedTax(totalOrdFed, netLTCG, totalMAGI, numSeniors)
    + calcNIIT(totalMAGI, niitAnnuity + totalDiv + netLTCG);
  const regFedTax  = calcFedTax(regOrdFed,   netLTCG, regMAGI,   numSeniors)
    + calcNIIT(regMAGI,  niitAnnuity + totalDiv + netLTCG);

  // OBBBA deduction amounts for display
  const obbbaFull = obbbaDed(totalMAGI, numSeniors);
  const obbbaReg  = obbbaDed(regMAGI,   numSeniors);

  // NJ income (SS exempt; both LT and ST gains taxed as ordinary in NJ)
  const totalNJGains = totalLTCG + totalST; // NJ doesn't distinguish
  const regNJInc     = annuity + totalDiv + totalNJGains;
  const totalNJInc   = regNJInc + totalConversion;

  // Full year NJ tax with RIE
  const fullNJTax = calcNJTax(totalNJInc, annuity);
  const regNJTax  = calcNJTax(regNJInc,   annuity);

  const njCliff = regNJInc < NJ_RIE_CLIFF && totalNJInc >= NJ_RIE_CLIFF;
  // RIE info for display
  const rieFracFull   = njRIEFraction(totalNJInc);
  const rieFracReg    = njRIEFraction(regNJInc);
  const rieApplied    = Math.min(annuity, NJ_RIE_MAX) * rieFracFull;
  const rieAppliedReg = Math.min(annuity, NJ_RIE_MAX) * rieFracReg;
  const riePct        = Math.round(rieFracFull * 100);

  // Safe Harbor — lesser of: 110% prior year OR 90% current year (federal)
  const fedSH_priorYr  = priorFed * 1.10;
  const fedSH_currYr   = fullFedTax * 0.90;
  const fedSHTot       = Math.min(fedSH_priorYr, fedSH_currYr);
  const fedSHMethod    = fedSH_currYr < fedSH_priorYr ? "90% of 2026 tax" : "110% of 2025 tax";
  // NJ: lesser of 100% prior year OR 80% current year
  const njSH_priorYr   = priorNJ * 1.00;
  const njSH_currYr    = fullNJTax * 0.80;
  const njSHTot        = Math.min(njSH_priorYr, njSH_currYr);
  const njSHMethod     = njSH_currYr < njSH_priorYr ? "80% of 2026 NJ tax" : "100% of 2025 NJ tax";
  // Safe Harbor = 4 equal installments of the annual target (timing-blind by design)
  const fedSHQ        = Math.max(0, fedSHTot - withholding) / 4;
  const njSHQ         = njSHTot / 4;
  const shBalFed      = Math.max(0, fullFedTax - withholding - fedSHTot);
  const shBalNJ       = Math.max(0, fullNJTax  - njSHTot);
  const fedSHPayments = [fedSHQ, fedSHQ, fedSHQ, fedSHQ + shBalFed];
  const njSHPayments  = [njSHQ,  njSHQ,  njSHQ,  njSHQ  + shBalNJ];

  // Annualized Minimum (Schedule AI) — raw IRS formula, no artificial cap
  // Each period: annualize YTD income × factor, compute tax, × cumulative fraction
  // Adding Q4 income never affects Q1/Q2/Q3 because convCum/ltcgCum/stCum are cumulative
  const ANN_FRACS = [0.225, 0.45, 0.675, 0.90];
  const annCumFed = PERIODS.map((p, i) => {
    const annuityYTD  = annuity * (p.months / 12);
    const ssYTD       = ssTaxable * (p.months / 12);
    const ytdST       = stCum[i];
    const ytdOrd      = annuityYTD + ssYTD + divCum[i] + Math.max(0, ytdST) + convCum[i];
    const ytdNetLTCG  = Math.max(0, ltcgCum[i] + Math.min(0, ytdST));
    const annOrd      = ytdOrd     * p.factor;
    const annLTCG     = ytdNetLTCG * p.factor;
    const annDiv      = divCum[i]  * p.factor;
    const annNIITAnn  = niitAnnuity * (p.months / 12) * p.factor;  // prorated then annualized
    const annMAGI     = annOrd + annLTCG;
    const annTax      = calcFedTax(annOrd, annLTCG, annMAGI, numSeniors)
                      + calcNIIT(annMAGI, annNIITAnn + annDiv + annLTCG);
    return Math.max(0, annTax * ANN_FRACS[i] - withholding * p.wFrac);
  });
  const annCumNJ = PERIODS.map((p, i) => {
    const annuityYTD  = annuity * (p.months / 12);
    const ytdNJGains  = ltcgCum[i] + stCum[i];
    const ytdNJ       = annuityYTD + divCum[i] + ytdNJGains + convCum[i];
    const annNJInc    = ytdNJ      * p.factor;
    const annAnnuity  = annuityYTD * p.factor;
    const annTax      = calcNJTax(annNJInc, annAnnuity);
    return Math.max(0, annTax * ANN_FRACS[i]);
  });
  const annPayFed    = annCumFed.map((c, i) => Math.max(0, c - (i > 0 ? annCumFed[i-1] : 0)));
  const annPayNJ     = annCumNJ.map((c, i)  => Math.max(0, c - (i > 0 ? annCumNJ[i-1]  : 0)));
  const annBalFed    = Math.max(0, fullFedTax - withholding - annPayFed.reduce((s,v)=>s+v,0));
  const annBalNJ     = Math.max(0, fullNJTax  - annPayNJ.reduce((s,v)=>s+v,0));
  const annPayFedAdj = annPayFed.map((v, i) => i === 3 ? v + annBalFed : v);
  const annPayNJAdj  = annPayNJ.map((v, i)  => i === 3 ? v + annBalNJ  : v);

  // Full Coverage — pay actual tax on income as received each period
  const fcCumFed = PERIODS.map((p, i) => {
    const annuityYTD = annuity * (p.months / 12);
    const ssYTD      = ssTaxable * (p.months / 12);
    const ytdST      = stCum[i];
    const ytdOrd     = annuityYTD + ssYTD + divCum[i] + Math.max(0, ytdST) + convCum[i];
    const ytdNetLTCG = Math.max(0, ltcgCum[i] + Math.min(0, ytdST));
    const ytdMAGI    = ytdOrd + ytdNetLTCG;
    const ytdNIITAnn  = niitAnnuity * (p.months / 12);
    return calcFedTax(ytdOrd, ytdNetLTCG, ytdMAGI, numSeniors)
         + calcNIIT(ytdMAGI, ytdNIITAnn + divCum[i] + ytdNetLTCG);
  });
  const fcCumNJ = PERIODS.map((p, i) => {
    const annuityYTD = annuity * (p.months / 12);
    const ytdNJGains = ltcgCum[i] + stCum[i];
    const ytdNJ      = annuityYTD + divCum[i] + ytdNJGains + convCum[i];
    return calcNJTax(ytdNJ, annuityYTD);
  });
  const fcPayFed = fcCumFed.map((c, i) => {
    const wPrev = withholding * (i > 0 ? PERIODS[i-1].wFrac : 0);
    const wCurr = withholding * PERIODS[i].wFrac;
    return Math.max(0, c - (i > 0 ? fcCumFed[i-1] : 0) - (wCurr - wPrev));
  });
  const fcPayNJ  = fcCumNJ.map((c, i) => Math.max(0, c - (i > 0 ? fcCumNJ[i-1] : 0)));
  const fcBalFed = Math.max(0, fullFedTax - withholding - fcPayFed.reduce((s,v)=>s+v,0));
  const fcBalNJ  = Math.max(0, fullNJTax  - fcPayNJ.reduce((s,v)=>s+v,0));
  const fcPayFedAdj = fcPayFed.map((v, i) => i === 3 ? v + fcBalFed : v);
  const fcPayNJAdj  = fcPayNJ.map((v, i)  => i === 3 ? v + fcBalNJ  : v);

  const fedPaidTotal  = fedPaid.reduce((s, v) => s + v, 0);
  const njPaidTotal   = njPaid.reduce((s, v) => s + v, 0);
  const fedBalanceDue = fullFedTax - withholding - fedPaidTotal;
  const njBalanceDue  = fullNJTax  - njPaidTotal;

  // Underpayment penalty — based on actual fedPaid vs. required safe harbor installments
  const penalty = (fedPaidTotal > 0)
    ? calcUnderpaymentPenalty(fedPaid, withholding, fedSHTot, penaltyRate ?? 0.07)
    : null;

  // Safe Harbor 110% of prior year — fixed flat payments, never changes with current income
  const fedSH110Q        = Math.max(0, priorFed * 1.10 - withholding) / 4;
  const njSH110Q         = priorNJ * 1.00 / 4;  // NJ: 100% of prior year
  const fedSH110Payments = [fedSH110Q, fedSH110Q, fedSH110Q, fedSH110Q];
  const njSH110Payments  = [njSH110Q,  njSH110Q,  njSH110Q,  njSH110Q];

  return {
    totalFedAGI: totalMAGI, totalNJInc, fullFedTax, fullNJTax, njCliff,
    rieApplied, rieAppliedReg, riePct, obbbaFull, obbbaReg,
    fedSHQ, njSHQ, fedSHTot, njSHTot,
    fedSHMethod, njSHMethod, fedSHPayments, njSHPayments,
    fedSH_priorYr, fedSH_currYr, njSH_priorYr, njSH_currYr,
    shBalFed, shBalNJ,
    fedSH110Payments, njSH110Payments, fedSH110Q, njSH110Q,
    annPayFed: annPayFedAdj, annPayNJ: annPayNJAdj,
    annTotFed: annPayFedAdj.reduce((s,v)=>s+v,0),
    annTotNJ:  annPayNJAdj.reduce((s,v)=>s+v,0),
    fcPayFed: fcPayFedAdj, fcPayNJ: fcPayNJAdj,
    fcTotFed: fcPayFedAdj.reduce((s,v)=>s+v,0),
    fcTotNJ:  fcPayNJAdj.reduce((s,v)=>s+v,0),
    fedPaidTotal, njPaidTotal, fedBalanceDue, njBalanceDue, penalty,
  };
}

const C = {
  bg: "#f5efe6", panel: "#faf7f2", dark: "#2d1f0e",
  mid: "#6b4f2e", light: "#c4a882", border: "#e8dfd0",
  gold: "#f0c070", green: "#3d6020", red: "#a02010", orange: "#c07830",
  sh: "#8B6914", sh110: "#5a7a3a", ann: "#3d6020", fc: "#1a4a7a",
};

function NumInput({ label, value, setter, note, allowNegative = false }) {
  const [localVal, setLocalVal] = useState(String(value));
  const [focused,  setFocused]  = useState(false);

  const formatDisplay = v => {
    if (v === 0) return "0.00";
    const abs = Math.abs(v);
    const str = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `-${str}` : str;
  };

  const display = focused ? localVal : formatDisplay(value);
  const isNeg   = value < 0;

  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
        {note && <div style={{ fontSize: 10, color: C.light }}>{note}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", background: "white", border: `1px solid ${isNeg ? C.green : C.border}`, borderRadius: 6 }}>
        <span style={{ padding: "7px 8px 7px 10px", color: isNeg ? C.green : C.light, fontSize: 13, fontWeight: 700 }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={e => {
            setFocused(true);
            setLocalVal(value === 0 ? "" : String(value));
            e.target.select();
          }}
          onChange={e => {
            let cleaned = e.target.value;
            // Strip invalid chars
            cleaned = allowNegative ? cleaned.replace(/[^0-9.\-]/g, "") : cleaned.replace(/[^0-9.]/g, "");
            // Only one minus at start
            if (allowNegative) cleaned = cleaned.replace(/(?!^)-/g, "");
            // Only one decimal point, max 2 places
            const parts = cleaned.split(".");
            if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
            if (parts[1] !== undefined && parts[1].length > 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);
            setLocalVal(cleaned);
            const num = parseFloat(cleaned);
            setter(isNaN(num) ? 0 : num);
          }}
          onBlur={() => { setFocused(false); setLocalVal(String(value)); }}
          style={{ flex: 1, padding: "7px 8px 7px 0", border: "none", background: "transparent", outline: "none",
            fontSize: 14, color: isNeg ? C.green : C.dark, fontFamily: "'Georgia',serif" }}
        />
      </div>
    </div>
  );
}

function QTable({ title, sh110Payments, payments1, payments3, tot1, tot2, tot3, convQs, paid, withh, shLabel }) {
  const cols      = [shLabel || "SH 110% Prior Year", "Annualized Min", "Full Coverage"];
  const colColors = [C.sh110, C.ann, C.fc];
  const colSubs   = ["flat · penalty-safe · fixed", "schedule AI · low Q1–Q3", "pays full year tax"];
  const totals    = [tot1, tot2, tot3];
  const wh        = withh || 0;
  const totalPaid = paid.reduce((s, v) => s + v, 0);
  const hasPaid   = totalPaid > 0;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <div style={{ background: "white", borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 14px", background: "#f0e8d8", fontSize: 11, color: C.mid, fontWeight: 700, textTransform: "uppercase" }}>Period</th>
              <th style={{ textAlign: "center", padding: "10px 14px", background: "#f0e8d8", fontSize: 11, color: C.mid, fontWeight: 700 }}>Due</th>
              {cols.map((c, ci) => (
                <th key={ci} style={{ textAlign: "right", padding: "10px 14px", background: colColors[ci], color: "white", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {c}<br /><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>{colSubs[ci]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p, i) => {
              const isConv = convQs[i];
              const isQ4   = i === 3;
              const paidQ  = paid[i];
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: isConv ? "#fffaf0" : "white" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ display: "inline-block", width: 28, height: 28, lineHeight: "28px", textAlign: "center", borderRadius: 5,
                      background: isConv ? C.dark : "#f0e8d8", color: isConv ? C.gold : C.mid, fontWeight: 700, fontSize: 11, marginRight: 8 }}>{p.label}</span>
                    <span style={{ fontSize: 12, color: C.mid }}>{p.range}</span>
                    {isConv && <span style={{ fontSize: 10, color: C.orange, fontWeight: 700, marginLeft: 6 }}>↑ CONVERSION</span>}
                    {isQ4 && !isConv && <span style={{ fontSize: 10, color: C.mid, marginLeft: 6 }}>incl. balance</span>}
                  </td>
                  <td style={{ textAlign: "center", padding: "11px 14px", fontSize: 11, color: C.mid }}>
                    {p.due}
                    {paidQ > 0 && <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginTop: 2 }}>paid {fmt(paidQ)}</div>}
                  </td>
                  {[sh110Payments[i], payments1[i], payments3[i]].map((v, ci) => (
                    <td key={ci} style={{ textAlign: "right", padding: "11px 14px", fontWeight: (isConv || isQ4) ? 700 : 400,
                      color: colColors[ci], fontFamily: "monospace", fontSize: 13 }}>{fmt(v)}</td>
                  ))}
                </tr>
              );
            })}
            <tr style={{ background: "#f0e8d8", borderTop: `2px solid ${C.border}` }}>
              <td colSpan={2} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 12, color: C.dark }}>Full-year total</td>
              {totals.map((v, ci) => (
                <td key={ci} style={{ textAlign: "right", padding: "10px 14px", fontWeight: 700, fontFamily: "monospace", fontSize: 13, color: colColors[ci] }}>{fmt(v)}</td>
              ))}
            </tr>
            {hasPaid && (
              <tr style={{ background: "#f5f0e8", borderTop: `1px solid ${C.border}` }}>
                <td colSpan={2} style={{ padding: "9px 14px", fontSize: 11, color: C.mid }}>
                  <span style={{ fontWeight: 700 }}>Paid so far: </span>
                  <span style={{ color: C.green, fontWeight: 700, fontFamily: "monospace" }}>{fmt(totalPaid)}</span>
                  {wh > 0 && <span style={{ color: C.mid }}> + {fmt(wh)} withholding</span>}
                </td>
                {totals.map((t, ci) => {
                  const bal = t - wh - totalPaid;
                  const isRefund = bal < 0;
                  return (
                    <td key={ci} style={{ textAlign: "right", padding: "9px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                      color: isRefund ? "#1a3a7a" : Math.abs(bal) < 1 ? C.green : C.red }}>
                      {isRefund ? `${fmt(-bal)} refund` : Math.abs(bal) < 1 ? "✓ even" : `${fmt(bal)} still owed`}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [annuity,     setAnnuity]     = useState(31195);
  const [niitAnnuity, setNiitAnnuity] = useState(18324);  // $1,527/mo × 12, code D box 7
  const [divByQ,      setDivByQ]      = useState([3772, 1544, 4276, 4437]);
  const [ss,          setSS]          = useState(0);
  const [ltcgByQ,     setLtcgByQ]     = useState([13000, 0, 0, 0]);
  const [stByQ,       setStByQ]       = useState([-243.26, 0, 0, 0]);
  const [conversions, setConversions] = useState([100000, 0, 0, 0]);
  const [priorFed,    setPriorFed]    = useState(34421);
  const [priorNJ,     setPriorNJ]     = useState(9146);
  const [withholding, setWithholding] = useState(0);
  const [numSeniors,  setNumSeniors]  = useState(2);
  const [fedPaid,     setFedPaid]     = useState([0, 0, 0, 0]);
  const [njPaid,      setNJPaid]      = useState([0, 0, 0, 0]);
  const [penaltyRate, setPenaltyRate] = useState(7.0); // percent, e.g. 7.0 = 7%

  const setConvQ    = (i, val) => setConversions(prev => prev.map((v, j) => j === i ? val : v));
  const setDivQ     = (i, val) => setDivByQ(prev => prev.map((v, j) => j === i ? val : v));
  const setLtcgQ    = (i, val) => setLtcgByQ(prev => prev.map((v, j) => j === i ? val : v));
  const setStQ      = (i, val) => setStByQ(prev => prev.map((v, j) => j === i ? val : v));
  const setFedPaidQ = (i, val) => setFedPaid(prev => prev.map((v, j) => j === i ? val : v));
  const setNJPaidQ  = (i, val) => setNJPaid(prev => prev.map((v, j) => j === i ? val : v));

  const convQs           = conversions.map(v => v > 0);
  const totalConvDisplay = conversions.reduce((s, v) => s + v, 0);
  const totalDivDisplay  = divByQ.reduce((s, v) => s + v, 0);
  const totalLTCGDisplay = ltcgByQ.reduce((s, v) => s + v, 0);
  const totalSTDisplay   = stByQ.reduce((s, v) => s + v, 0);

  const r = useMemo(() => calcAllMethods({ annuity, niitAnnuity, divByQ, ss, ltcgByQ, stByQ, conversions, priorFed, priorNJ, withholding, numSeniors, fedPaid, njPaid, penaltyRate: penaltyRate / 100 }),
    [annuity, niitAnnuity, divByQ, ss, ltcgByQ, stByQ, conversions, priorFed, priorNJ, withholding, numSeniors, fedPaid, njPaid, penaltyRate]);

  return (
    <div style={{ fontFamily: "'Georgia',serif", minHeight: "100vh", background: C.bg, color: C.dark }}>
      <div style={{ background: C.dark, padding: "18px 28px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.bg }}>2026 Estimated Tax Planner</div>
        <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>Roth Conversion · Quarterly Payments · Federal & New Jersey</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", minHeight: "calc(100vh - 62px)" }}>

        {/* INPUTS */}
        <div style={{ background: C.panel, borderRight: `1px solid ${C.border}`, padding: "18px 16px", overflowY: "auto" }}>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>2026 Income</div>
          <NumInput label="Annuity (annual)" value={annuity} setter={setAnnuity} note="prorated evenly" />
          <NumInput label="NIIT Annuity (1099-R box 7 code D)" value={niitAnnuity} setter={setNiitAnnuity} note="annual · Form 8960 line 3" />
          <NumInput label="Social Security"  value={ss}      setter={setSS}      note="85% fed / 0% NJ" />

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, marginTop: 8 }}>Dividends & Interest by Quarter</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 8 }}>Enter actual received each period · Total: <strong>{fmt(totalDivDisplay)}</strong></div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range})`} value={divByQ[i]} setter={val => setDivQ(i, val)} />
          ))}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, marginTop: 8 }}>Long-Term Capital Gains by Quarter</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 8 }}>Federal LTCG rates (0/15/20%) · NJ ordinary · Total: <strong>{fmt(totalLTCGDisplay)}</strong></div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range})`} value={ltcgByQ[i]} setter={val => setLtcgQ(i, val)} allowNegative={true} />
          ))}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, marginTop: 8 }}>Short-Term Gains / Losses by Quarter</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 8 }}>
            Ordinary income rate · Negative = loss · Net: <strong style={{ color: totalSTDisplay < 0 ? C.green : C.dark }}>{fmt(totalSTDisplay)}</strong>
          </div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range})`} value={stByQ[i]} setter={val => setStQ(i, val)} allowNegative={true} />
          ))}

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Roth Conversions by Quarter</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 10 }}>Enter conversion amount in each quarter — leave $0 if none</div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range})`} value={conversions[i]} setter={val => setConvQ(i, val)} />
          ))}
          {totalConvDisplay > 0 && (
            <div style={{ background: "#f0e8d8", borderRadius: 7, padding: "8px 12px", fontSize: 11, color: C.mid, marginBottom: 4 }}>
              Total conversion: <strong style={{ color: C.dark }}>{fmt(totalConvDisplay)}</strong>
              {conversions.filter(v => v > 0).length > 1 && (
                <span style={{ marginLeft: 6, color: C.orange, fontWeight: 700 }}>
                  · {conversions.filter(v => v > 0).length} quarters
                </span>
              )}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>OBBBA Senior Deduction (2025–2028)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 7 }}>Qualifying seniors age 65+</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[1, 2].map(n => (
              <button key={n} onClick={() => setNumSeniors(n)} style={{
                padding: "8px 6px", borderRadius: 7,
                border: numSeniors === n ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                background: numSeniors === n ? C.dark : "white",
                color: numSeniors === n ? C.gold : C.mid,
                cursor: "pointer", fontFamily: "'Georgia',serif", fontWeight: 700, fontSize: 13,
              }}>{n === 1 ? "1 Senior" : "2 Seniors"}</button>
            ))}
          </div>
          <div style={{ background: "#f0f8e8", border: "1px solid #a0c870", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#3d6020", marginBottom: 4 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>OBBBA deduction: {fmt(r.obbbaFull)}</div>
            <div style={{ opacity: 0.85 }}>Std deduction: $34,700 · OBBBA: {fmt(r.obbbaFull)} · Total: {fmt(34700 + r.obbbaFull)}</div>
            {r.obbbaFull < numSeniors * 6000 && <div style={{ marginTop: 3, color: "#8B6914", fontWeight: 600 }}>⚠ Partially phased out (MAGI {fmt(r.totalFedAGI)} &gt; $150K)</div>}
            {r.obbbaFull === 0 && <div style={{ marginTop: 3, color: C.red, fontWeight: 600 }}>✗ Fully phased out (MAGI &gt; $250K)</div>}
          </div>
          <NumInput label="2025 Federal Tax"     value={priorFed}    setter={setPriorFed} />
          <NumInput label="2025 NJ Tax"          value={priorNJ}     setter={setPriorNJ} />
          <NumInput label="2026 Fed Withholding" value={withholding} setter={setWithholding} note="from annuity etc." />

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>2026 Estimated Payments Made</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 10 }}>Enter what you've actually paid each quarter</div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Federal</div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range}) — due ${p.due}`} value={fedPaid[i]} setter={val => setFedPaidQ(i, val)} />
          ))}

          <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, marginTop: 8 }}>New Jersey</div>
          {PERIODS.map((p, i) => (
            <NumInput key={i} label={`${p.label} (${p.range}) — due ${p.due}`} value={njPaid[i]} setter={val => setNJPaidQ(i, val)} />
          ))}

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.light, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Penalty Rate</div>
          <div style={{ fontSize: 10, color: C.light, marginBottom: 8 }}>IRS underpayment rate = Fed short-term + 3% (currently ~7%)</div>
          <div style={{ display: "flex", alignItems: "center", background: "white", border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 10 }}>
            <input
              type="number" min="1" max="15" step="0.25"
              value={penaltyRate}
              onChange={e => setPenaltyRate(parseFloat(e.target.value) || 7)}
              style={{ flex: 1, padding: "7px 8px 7px 10px", border: "none", background: "transparent", outline: "none",
                fontSize: 14, color: C.dark, fontFamily: "'Georgia',serif" }}
            />
            <span style={{ padding: "7px 10px 7px 4px", color: C.light, fontSize: 13, fontWeight: 700 }}>%</span>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {[["Fed AGI", r.totalFedAGI], ["NJ Income", r.totalNJInc], ["Full Fed Tax", r.fullFedTax], ["Full NJ Tax", r.fullNJTax]].map(([lbl, val]) => (
              <div key={lbl} style={{ background: C.dark, borderRadius: 7, padding: "9px 11px" }}>
                <div style={{ fontSize: 10, color: C.light, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{lbl}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, marginTop: 3 }}>{fmt(val)}</div>
              </div>
            ))}
          </div>

          {r.njCliff && (
            <div style={{ marginTop: 12, background: "#fff3cd", border: "1px solid #f0c060", borderRadius: 7, padding: "10px 12px", fontSize: 11, color: "#7a5c00", lineHeight: 1.6 }}>
              ⚠ <strong>NJ RIE lost:</strong> Conversion pushes NJ income over $150K — full exclusion eliminated. Consider sizing conversion to stay below $150K (full), $125K (25% excl.), or $100K (50% excl.).
            </div>
          )}
          {!r.njCliff && r.rieApplied > 0 && (
            <div style={{ marginTop: 12, background: "#f0f8e8", border: "1px solid #a0c870", borderRadius: 7, padding: "10px 12px", fontSize: 11, color: "#3d6020", lineHeight: 1.6 }}>
              ✓ <strong>NJ RIE ({r.riePct}% tier):</strong> {fmt(r.rieApplied)} excluded from NJ tax.
              {r.totalNJInc > 100000 && r.totalNJInc < 150000 ? ` Income in phase-out zone ($100K–$150K).` : ""}
            </div>
          )}
          {!r.njCliff && r.rieApplied === 0 && r.annuity > 0 && (
            <div style={{ marginTop: 12, background: "#fff3cd", border: "1px solid #f0c060", borderRadius: 7, padding: "10px 12px", fontSize: 11, color: "#7a5c00", lineHeight: 1.6 }}>
              ⚠ <strong>NJ RIE = $0:</strong> NJ income over $150K — no exclusion applies.
            </div>
          )}
          <div style={{ marginTop: 8, background: "#f0e8d8", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#6b4f2e", lineHeight: 1.6 }}>
            📊 LT gains taxed at federal LTCG rates (0/15/20%), ordinary in NJ. ST gains/losses are ordinary income both federal and NJ. ST losses offset LT gains before LTCG rates apply.
          </div>
        </div>

        {/* RESULTS */}
        <div style={{ padding: "22px 26px", overflowY: "auto" }}>

          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            Quarterly Payments
            {totalConvDisplay > 0 && (
              <span style={{ fontWeight: 400, fontSize: 12, color: C.mid, marginLeft: 8 }}>
                — Conversions: {PERIODS.filter((_, i) => conversions[i] > 0).map(p => p.label).join(", ")}
              </span>
            )}
          </div>

          {/* BALANCE DUE SUMMARY */}
          {(r.fedPaidTotal > 0 || r.njPaidTotal > 0) && (
            <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: C.dark, marginBottom: 10, fontSize: 13 }}>Year-End Balance — Based on Payments Made</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Federal", fullTax: r.fullFedTax, withh: withholding, paid: r.fedPaidTotal, balance: r.fedBalanceDue },
                  { label: "New Jersey", fullTax: r.fullNJTax, withh: 0, paid: r.njPaidTotal, balance: r.njBalanceDue },
                ].map(({ label, fullTax, withh, paid, balance }) => {
                  const isRefund = balance < 0;
                  const isEven   = Math.abs(balance) < 50;
                  const bgColor  = isEven ? "#f0f8e8" : isRefund ? "#e8f0ff" : balance > 5000 ? "#fff0f0" : "#fff8e8";
                  const bdColor  = isEven ? "#a0c870" : isRefund ? "#7090d0" : balance > 5000 ? "#d07060" : "#d0b060";
                  const txColor  = isEven ? C.green : isRefund ? "#1a3a7a" : balance > 5000 ? C.red : "#7a5c00";
                  return (
                    <div key={label} style={{ background: bgColor, border: `1px solid ${bdColor}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.dark, marginBottom: 8 }}>{label}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                        <span style={{ color: C.mid }}>Full year tax</span>
                        <span style={{ fontWeight: 600, color: C.dark }}>{fmt(fullTax)}</span>
                      </div>
                      {withh > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                          <span style={{ color: C.mid }}>Withholding</span>
                          <span style={{ fontWeight: 600, color: C.green }}>− {fmt(withh)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                        <span style={{ color: C.mid }}>Payments made</span>
                        <span style={{ fontWeight: 600, color: C.green }}>− {fmt(paid)}</span>
                      </div>
                      <div style={{ borderTop: `1px solid ${bdColor}`, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: txColor }}>
                          {isEven ? "✓ Even" : isRefund ? "⬇ Refund" : "⬆ Still owed"}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: txColor }}>
                          {isRefund ? `(${fmt(-balance)})` : fmt(balance)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: C.light }}>
                Updates live as you adjust income and conversion amounts above.
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 20, lineHeight: 1.75 }}>
            In quarters <strong>without</strong> a conversion, Annualized and Full Coverage payments are lower than Safe Harbor.
            Conversion quarters catch up. Green = less than safe harbor · Red = more than safe harbor.
          </div>

          {/* UNDERPAYMENT PENALTY ESTIMATE */}
          {r.penalty && (
            <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: C.dark, marginBottom: 4, fontSize: 13 }}>
                Underpayment Penalty Estimate
                <span style={{ fontWeight: 400, fontSize: 11, color: C.mid, marginLeft: 8 }}>— based on payments entered above vs. safe harbor</span>
              </div>
              <div style={{ fontSize: 11, color: C.mid, marginBottom: 10 }}>
                Equal-installment method (Form 2210). Does <strong>not</strong> apply the annualized income method — use Form 2210 Schedule AI at filing to eliminate penalties for late-year conversions.
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f0e8d8" }}>
                    <th style={{ textAlign: "left",   padding: "8px 10px", color: C.mid, fontWeight: 700, fontSize: 11 }}>Quarter</th>
                    <th style={{ textAlign: "right",  padding: "8px 10px", color: C.mid, fontWeight: 700, fontSize: 11 }}>Cumulative Shortfall</th>
                    <th style={{ textAlign: "right",  padding: "8px 10px", color: C.mid, fontWeight: 700, fontSize: 11 }}>Days Unpaid</th>
                    <th style={{ textAlign: "right",  padding: "8px 10px", color: C.mid, fontWeight: 700, fontSize: 11 }}>Est. Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {r.penalty.details.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: d.penalty > 0 ? "#fff8f0" : "white" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: d.penalty > 0 ? C.orange : C.mid }}>
                        {PERIODS[i].label} — due {PERIODS[i].due}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", fontFamily: "monospace", color: d.shortfall > 0 ? C.red : C.green }}>
                        {d.shortfall > 0 ? fmt(d.shortfall) : "✓ none"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", color: C.mid }}>
                        {d.days > 0 ? `${d.days} days` : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 10px", fontFamily: "monospace", fontWeight: 700,
                        color: d.penalty > 0 ? C.red : C.green }}>
                        {d.penalty > 0 ? fmt(d.penalty) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f0e8d8", borderTop: `2px solid ${C.border}` }}>
                    <td colSpan={3} style={{ padding: "9px 10px", fontWeight: 700, color: C.dark }}>Total estimated IRS penalty</td>
                    <td style={{ textAlign: "right", padding: "9px 10px", fontFamily: "monospace", fontWeight: 700, fontSize: 14,
                      color: r.penalty.totalPenalty > 0 ? C.red : C.green }}>
                      {r.penalty.totalPenalty > 0 ? fmt(r.penalty.totalPenalty) : "✓ $0"}
                    </td>
                  </tr>
                </tbody>
              </table>
              {r.penalty.totalPenalty > 0 && (
                <div style={{ marginTop: 10, background: "#fff3cd", border: "1px solid #f0c060", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#7a5c00", lineHeight: 1.6 }}>
                  ⚠ <strong>File Form 2210 Schedule AI</strong> with your return to use the annualized income method. If your Q4 conversion income didn't exist earlier in the year, the annualized method eliminates this penalty — no change to your payment amounts needed.
                </div>
              )}
              {r.penalty.totalPenalty === 0 && (
                <div style={{ marginTop: 10, background: "#f0f8e8", border: "1px solid #a0c870", borderRadius: 7, padding: "9px 12px", fontSize: 11, color: "#3d6020" }}>
                  ✓ No underpayment penalty under the equal-installment method based on payments entered.
                </div>
              )}
            </div>
          )}

          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: C.dark, marginBottom: 8, fontSize: 13 }}>Safe Harbor — which test applies?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              {[
                ["Federal: 110% of 2025 tax", fmt(r.fedSH_priorYr), "prior year"],
                ["Federal: 90% of 2026 tax",  fmt(r.fedSH_currYr),  "current year"],
                ["NJ: 100% of 2025 tax",      fmt(r.njSH_priorYr),  "prior year"],
                ["NJ: 80% of 2026 NJ tax",    fmt(r.njSH_currYr),   "current year"],
              ].map(([lbl, val, tag]) => {
                const isFedPrior = lbl.includes("110%");
                const isFedCurr  = lbl.includes("90%");
                const isNJPrior  = lbl.includes("100%");
                const isNJCurr   = lbl.includes("80%");
                const isWinner =
                  (isFedPrior && r.fedSH_priorYr <= r.fedSH_currYr) ||
                  (isFedCurr  && r.fedSH_currYr  <  r.fedSH_priorYr) ||
                  (isNJPrior  && r.njSH_priorYr  <= r.njSH_currYr) ||
                  (isNJCurr   && r.njSH_currYr   <  r.njSH_priorYr);
                return (
                  <div key={lbl} style={{ padding: "9px 12px", borderRadius: 7, border: `1px solid ${isWinner ? C.green : C.border}`,
                    background: isWinner ? "#f0f8e8" : "#faf7f2" }}>
                    <div style={{ fontSize: 11, color: isWinner ? C.green : C.mid, fontWeight: 700 }}>{lbl} {isWinner ? "✓ USE THIS" : ""}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isWinner ? C.green : C.dark, marginTop: 3 }}>{val}</div>
                    <div style={{ fontSize: 10, color: C.light }}>{tag}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: C.mid }}>You use whichever is <strong>lower</strong>. Currently using: <strong style={{ color: C.sh }}>Federal: {r.fedSHMethod} · NJ: {r.njSHMethod}</strong></div>
          </div>

          <QTable
            title="Federal"
            sh110Payments={r.fedSH110Payments}
            convQs={convQs}
            payments1={r.annPayFed} payments3={r.fcPayFed}
            tot1={r.fedSH110Payments.reduce((s,v)=>s+v,0)}
            tot2={r.annTotFed} tot3={r.fcTotFed}
            paid={fedPaid} withh={withholding}
          />

          <QTable
            title="New Jersey"
            sh110Payments={r.njSH110Payments}
            convQs={convQs}
            payments1={r.annPayNJ} payments3={r.fcPayNJ}
            tot1={r.njSH110Payments.reduce((s,v)=>s+v,0)}
            tot2={r.annTotNJ} tot3={r.fcTotNJ}
            paid={njPaid} withh={0}
            shLabel="SH 100% Prior Year"
          />

          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", fontSize: 12, color: C.mid, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: C.dark, marginBottom: 5, fontSize: 13 }}>How to read this</div>
            <div><span style={{ color: C.sh, fontWeight: 700 }}>Safe Harbor</span> — 4 equal payments totaling 110% of your 2025 tax. No penalty risk. May over- or under-pay vs. actual.</div>
            <div><span style={{ color: C.ann, fontWeight: 700 }}>Annualized Min</span> — minimum payments under IRS Schedule AI to avoid underpayment penalty. Low in non-conversion quarters. Q4 (Jan 15) includes the full remaining balance — nothing left at filing.</div>
            <div><span style={{ color: C.fc, fontWeight: 700 }}>Full Coverage</span> — same timing but sized to pay your entire year's tax. Q4 covers everything — nothing due at filing.</div>
            <div style={{ marginTop: 8, fontSize: 11, color: C.light }}>
              Federal safe harbor = lesser of 110% of 2025 tax OR 90% of 2026 tax. NJ = lesser of 100% of 2025 tax OR 80% of 2026 NJ tax. Annualized = IRS Schedule AI / NJ-2210 principles (22.5% factor). These are estimates — consult your CPA before making payments.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
