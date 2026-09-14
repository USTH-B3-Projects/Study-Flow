function calculateUrgencyScore(deadline) {

}

function calculateImportanceScore(importance) {

}

function calculateRemainingWorkload(estimatedDuration, currentProgress) {

}

function calculateWorkloadScore(remainingWorkload) {

}

export function calculatePriorityScore(task) {
    const urgencyScore =
        calculateUrgencyScore(task.deadline);

    const importanceScore =
        calculateImportanceScore(task.importance);

    //calculate priority
}

export function rankTasks(tasks) {

}

export function getGlobalRecommendations(studentId) {

}

export function getLocalRecommendations(courseId) {

}

export function getWorkloadWarning(tasks) {

}