const MS_PER_DAY = 1000 * 60 * 60 * 24

export const formatTodayDate = () => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

export const formatRemainingSubscription = (endDate: string) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const subscriptionEndDate = new Date(`${endDate}T00:00:00`)

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
    next.setMonth(next.getMonth() + 1)

    if (next > subscriptionEndDate) {
      break
    }

    months += 1
    cursor = next
  }

  const days = Math.ceil((subscriptionEndDate.getTime() - cursor.getTime()) / MS_PER_DAY)

  return {
    months,
    days: Math.max(0, days),
    isExpired: false,
  }
}
