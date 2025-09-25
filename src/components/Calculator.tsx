import React, { useState, useEffect } from 'react';
import styles from './Calculator.module.css';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [activeTab, setActiveTab] = useState('Calculator');
  
  // Converter state
  const [converterType, setConverterType] = useState('Length');
  const [fromUnit, setFromUnit] = useState('meters');
  const [toUnit, setToUnit] = useState('feet');
  const [fromValue, setFromValue] = useState('1');
  const [toValue, setToValue] = useState('3.28084');
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<any>({});
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  // Fetch exchange rates from exchangerate-api.com
  const fetchExchangeRates = async () => {
    const apiKey = import.meta.env.VITE_EXCHANGERATE_API_KEY;
    if (!apiKey) {
      console.warn('Exchange rate API key not found');
      return;
    }

    setIsLoadingRates(true);
    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      const data = await response.json();
      
      if (data.result === 'success') {
        setExchangeRates(data.conversion_rates);
      } else {
        console.error('Failed to fetch exchange rates:', data.error);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setIsLoadingRates(false);
    }
  };

  // Load exchange rates when component mounts or when currency converter is selected
  useEffect(() => {
    if (converterType === 'Currency' && Object.keys(exchangeRates).length === 0) {
      fetchExchangeRates();
    }
  }, [converterType, exchangeRates]);

  // Update currency conversion when exchange rates are loaded
  useEffect(() => {
    if (converterType === 'Currency' && Object.keys(exchangeRates).length > 0 && fromValue && !isNaN(Number(fromValue))) {
      const result = convert(Number(fromValue), fromUnit, toUnit, converterType);
      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
    }
  }, [exchangeRates, converterType, fromValue, fromUnit, toUnit]);

  // Update conversion when fromUnit or toUnit changes
  useEffect(() => {
    if (fromValue && !isNaN(Number(fromValue))) {
      if (converterType === 'Currency' && Object.keys(exchangeRates).length > 0) {
        const result = convert(Number(fromValue), fromUnit, toUnit, converterType);
        setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
      } else if (converterType !== 'Currency') {
        const result = convert(Number(fromValue), fromUnit, toUnit, converterType);
        setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
      }
    }
  }, [fromUnit, toUnit, converterType, exchangeRates]);

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);
    
    if (equation === '') {
      setEquation(`${inputValue} ${nextOperation} `);
    } else {
      const currentEquation = equation + display;
      try {
        const result = eval(currentEquation.replace(/×/g, '*').replace(/÷/g, '/'));
        setEquation(`${result} ${nextOperation} `);
        setDisplay(String(result));
      } catch (error) {
        setDisplay('Error');
        setEquation('');
        return;
      }
    }
    
    setWaitingForNewValue(true);
  };

  const calculate = () => {
    if (equation && !waitingForNewValue) {
      const currentEquation = equation + display;
      try {
        const result = eval(currentEquation.replace(/×/g, '*').replace(/÷/g, '/'));
        setEquation(currentEquation + ' = ' + result);
        setDisplay(String(result));
        setWaitingForNewValue(true);
      } catch (error) {
        setDisplay('Error');
        setEquation('');
      }
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForNewValue(false);
  };

  const percentage = () => {
    const value = parseFloat(display) / 100;
    setDisplay(String(value));
  };

  const decimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  // Converter functionality
  const conversionRates: any = {
    Length: {
      meters: { feet: 3.28084, inches: 39.3701, yards: 1.09361, kilometers: 0.001, centimeters: 100, millimeters: 1000 },
      feet: { meters: 0.3048, inches: 12, yards: 0.333333, kilometers: 0.0003048, centimeters: 30.48, millimeters: 304.8 },
      inches: { meters: 0.0254, feet: 0.0833333, yards: 0.0277778, kilometers: 0.0000254, centimeters: 2.54, millimeters: 25.4 },
      yards: { meters: 0.9144, feet: 3, inches: 36, kilometers: 0.0009144, centimeters: 91.44, millimeters: 914.4 },
      kilometers: { meters: 1000, feet: 3280.84, inches: 39370.1, yards: 1093.61, centimeters: 100000, millimeters: 1000000 },
      centimeters: { meters: 0.01, feet: 0.0328084, inches: 0.393701, yards: 0.0109361, kilometers: 0.00001, millimeters: 10 },
      millimeters: { meters: 0.001, feet: 0.00328084, inches: 0.0393701, yards: 0.00109361, kilometers: 0.000001, centimeters: 0.1 }
    },
    Weight: {
      kilograms: { pounds: 2.20462, ounces: 35.274, grams: 1000, tons: 0.001, stones: 0.157473 },
      pounds: { kilograms: 0.453592, ounces: 16, grams: 453.592, tons: 0.000453592, stones: 0.0714286 },
      ounces: { kilograms: 0.0283495, pounds: 0.0625, grams: 28.3495, tons: 0.0000283495, stones: 0.00446429 },
      grams: { kilograms: 0.001, pounds: 0.00220462, ounces: 0.035274, tons: 0.000001, stones: 0.000157473 },
      tons: { kilograms: 1000, pounds: 2204.62, ounces: 35274, grams: 1000000, stones: 157.473 },
      stones: { kilograms: 6.35029, pounds: 14, ounces: 224, grams: 6350.29, tons: 0.00635029 }
    },
    Temperature: {
      celsius: { fahrenheit: (c: number) => (c * 9/5) + 32, kelvin: (c: number) => c + 273.15 },
      fahrenheit: { celsius: (f: number) => (f - 32) * 5/9, kelvin: (f: number) => ((f - 32) * 5/9) + 273.15 },
      kelvin: { celsius: (k: number) => k - 273.15, fahrenheit: (k: number) => ((k - 273.15) * 9/5) + 32 }
    }
  };

  const unitOptions: any = {
    Length: ['meters', 'feet', 'inches', 'yards', 'kilometers', 'centimeters', 'millimeters'],
    Weight: ['kilograms', 'pounds', 'ounces', 'grams', 'tons', 'stones'],
    Temperature: ['celsius', 'fahrenheit', 'kelvin'],
    Currency: [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
      // African currencies
      'NGN', 'ZAR', 'EGP', 'KES', 'GHS', 'MAD', 'TND', 'DZD', 
      'ETB', 'UGX', 'TZS', 'MWK', 'ZMW', 'BWP', 'SLL', 'LRD',
      'GMD', 'SLE', 'CDF', 'RWF', 'BIF', 'DJF', 'KMF', 'MGA',
      'SCR', 'MUR', 'AOA', 'XOF', 'XAF', 'STN', 'CVE', 'SZL',
      'LSL', 'NAD', 'ZWL'
    ]
  };

  const convert = (value: number, fromUnit: string, toUnit: string, type: string) => {
    if (type === 'Temperature') {
      const conversionFunc = conversionRates[type][fromUnit][toUnit];
      return conversionFunc(value);
    } else if (type === 'Currency') {
      // Use real-time exchange rates
      if (Object.keys(exchangeRates).length === 0) {
        return 0; // Return 0 if rates not loaded yet
      }
      
      // All rates in exchangeRates are relative to USD
      // If fromUnit is USD, we multiply by the target rate
      // If toUnit is USD, we divide by the source rate
      // If neither is USD, we convert through USD
      
      if (fromUnit === 'USD') {
        // From USD to another currency
        const toRate = exchangeRates[toUnit];
        return value * toRate;
      } else if (toUnit === 'USD') {
        // From another currency to USD
        const fromRate = exchangeRates[fromUnit];
        return value / fromRate;
      } else {
        // From one currency to another (convert through USD)
        const fromRate = exchangeRates[fromUnit];
        const toRate = exchangeRates[toUnit];
        const usdValue = value / fromRate;
        return usdValue * toRate;
      }
    } else {
      const rate = conversionRates[type][fromUnit][toUnit];
      return value * rate;
    }
  };

  const handleFromValueChange = (value: string) => {
    setFromValue(value);
    if (value && !isNaN(Number(value)) && converterType === 'Currency' && Object.keys(exchangeRates).length > 0) {
      const result = convert(Number(value), fromUnit, toUnit, converterType);
      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
    } else if (value && !isNaN(Number(value)) && converterType !== 'Currency') {
      const result = convert(Number(value), fromUnit, toUnit, converterType);
      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
    } else {
      setToValue('');
    }
  };

  const handleToValueChange = (value: string) => {
    setToValue(value);
    if (value && !isNaN(Number(value)) && converterType === 'Currency' && Object.keys(exchangeRates).length > 0) {
      const result = convert(Number(value), toUnit, fromUnit, converterType);
      setFromValue(result.toFixed(6).replace(/\.?0+$/, ''));
    } else if (value && !isNaN(Number(value)) && converterType !== 'Currency') {
      const result = convert(Number(value), toUnit, fromUnit, converterType);
      setFromValue(result.toFixed(6).replace(/\.?0+$/, ''));
    } else {
      setFromValue('');
    }
  };

  const handleConverterTypeChange = (type: string) => {
    setConverterType(type);
    const units = unitOptions[type];
    
    if (type === 'Currency') {
      // Set NGN as default from currency and USD as default to currency for African context
      setFromUnit('NGN');
      setToUnit('USD');
      setFromValue('1');
      
      // For currency, we need to wait for exchange rates to load
      if (Object.keys(exchangeRates).length > 0) {
        const result = convert(1, 'NGN', 'USD', type);
        setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
      } else {
        setToValue('0');
      }
    } else {
      setFromUnit(units[0]);
      setToUnit(units[1]);
      setFromValue('1');
      const result = convert(1, units[0], units[1], type);
      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
    }
  };

  const Button = ({ onClick, className, children, isActive = false }: {
    onClick: () => void;
    className: string;
    children: React.ReactNode;
    isActive?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`${styles.button} ${className} ${isActive ? styles.active : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className={styles.calculator}>
        {/* Tab Headers */}
        <div className={styles.tabHeaders}>
          <button
            onClick={() => setActiveTab('Calculator')}
            className={`${styles.tabButton} ${activeTab === 'Calculator' ? styles.active : styles.inactive}`}
          >
            Calculator
            {activeTab === 'Calculator' && (
              <div className={styles.tabIndicator}></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('Converter')}
            className={`${styles.tabButton} ${activeTab === 'Converter' ? styles.active : styles.inactive}`}
          >
            Converter
            {activeTab === 'Converter' && (
              <div className={styles.tabIndicator}></div>
            )}
          </button>
        </div>

        {activeTab === 'Calculator' ? (
          <>
            {/* Equation Display */}
            <div className={styles.equationDisplay}>
              {equation}
            </div>

            {/* Main Display */}
            <div className={styles.mainDisplay}>
              {display}
            </div>

            {/* Calculator UI */}
            <div className={styles.calculatorGrid}>
            {/* Row 1 */}
            <Button onClick={clear} className={styles.gray700}>
              C
            </Button>
            <Button onClick={() => inputOperation('+')} className={styles.gray700}>
              +
            </Button>
            <Button onClick={percentage} className={styles.gray700}>
              %
            </Button>
            <Button onClick={() => inputOperation('÷')} className={styles.gray700}>
              ÷
            </Button>

            {/* Row 2 */}
            <Button onClick={() => inputNumber('7')} className={styles.gray800}>
              7
            </Button>
            <Button onClick={() => inputNumber('8')} className={styles.gray800}>
              8
            </Button>
            <Button onClick={() => inputNumber('9')} className={styles.gray800}>
              9
            </Button>
            <Button onClick={() => inputOperation('×')} className={styles.gray700}>
              ×
            </Button>

            {/* Row 3 */}
            <Button onClick={() => inputNumber('4')} className={styles.gray800}>
              4
            </Button>
            <Button onClick={() => inputNumber('5')} className={styles.gray800}>
              5
            </Button>
            <Button onClick={() => inputNumber('6')} className={styles.gray800}>
              6
            </Button>
            <Button onClick={() => inputOperation('-')} className={styles.gray700}>
              −
            </Button>

            {/* Row 4 */}
            <Button onClick={() => inputNumber('1')} className={styles.gray800}>
              1
            </Button>
            <Button onClick={() => inputNumber('2')} className={styles.gray800}>
              2
            </Button>
            <Button onClick={() => inputNumber('3')} className={styles.gray800}>
              3
            </Button>
            <Button onClick={() => inputOperation('+')} className={styles.gray700}>
              +
            </Button>

            {/* Row 5 */}
            <Button onClick={clear} className={`${styles.gray700} ${styles.smallText}`}>
              GT
            </Button>
            <Button onClick={() => inputNumber('0')} className={styles.gray800}>
              0
            </Button>
            <Button onClick={decimal} className={styles.gray800}>
              .
            </Button>
            <Button
              onClick={calculate}
              className={styles.red500}
              isActive={true}
            >
              =
            </Button>
          </div>
          </>
        ) : (
          /* Converter UI */
          <div className={styles.converterContainer}>
            {/* Converter Type Selector */}
            <div className={styles.converterTypeGrid}>
              {['Length', 'Weight', 'Temperature', 'Currency'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleConverterTypeChange(type)}
                  className={`${styles.converterTypeButton} ${
                    converterType === type ? styles.active : styles.inactive
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Currency Rate Status */}
            {converterType === 'Currency' && (
              <div className={styles.currencyStatus}>
                <span className={styles.currencyStatusText}>
                  {isLoadingRates ? 'Loading rates...' : 
                   Object.keys(exchangeRates).length > 0 ? 'Live rates' : 'API key needed'}
                </span>
                {Object.keys(exchangeRates).length > 0 && (
                  <button
                    onClick={fetchExchangeRates}
                    className={styles.refreshButton}
                    disabled={isLoadingRates}
                  >
                    {isLoadingRates ? '⟳' : '↻'} Refresh
                  </button>
                )}
              </div>
            )}

            {/* From Unit */}
            <div className={styles.converterSection}>
              <div className={styles.converterLabel}>From</div>
              <select
                value={fromUnit}
                onChange={(e) => {
                  setFromUnit(e.target.value);
                  if (fromValue && !isNaN(Number(fromValue))) {
                    if (converterType === 'Currency' && Object.keys(exchangeRates).length > 0) {
                      const result = convert(Number(fromValue), e.target.value, toUnit, converterType);
                      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
                    } else if (converterType !== 'Currency') {
                      const result = convert(Number(fromValue), e.target.value, toUnit, converterType);
                      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
                    }
                  }
                }}
                className={styles.converterSelect}
              >
                {unitOptions[converterType].map((unit: string) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={fromValue}
                onChange={(e) => handleFromValueChange(e.target.value)}
                className={styles.converterInput}
                placeholder="Enter value"
              />
            </div>

            {/* To Unit */}
            <div className={styles.converterSection}>
              <div className={styles.converterLabel}>To</div>
              <select
                value={toUnit}
                onChange={(e) => {
                  setToUnit(e.target.value);
                  if (fromValue && !isNaN(Number(fromValue))) {
                    if (converterType === 'Currency' && Object.keys(exchangeRates).length > 0) {
                      const result = convert(Number(fromValue), fromUnit, e.target.value, converterType);
                      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
                    } else if (converterType !== 'Currency') {
                      const result = convert(Number(fromValue), fromUnit, e.target.value, converterType);
                      setToValue(result.toFixed(6).replace(/\.?0+$/, ''));
                    }
                  }
                }}
                className={styles.converterSelect}
              >
                {unitOptions[converterType].map((unit: string) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={toValue}
                onChange={(e) => handleToValueChange(e.target.value)}
                className={styles.converterInput}
                placeholder="Result"
              />
            </div>
          </div>
        )}
    </div>
  );
}
