import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import "dayjs/locale/ja";

dayjs.extend(relativeTime);

export const rel = (d: string | Date | dayjs.Dayjs) => {
  return dayjs(d).locale("ja").fromNow();
};

export const abs = (d: string | Date | dayjs.Dayjs) => {
  return dayjs(d).locale("ja").format("YYYY/MM/DD HH:mm");
};
