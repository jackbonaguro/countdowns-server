/**
 * Example at command:
 *  echo "echo \"Hello\n\nWorld\" >> /home/jackbonaguro/countdowns-server/file2.txt" | at -t 202503221657
 * 
 * Output:
 *  warning: commands will be executed using /bin/sh
 *  job 5 at Sat Mar 22 16:57:00 2025
 * 
 * atq:
 *  job 5 at Sat Mar 22 16:57:00 2025
 */

import { exec } from 'node:child_process'
import { format } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { TZDate } from '@date-fns/tz';

export async function scheduleJob(name: string, ref: string, timestamp: number): Promise<number> {
  // Assume all stored timestamps are in UTC. Since this is where we're hitting the real system,
  // convert to system timezone here.

  const utcDate = new TZDate(timestamp);
  const t = format(utcDate, 'RRRRMMddHHmm');
  const command = `echo "npx tsx --env-file=.env ./jobs/${name}.ts ${ref}" | at -t ${t}`;
  console.log('command:', command);
  const jobNumber = await new Promise<number>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      try {
        // at returns actual output on stdout, and diagnostic info (job number) on stderr
        const logs = stderr?.split('\n');
        const relevantLog = logs?.find(l => l.startsWith('job '));
        const parsedLog = relevantLog?.split(' ');
        const jobNumberStr = parsedLog && parsedLog.length > 1 && parsedLog[1];

        if (!jobNumberStr) throw new Error('Failed to parse output from job scheduler');
        const jobNumber = parseInt(jobNumberStr);

        if (!jobNumber || isNaN(jobNumber)) throw new Error('Failed to parse job number from job scheduler');
        
        return resolve(jobNumber);
      } catch (err) {
        return reject(err);
      }
    });
  });

  console.log(`Invoked job ${name} with ref ${ref} & time ${t}`);

  return jobNumber;
}

export async function cancelJob(jobId: number) {
  //
}

// DO NOT IMPLEMENT A GET_JOBS() FUNCTION. If we're relying on system to tell us what's in flight it's too late.
