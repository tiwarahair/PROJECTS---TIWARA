export const NOTIFS = [
  {
    title: "Late cancellation",
    body: "Yasmin Diallo cancelled Twist out inside your 48-hour window. The £10.00 fee is charged in 21h unless you waive it.",
    time: "3h ago",
    unread: true,
  },
  {
    title: "Booking moved",
    body: "Zainab Bello moved Box braids from 09:00 to 11:00. That was her one free reschedule.",
    time: "2h ago",
    unread: true,
  },
  {
    title: "New review",
    body: 'Kemi Adeyemi left you 5 stars: "Best retwist in Manchester."',
    time: "Yesterday",
    unread: true,
  },
  {
    title: "Payout sent",
    body: "£312.00 sent to your account ending 4471",
    time: "Fri",
    unread: false,
  },
  {
    title: "Client reminder",
    body: "Nia Okafor arrives at 10:30 today",
    time: "Today",
    unread: false,
  },
];

interface RangeData {
  caption: string;
  stats: Record<
    "bookings" | "revenue" | "occupancy" | "clients",
    [string, string]
  >;
  chart: number[];
  labels: string[];
  tips: string[];
}

export const RANGE_DATA: Record<"today" | "week" | "month", RangeData> = {
  today: {
    caption: "Today, by hour",
    stats: {
      bookings: ["3", "+1"],
      revenue: ["£240", "+18%"],
      occupancy: ["75%", ""],
      clients: ["1", ""],
    },
    chart: [0, 45, 45, 130, 130, 195, 240],
    labels: ["09", "11", "13", "15", "17", "19", "21"],
    tips: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00", "21:00"],
  },
  week: {
    caption: "Last 7 days",
    stats: {
      bookings: ["14", "+12%"],
      revenue: ["£1,120", "+9%"],
      occupancy: ["82%", "+4"],
      clients: ["4", "+2"],
    },
    chart: [95, 140, 0, 120, 210, 320, 235],
    labels: ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"],
    tips: ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Today"],
  },
  month: {
    caption: "Last 30 days",
    stats: {
      bookings: ["52", "+8%"],
      revenue: ["£4,380", "+15%"],
      occupancy: ["78%", "+2"],
      clients: ["11", "+5"],
    },
    chart: [180, 240, 150, 310, 280, 90, 340, 300, 260, 330],
    labels: ["3 Aug", "", "", "", "16 Aug", "", "", "", "", "1 Sep"],
    tips: [
      "3 Aug",
      "6 Aug",
      "9 Aug",
      "13 Aug",
      "16 Aug",
      "19 Aug",
      "22 Aug",
      "26 Aug",
      "29 Aug",
      "1 Sep",
    ],
  },
};
