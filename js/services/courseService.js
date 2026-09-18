const COURSES_KEY = "studyflow_courses";
const USERS_KEY = "users";
const TASKS_KEY = "studyflow_tasks";
const LEGACY_USER_ID = "studentId";

function readArray(key) {
    let data = JSON.parse(localStorage.getItem(key) ?? "[]");

    if (!Array.isArray(data)) {
        throw new Error(`Invalid stored data for ${key}`);
    }

    if (key === COURSES_KEY) {
        const migrated = data.map((course) => {
            if (!course || typeof course !== "object" || !(LEGACY_USER_ID in course)) return course;
            const { [LEGACY_USER_ID]: legacyUserId, ...rest } = course;
            return { ...rest, userId: rest.userId ?? legacyUserId };
        });
        if (migrated.some((course, index) => course !== data[index])) {
            saveArray(key, migrated);
            data = migrated;
        }
    }

    return data;
}

function saveArray(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function validateObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Course data must be an object");
    }
}

function validateCourseName(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error("Course name is required");
    }

    return value.trim();
}

function validateColor(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (
        typeof value !== "string" ||
        !CSS.supports("color", value.trim())
    ) {
        throw new Error("Invalid course color");
    }

    return value.trim();
}

export function createCourse(course) {
    validateObject(course);

    const courseName = validateCourseName(course.courseName);
    const color = validateColor(course.color);
    const userId =
        typeof course.userId === "string"
            ? course.userId.trim()
            : "";

    if (!userId) {
        throw new Error("User ID is required");
    }

    const users = readArray(USERS_KEY);

    if (!users.some((user) => (user.userId ?? user[LEGACY_USER_ID]) === userId)) {
        throw new Error("User does not exist");
    }

    const courses = readArray(COURSES_KEY);

    const newCourse = {
        courseId: crypto.randomUUID(),
        userId,
        courseName,
        color,
    };

    saveArray(COURSES_KEY, [...courses, newCourse]);

    return newCourse;
}

export function getCoursesByUserId(userId) {
    return readArray(COURSES_KEY).filter(
        (course) => course.userId === userId,
    );
}

export function getCourseById(courseId) {
    return (
        readArray(COURSES_KEY).find(
            (course) => course.courseId === courseId,
        ) ?? null
    );
}

export function updateCourse(courseId, data) {
    const courses = readArray(COURSES_KEY);
    const index = courses.findIndex(
        (course) => course.courseId === courseId,
    );

    if (index === -1) return null;

    validateObject(data);

    const updatedCourse = { ...courses[index] };

    if (Object.prototype.hasOwnProperty.call(data, "courseName")) {
        updatedCourse.courseName = validateCourseName(data.courseName);
    }

    if (Object.prototype.hasOwnProperty.call(data, "color")) {
        updatedCourse.color = validateColor(data.color);
    }

    courses[index] = updatedCourse;
    saveArray(COURSES_KEY, courses);

    return updatedCourse;
}

export function deleteCourse(courseId) {
    const courses = readArray(COURSES_KEY);

    if (!courses.some((course) => course.courseId === courseId)) {
        return false;
    }

    const tasks = readArray(TASKS_KEY);

    const remainingCourses = courses.filter(
        (course) => course.courseId !== courseId,
    );

    const remainingTasks = tasks.filter(
        (task) => task.courseId !== courseId,
    );

    saveArray(TASKS_KEY, remainingTasks);
    saveArray(COURSES_KEY, remainingCourses);

    return true;
}
