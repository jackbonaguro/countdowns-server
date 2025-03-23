import { TZDate } from "@date-fns/tz";
import { UTCDate } from "@date-fns/utc";
import { format } from "date-fns";
import { scheduleJob } from "../services/at";

const date = new Date();

const tzDate = new TZDate(date);

const utcDate = new UTCDate(date);

// console.log('date', date, format(date, 'RRRRMMddHHmm'));
// console.log('tzDate', tzDate, format(tzDate, 'RRRRMMddHHmm'));
// console.log('utcDate', utcDate, format(utcDate, 'RRRRMMddHHmm'));

const timestamp = new TZDate().getTime() + 60000;

await scheduleJob('test', '5678', timestamp);
