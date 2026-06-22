import React, { useState } from 'react';
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react';

export default function RothConversionCalculator() {
  const [showProjection, setShowProjection] = useState(false);
  
  const [inputs, setInputs] = useState({
    currentIncome: 0,
    currentYear: 2025,
    currentYearSS: 6500,
    spouse1SSStartYear: 2027,
    spouse1SSInitial: 37750,
    spouse1SSFinal: 45300,
    spouse1SSFinalYear: 2028,
    spouse2SSStartYear: 2028,
    spouse2SSInitial: 22300,
    spouse2SSFinal: 53500,
    spouse2SSFinalYear: 2029,
    pensionIncome: 0,
    annuityIncome: 31188,
    qualifiedDividends: 0,
    longTermCapitalGains: 1049,
    ordinaryDividends: 22241,
    shortTermCapitalGains: 0,
    standardDeduction: 30000,
    additionalSeniorDeduction: 3200,
    bonusSeniorDeduction: 12000,
    spouse1Age: 67,
    spouse2Age: 68,
    spouse1IRA: 485000,
    spouse2IRA: 1418562,
    filingStatus: 'married',
    targetBracket: '22',
    iraGrowthRate: 7,
    inflationRate: 3
  });

  const federalBrackets = {
    married: [
      { limit: 23200, rate: 0.10 },
      { limit: 94300, rate: 0.12 },
      { limit: 201050, rate: 0.22 },
      { limit: 383900, rate: 0.24 },
      { limit: 487450, rate: 0.32 },
      { limit: 731200, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ],
    single: [
      { limit: 11600, rate: 0.10 },
      { limit: 47150, rate: 0.12 },
      { limit: 100525, rate: 0.22 },
      { limit: 191950, rate: 0.24 },
      { limit: 487450, rate: 0.32 },
      { limit: 609350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 }
    ]
  };

  const njBrackets = {
    married: [
      { limit: 20000, rate: 0.014 },
      { limit: 50000, rate: 0.0175 },
      { limit: 70000, rate: 0.0245 },
      { limit: 80000, rate: 0.035 },
      { limit: 150000, rate: 0.05525 },
      { limit: 500000, rate: 0.0637 },
      { limit: 1000000, rate: 0.0897 },
      { limit: Infinity, rate: 0.1075 }
    ],
    single: [
      { limit: 20000, rate: 0.014 },
      { limit: 35000, rate: 0.0175 },
      { limit: 40000, rate: 0.035 },
      { limit: 75000, rate: 0.05525 },
      { limit: 500000, rate: 0.0637 },
      { limit: 1000000, rate: 0.0897 },
      { limit: Infinity, rate: 0.1075 }
    ]
  };

  const calcTax = (income, status, brackets) => {
    let tax = 0;
    let prev = 0;
    for (let b of brackets) {
      if (income > prev) {
        tax += Math.min(income - prev, b.limit - prev) * b.rate;
        prev = b.limit;
      } else break;
    }
    return tax;
  };

  const findNextTop = (income, status) => {
    for (let b of federalBrackets[status]) {
      if (income < b.limit) return b.limit;
    }
    return Infinity;
  };

  const getSSForYear = (year) => {
    const p = (v) => parseFloat(v || 0);
    if (year === p(inputs.currentYear)) return p(inputs.currentYearSS);
    
    let ss = 0;
    if (year >= p(inputs.spouse1SSStartYear)) {
      ss += year >= p(inputs.spouse1SSFinalYear) ? p(inputs.spouse1SSFinal) : p(inputs.spouse1SSInitial);
    }
    if (year >= p(inputs.spouse2SSStartYear)) {
      ss += year >= p(inputs.spouse2SSFinalYear) ? p(inputs.spouse2SSFinal) : p(inputs.spouse2SSInitial);
    }
    return ss;
  };

  const calc = () => {
    const p = (v) => parseFloat(v || 0);
    const ss = getSSForYear(p(inputs.currentYear));
    const ordInc = p(inputs.currentIncome) + ss + p(inputs.pensionIncome) + p(inputs.annuityIncome) + 
                   p(inputs.ordinaryDividends) + p(inputs.shortTermCapitalGains);
    const prefInc = p(inputs.qualifiedDividends) + p(inputs.longTermCapitalGains);
    const totInc = ordInc + prefInc;
    
    const brackets = { 
      married: {'10':23200,'12':94300,'22':201050,'24':383900,'32':487450}, 
      single: {'10':11600,'12':47150,'22':100525,'24':191950,'32':243725} 
    };
    const target = brackets[inputs.filingStatus][inputs.targetBracket];
    
    const workDed = p(inputs.standardDeduction) + p(inputs.additionalSeniorDeduction) + p(inputs.bonusSeniorDeduction);
    let ordTax = Math.max(0, ordInc - workDed);
    let conv = ordTax < target ? target - ordTax : Math.min(100000, findNextTop(ordTax, inputs.filingStatus) - ordTax);
    
    const magi = totInc + conv;
    const phaseStart = inputs.filingStatus === 'married' ? 150000 : 75000;
    let adjBonus = p(inputs.bonusSeniorDeduction);
    if (magi > phaseStart) {
      adjBonus = Math.max(0, adjBonus - (magi - phaseStart) * 0.06);
    }
    
    const totDed = p(inputs.standardDeduction) + p(inputs.additionalSeniorDeduction) + adjBonus;
    ordTax = Math.max(0, ordInc - totDed);
    conv = ordTax < target ? target - ordTax : Math.min(100000, findNextTop(ordTax, inputs.filingStatus) - ordTax);
    
    const fedTax = calcTax(ordTax + conv, inputs.filingStatus, federalBrackets[inputs.filingStatus]) - 
                   calcTax(ordTax, inputs.filingStatus, federalBrackets[inputs.filingStatus]);
    
    const totWithConv = totInc + conv;
    let njTax = 0;
    
    if (totWithConv > 150000) {
      const njTaxable = Math.max(0, p(inputs.currentIncome) + p(inputs.annuityIncome) + 
                                 p(inputs.pensionIncome) + conv + prefInc + 
                                 p(inputs.ordinaryDividends) + p(inputs.shortTermCapitalGains) - 2000);
      njTax = calcTax(njTaxable, inputs.filingStatus, njBrackets[inputs.filingStatus]);
    } else {
      const njTaxable = Math.max(0, p(inputs.currentIncome) + p(inputs.annuityIncome) + prefInc + 
                                 p(inputs.ordinaryDividends) + p(inputs.shortTermCapitalGains) - 2000);
      njTax = calcTax(njTaxable, inputs.filingStatus, njBrackets[inputs.filingStatus]);
    }
    
    // Calculate IRMAA impact
    const irmaaBreakpoints = {
      married: [
        { limit: 206000, partB: 174.70, partD: 0 },
        { limit: 258000, partB: 244.60, partD: 12.90 },
        { limit: 322000, partB: 349.40, partD: 33.30 },
        { limit: 386000, partB: 454.20, partD: 53.80 },
        { limit: 750000, partB: 559.00, partD: 74.20 },
        { limit: Infinity, partB: 594.00, partD: 81.00 }
      ],
      single: [
        { limit: 103000, partB: 174.70, partD: 0 },
        { limit: 129000, partB: 244.60, partD: 12.90 },
        { limit: 161000, partB: 349.40, partD: 33.30 },
        { limit: 193000, partB: 454.20, partD: 53.80 },
        { limit: 500000, partB: 559.00, partD: 74.20 },
        { limit: Infinity, partB: 594.00, partD: 81.00 }
      ]
    };

    const findIRMAA = (magi, status) => {
      const brackets = irmaaBreakpoints[status];
      for (let bracket of brackets) {
        if (magi <= bracket.limit) {
          return { partB: bracket.partB, partD: bracket.partD };
        }
      }
      return brackets[brackets.length - 1];
    };

    const magiWithoutConv = totInc;
    const magiWithConv = totWithConv;
    
    const irmaaWithout = findIRMAA(magiWithoutConv, inputs.filingStatus);
    const irmaaWith = findIRMAA(magiWithConv, inputs.filingStatus);
    
    const personsOnMedicare = inputs.filingStatus === 'married' ? 2 : 1;
    const annualIRMAAWithout = (irmaaWithout.partB * 12 + irmaaWithout.partD * 12) * personsOnMedicare;
    const annualIRMAAWith = (irmaaWith.partB * 12 + irmaaWith.partD * 12) * personsOnMedicare;
    const irmaaIncrease = annualIRMAAWith - annualIRMAAWithout;
    
    return {
      optimalConversion: conv,
      federalConversionTax: fedTax,
      njConversionTax: njTax,
      totalConversionTax: fedTax + njTax,
      effectiveRate: ((fedTax + njTax) / conv) * 100,
      totalDeductions: totDed,
      totalIRABalance: p(inputs.spouse1IRA) + p(inputs.spouse2IRA),
      totalIncomeWithConversion: totWithConv,
      totalIncomeBeforeConversion: totInc,
      exceedsNJLimit: totWithConv > 150000,
      adjustedBonusDeduction: adjBonus,
      bonusPhaseOutApplies: magi > phaseStart,
      magiForBonus: magi,
      currentSocialSecurity: ss,
      irmaaWithout: irmaaWithout,
      irmaaWith: irmaaWith,
      irmaaIncrease: irmaaIncrease,
      magiWithConv: magiWithConv,
      magiWithoutConv: magiWithoutConv
    };
  };

  const calc10Year = () => {
    const projection = [];
    const p = (v) => parseFloat(v || 0);
    let ira = p(inputs.spouse1IRA) + p(inputs.spouse2IRA);
    const growth = p(inputs.iraGrowthRate) / 100;
    const inflation = p(inputs.inflationRate) / 100;
    
    // First pass: calculate conversions and MAGI for all years
    const yearlyData = [];
    let tempIRA = ira;
    
    for (let y = 0; y < 10; y++) {
      const year = p(inputs.currentYear) + y;
      const sp1Age = parseInt(inputs.spouse1Age) + y;
      const sp2Age = parseInt(inputs.spouse2Age) + y;
      const sp1RMD = sp1Age >= 73;
      const sp2RMD = sp2Age >= 73;
      
      let rmd = 0;
      if (sp1RMD || sp2RMD) {
        const period = sp1Age >= 73 ? (120 - sp1Age) : (120 - sp2Age);
        rmd = tempIRA / period;
      }
      
      const inf = Math.pow(1 + inflation, y);
      const ss = getSSForYear(year);
      
      const ordInc = (p(inputs.currentIncome) + ss + p(inputs.pensionIncome) + p(inputs.annuityIncome) + 
                     p(inputs.ordinaryDividends) + p(inputs.shortTermCapitalGains)) * inf;
      const prefInc = (p(inputs.qualifiedDividends) + p(inputs.longTermCapitalGains)) * inf;
      const totInc = ordInc + prefInc + rmd;
      
      const stdDed = p(inputs.standardDeduction) * inf;
      const addDed = p(inputs.additionalSeniorDeduction) * inf;
      const obbbaBase = year <= 2028 ? p(inputs.bonusSeniorDeduction) : 0;
      
      const brackets = { 
        married: {'10':23200,'12':94300,'22':201050,'24':383900,'32':487450}, 
        single: {'10':11600,'12':47150,'22':100525,'24':191950,'32':243725} 
      };
      const targetBracket = brackets[inputs.filingStatus][inputs.targetBracket] * inf;
      
      let conv = 0;
      if (tempIRA > 1000) {
        const workDed = stdDed + addDed + obbbaBase;
        let ordTax = Math.max(0, ordInc - workDed);
        conv = ordTax < targetBracket ? targetBracket - ordTax : Math.min(100000 * inf, findNextTop(ordTax, inputs.filingStatus) * inf - ordTax);
        conv = Math.min(conv, tempIRA);
        
        const magi = totInc + conv;
        const phaseStart = inputs.filingStatus === 'married' ? 150000 : 75000;
        let adjBonus = obbbaBase;
        if (magi > phaseStart && obbbaBase > 0) {
          adjBonus = Math.max(0, obbbaBase - (magi - phaseStart) * 0.06);
        }
        
        const finalDed = stdDed + addDed + adjBonus;
        ordTax = Math.max(0, ordInc - finalDed);
        conv = ordTax < targetBracket ? targetBracket - ordTax : Math.min(100000 * inf, findNextTop(ordTax, inputs.filingStatus) * inf - ordTax);
        conv = Math.min(conv, tempIRA);
        
        if (sp1RMD || sp2RMD) {
          conv = Math.min(conv, (tempIRA - rmd) * 0.7);
        }
      }
      
      const magi = totInc + conv;
      let finalObbba = obbbaBase;
      if (magi > 150000 && obbbaBase > 0) {
        finalObbba = Math.max(0, obbbaBase - (magi - 150000) * 0.06);
      }
      
      const finalDed = stdDed + addDed + finalObbba;
      const finalTax = Math.max(0, ordInc + conv - finalDed);
      const fedTax = calcTax(finalTax, inputs.filingStatus, federalBrackets[inputs.filingStatus]) * inf;
      
      const totWithConv = totInc + conv;
      let njTax = 0;
      if (totWithConv > 150000) {
        const njTaxable = Math.max(0, (p(inputs.currentIncome) + p(inputs.annuityIncome) + 
                                   p(inputs.pensionIncome) + conv + p(inputs.ordinaryDividends) + 
                                   p(inputs.shortTermCapitalGains) + p(inputs.qualifiedDividends) + 
                                   p(inputs.longTermCapitalGains)) * inf - 2000);
        njTax = calcTax(njTaxable, inputs.filingStatus, njBrackets[inputs.filingStatus]) * inf;
      } else {
        const njTaxable = Math.max(0, (p(inputs.currentIncome) + p(inputs.annuityIncome) + 
                                   p(inputs.ordinaryDividends) + p(inputs.shortTermCapitalGains) +
                                   p(inputs.qualifiedDividends) + p(inputs.longTermCapitalGains)) * inf - 2000);
        njTax = calcTax(njTaxable, inputs.filingStatus, njBrackets[inputs.filingStatus]) * inf;
      }
      
      yearlyData.push({
        year: year,
        sp1Age: sp1Age,
        sp2Age: sp2Age,
        socialSecurity: ss,
        iraStart: tempIRA,
        rmd: rmd,
        conv: conv,
        fedTax: fedTax,
        njTax: njTax,
        totTax: fedTax + njTax,
        iraEnd: Math.max(0, (tempIRA - conv - rmd) * (1 + growth)),
        obbba: year <= 2028,
        magi: totWithConv
      });
      
      tempIRA = Math.max(0, (tempIRA - conv - rmd) * (1 + growth));
    }
    
    // Second pass: calculate IRMAA based on MAGI from 2 years prior
    const irmaaBreakpoints = {
      married: [
        { limit: 206000, partB: 174.70, partD: 0 },
        { limit: 258000, partB: 244.60, partD: 12.90 },
        { limit: 322000, partB: 349.40, partD: 33.30 },
        { limit: 386000, partB: 454.20, partD: 53.80 },
        { limit: 750000, partB: 559.00, partD: 74.20 },
        { limit: Infinity, partB: 594.00, partD: 81.00 }
      ],
      single: [
        { limit: 103000, partB: 174.70, partD: 0 },
        { limit: 129000, partB: 244.60, partD: 12.90 },
        { limit: 161000, partB: 349.40, partD: 33.30 },
        { limit: 193000, partB: 454.20, partD: 53.80 },
        { limit: 500000, partB: 559.00, partD: 74.20 },
        { limit: Infinity, partB: 594.00, partD: 81.00 }
      ]
    };
    
    const findIRMAA = (magi, status) => {
      const brackets = irmaaBreakpoints[status];
      for (let bracket of brackets) {
        if (magi <= bracket.limit) {
          return { partB: bracket.partB, partD: bracket.partD };
        }
      }
      return brackets[brackets.length - 1];
    };
    
    const personsOnMedicare = inputs.filingStatus === 'married' ? 2 : 1;
    
    for (let y = 0; y < yearlyData.length; y++) {
      let irmaaAnnual = 0;
      
      // IRMAA is based on MAGI from 2 years ago
      if (y >= 2) {
        const magiFrom2YearsAgo = yearlyData[y - 2].magi;
        const irmaa = findIRMAA(magiFrom2YearsAgo, inputs.filingStatus);
        irmaaAnnual = (irmaa.partB * 12 + irmaa.partD * 12) * personsOnMedicare;
      } else {
        // For first 2 years, use current income as baseline
        const currentMagi = yearlyData[0].magi - yearlyData[0].conv;
        const irmaa = findIRMAA(currentMagi, inputs.filingStatus);
        irmaaAnnual = (irmaa.partB * 12 + irmaa.partD * 12) * personsOnMedicare;
      }
      
      projection.push({
        ...yearlyData[y],
        irmaaAnnual: irmaaAnnual
      });
    }
    
    return projection;
  };

  const results = calc();

  const handleChange = (e) => {
    setInputs({...inputs, [e.target.name]: e.target.value});
  };

  const fmt = (n) => {
    if (!n || isNaN(n)) return '$0';
    return new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Roth Conversion Optimizer - NJ</h1>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-3">IRA Balances</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">Spouse 1 IRA</label>
                <input type="number" name="spouse1IRA" value={inputs.spouse1IRA} onChange={handleChange} 
                       className="w-full p-3 border-2 border-green-400 rounded-lg text-lg font-semibold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">Spouse 2 IRA</label>
                <input type="number" name="spouse2IRA" value={inputs.spouse2IRA} onChange={handleChange} 
                       className="w-full p-3 border-2 border-green-400 rounded-lg text-lg font-semibold" />
              </div>
            </div>
            <div className="mt-3 p-2 bg-white rounded">
              <p className="text-lg font-bold">
                <span className="text-green-800">Total IRA Balance:</span> {fmt(results.totalIRABalance)}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Annuity</label>
              <input type="number" name="annuityIncome" value={inputs.annuityIncome} onChange={handleChange} 
                     className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ordinary Dividends</label>
              <input type="number" name="ordinaryDividends" value={inputs.ordinaryDividends} onChange={handleChange} 
                     className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LT Cap Gains</label>
              <input type="number" name="longTermCapitalGains" value={inputs.longTermCapitalGains} onChange={handleChange} 
                     className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
            <h2 className="text-2xl font-bold mb-2">Recommended Conversion for {inputs.currentYear}</h2>
            <div className="text-5xl font-bold">{fmt(results.optimalConversion)}</div>
            <div className="mt-4 pt-4 border-t border-indigo-400 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-indigo-200">Income Before</div>
                <div className="text-xl font-semibold">{fmt(results.totalIncomeBeforeConversion)}</div>
              </div>
              <div>
                <div className="text-indigo-200">With Conversion</div>
                <div className="text-xl font-semibold">{fmt(results.totalIncomeWithConversion)}</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-semibold">Federal Tax</div>
              <div className="text-2xl font-bold">{fmt(results.federalConversionTax)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-semibold">NJ Tax</div>
              <div className="text-2xl font-bold">{fmt(results.njConversionTax)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-semibold">Total Tax</div>
              <div className="text-2xl font-bold">{fmt(results.totalConversionTax)}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600 font-semibold">Effective Rate</div>
              <div className="text-2xl font-bold">{results.effectiveRate.toFixed(1)}%</div>
            </div>
          </div>

          {results.bonusPhaseOutApplies && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-orange-800">OBBBA Phase-Out</p>
              <p className="text-sm text-orange-700">
                MAGI {fmt(results.magiForBonus)} - Bonus reduced to {fmt(results.adjustedBonusDeduction)}
              </p>
            </div>
          )}

          {results.irmaaIncrease > 0 && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">⚠️ Medicare IRMAA Impact</p>
                <p className="mb-2">
                  This conversion increases your MAGI from {fmt(results.magiWithoutConv)} to {fmt(results.magiWithConv)}, 
                  which would increase Medicare premiums by <strong>{fmt(results.irmaaIncrease)} per year</strong> (both spouses) 
                  two years from now.
                </p>
                <p className="text-xs">
                  Without conversion: Part B ${results.irmaaWithout.partB}/month per person, Part D ${results.irmaaWithout.partD}/month per person<br/>
                  With conversion: Part B ${results.irmaaWith.partB}/month per person, Part D ${results.irmaaWith.partD}/month per person
                </p>
              </div>
            </div>
          )}

          {results.irmaaIncrease === 0 && results.magiWithConv > 100000 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">✓ No Medicare IRMAA Impact</p>
                <p>
                  Good news! This conversion keeps your MAGI at {fmt(results.magiWithConv)}, 
                  which stays within your current IRMAA bracket. Medicare premiums remain at 
                  ${results.irmaaWith.partB}/month (Part B) + ${results.irmaaWith.partD}/month (Part D) per person.
                </p>
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-green-900 mb-1">NJ Retirement Income Rule</p>
            <p className="text-sm text-green-800">
              Under $150k: Retirement income exempt. Over $150k: LOSE ENTIRE EXCLUSION.
              <br />
              Your total: {fmt(results.totalIncomeWithConversion)} 
              {results.exceedsNJLimit && (
                <strong className="text-orange-700"> - Over limit, retirement income now taxable in NJ</strong>
              )}
            </p>
          </div>

          <button 
            onClick={() => setShowProjection(!showProjection)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg mb-4 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            {showProjection ? 'Hide' : 'Show'} 10-Year Strategy
          </button>

          {showProjection && (
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">10-Year Conversion Strategy</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left p-2">Year</th>
                      <th className="text-left p-2">Ages</th>
                      <th className="text-right p-2">SS</th>
                      <th className="text-right p-2">IRA</th>
                      <th className="text-right p-2">RMD</th>
                      <th className="text-right p-2">Convert</th>
                      <th className="text-right p-2">MAGI</th>
                      <th className="text-right p-2">Fed Tax</th>
                      <th className="text-right p-2">NJ Tax</th>
                      <th className="text-right p-2">IRMAA</th>
                      <th className="text-right p-2">Total Cost</th>
                      <th className="text-right p-2">IRA End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc10Year().map((row, idx) => (
                      <tr key={idx} className={row.rmd > 0 ? 'border-b bg-yellow-50' : 'border-b'}>
                        <td className="p-2">{row.year}</td>
                        <td className="p-2">{row.sp1Age}/{row.sp2Age}</td>
                        <td className="text-right p-2">{fmt(row.socialSecurity)}</td>
                        <td className="text-right p-2">{fmt(row.iraStart)}</td>
                        <td className="text-right p-2">{row.rmd > 0 ? fmt(row.rmd) : '-'}</td>
                        <td className="text-right p-2 font-bold text-indigo-700">{fmt(row.conv)}</td>
                        <td className="text-right p-2 text-blue-700">{fmt(row.magi)}</td>
                        <td className="text-right p-2">{fmt(row.fedTax)}</td>
                        <td className="text-right p-2">{fmt(row.njTax)}</td>
                        <td className="text-right p-2 text-orange-600">{fmt(row.irmaaAnnual)}</td>
                        <td className="text-right p-2 font-semibold">{fmt(row.totTax + row.irmaaAnnual)}</td>
                        <td className="text-right p-2">{fmt(row.iraEnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600 mt-4">
                Yellow rows = RMDs active. <strong>IRMAA is based on MAGI from 2 years prior</strong> (e.g., 2025 income determines 2027 IRMAA). 
                Total Cost = Fed Tax + NJ Tax + IRMAA (applied 2 years later). Growth: {inputs.iraGrowthRate}%, Inflation: {inputs.inflationRate}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}