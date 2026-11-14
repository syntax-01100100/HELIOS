const between = (min, max) => min + Math.random() * (max - min);

export function generateSensorReading() {
  return {
    hr: Math.round(between(62, 82)),
    spo2: Math.round(between(96, 99)),
    temp: Number(between(36.3, 36.8).toFixed(1)),
  };
}
