import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaWallet, FaCoins, FaCreditCard, FaMoneyBill1Wave, FaMoneyBillTransfer, FaCalculator } from 'react-icons/fa6';
import { MdAccountBalance, MdPayment, MdAttachMoney, MdTrendingUp, MdShowChart, MdReceipt, MdBarChart, MdPieChart } from 'react-icons/md';

const ICONS = [
  FaWallet, FaCoins, FaCreditCard, FaMoneyBill1Wave, FaMoneyBillTransfer, FaCalculator,
  MdAccountBalance, MdPayment, MdAttachMoney, MdTrendingUp, MdShowChart, MdReceipt, MdBarChart, MdPieChart,
];

// [iconIndex, top%, left%, sizePx, rotateDeg]
const PLACEMENTS = [
  [0,  2,   3,  36, -15], [6,  4,  91, 28,  20],
  [1,  7,  20,  22,  10], [7,  5,  64, 30, -10],
  [2,  13, 47,  44,   5], [13, 9,  78, 26,  30],
  [3,  19,  8,  24, -25], [8,  15, 54, 32,  15],
  [4,  21, 34,  28,  -5], [9,  23, 83, 40, -20],
  [5,  29, 14,  38,  20], [10, 26, 57, 22,   8],
  [6,  31, 87,  30, -12], [11, 34, 41, 26,  25],
  [0,  39,  2,  22,  18], [7,  36, 71, 34, -30],
  [1,  43, 24,  42,  -8], [12, 41, 93, 28,  12],
  [2,  49, 51,  30,  22], [3,  46, 11, 24, -18],
  [8,  54,  7,  36,  10], [13, 51, 76, 32,   5],
  [4,  59, 32,  24, -22], [9,  57, 61, 38,  15],
  [5,  64, 87,  26,  28], [10, 61, 19, 30, -10],
  [11, 69, 45,  34,  -5], [0,  66, 74, 22,  20],
  [6,  74,  4,  28,  15], [1,  71, 37, 40, -15],
  [3,  77, 62,  26,  10], [7,  79, 89, 32, -25],
  [2,  84, 17,  34,  20], [8,  81, 51, 24,   8],
  [4,  87, 29,  30, -10], [12, 89, 71, 38,  15],
  [5,  92,  7,  24,  25], [9,  94, 46, 28, -20],
  [10, 96, 83,  32,   5], [11, 98, 24, 26,  10],
];

function BackgroundIcons() {
  const { theme } = useTheme();
  const color   = theme === 'dark' ? '#4C1D95' : '#475569';
  const opacity = theme === 'dark' ? 0.10 : 0.07;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: -1,
      overflow: 'hidden',
    }}>
      {PLACEMENTS.map(([iconIdx, top, left, size, rotate], idx) => {
        const Icon = ICONS[iconIdx];
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: `${top}%`,
              left: `${left}%`,
              opacity,
              transform: `rotate(${rotate}deg)`,
              color,
              transition: 'color 0.25s ease, opacity 0.25s ease',
            }}
          >
            <Icon size={size} />
          </div>
        );
      })}
    </div>
  );
}

export default BackgroundIcons;
