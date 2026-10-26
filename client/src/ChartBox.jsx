import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function ChartBox({ config, height = 260 }) {
  const ref = useRef(null);
  useEffect(() => {
    const chart = new Chart(ref.current, { ...config, options: { maintainAspectRatio: false, ...config.options } });
    return () => chart.destroy();
  }, [config]);
  return (
    <div style={{ height }}>
      <canvas ref={ref} />
    </div>
  );
}
