import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function logMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    console.info('[web-vitals]', {
      name: metric.name,
      value: Number(metric.value.toFixed(2)),
      rating: metric.rating,
    })
  }
}

export function reportWebVitals() {
  onCLS(logMetric)
  onINP(logMetric)
  onLCP(logMetric)
}
