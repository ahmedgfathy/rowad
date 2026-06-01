const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

export const formatTodayDate = () => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

export const formatRemainingSubscription = (endDate: string) => {
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

  if (!endYear || !endMonth || !endDay) {
    return { months: 0, days: 0, isExpired: true }
  }

  const now = new Date()
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ))
  const subscriptionEndDate = new Date(Date.UTC(endYear, endMonth - 1, endDay))

  if (Number.isNaN(subscriptionEndDate.getTime())) {
    return { months: 0, days: 0, isExpired: true }
  }

  if (subscriptionEndDate <= today) {
    return { months: 0, days: 0, isExpired: true }
  }

  let cursor = new Date(today)
  let months = 0

  while (true) {
    const next = new Date(cursor)
    next.setUTCMonth(next.getUTCMonth() + 1)

    if (next > subscriptionEndDate) {
      break
    }

    months += 1
    cursor = next
  }

  const days = Math.ceil((subscriptionEndDate.getTime() - cursor.getTime()) / MILLISECONDS_PER_DAY)

  return {
    months,
    days: Math.max(0, days),
    isExpired: false,
  }
}
