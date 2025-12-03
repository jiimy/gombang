import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

dayjs.extend(relativeTime);
dayjs.locale("ko");

export const dayformat = (dateString: string) => {
  return dayjs(dateString).format("YY.MM.DD");
};

export const dayformatTime = (dateString: string) => {
  return dayjs(dateString).format("YY.MM.DD HH:mm");
};

// n일전 표기 - 0일전 으료 표기
export const getRelativeTimeDay = (dateString: string) => {
  const now = dayjs();
  const date = dayjs(dateString).add(9, "hour");
  const diffInDays = Math.max(now.diff(date, "day"), 0);
  return diffInDays;
};

// n일전 표기 - 0일 미만이면 시간으로 표기
export const getRelativeTime = (dateString: string) => {
  const date = dayjs(dateString).add(9, "hour");
  return date.fromNow();
};
