import { rankTasks, calculateRemainingWorkload } from "./smartService.js";

export function generateStudySchedule(tasks, availableStudyTime) {
  const rankedTasks = rankTasks(tasks);

  const schedule = [];
  let remainingStudyTime = availableStudyTime;
  let order = 1;

  for (const task of rankedTasks) {
    // Stop when your free time is up; save the remaining tasks for the next session.
    if (remainingStudyTime <= 0) {
      break;
    }

    const remainingWorkload = calculateRemainingWorkload(
      task.estimatedDuration,
      task.currentProgress
    );

    // Skip tasks that require no further action; there is no need to schedule them.
    if (remainingWorkload <= 0) {
      continue;
    }

    // suggestedDuration must not exceed the remainingWorkload of the task,
    // and the remaining free hours
    const suggestedDuration = Math.min(remainingWorkload, remainingStudyTime);
    const remainingWorkloadAfter = remainingWorkload - suggestedDuration;

    schedule.push({
      task: task,
      suggestedDuration: suggestedDuration,
      order: order,
      remainingWorkloadAfter: remainingWorkloadAfter,
    });

    remainingStudyTime -= suggestedDuration;
    order += 1;
  }

  return schedule;
}