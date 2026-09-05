const parseTimeToMinutes = (value) => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return Number.NaN;
	const trimmed = value.trim();
	if (!trimmed) return Number.NaN;
	if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
	const match = trimmed.match(/^([0-9]{1,2}):([0-9]{2})$/);
	if (!match) return Number.NaN;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN;
	return (hours * 60) + minutes;
};

const computeWeeklyHours = (weeklyPattern) => {
	if (!Array.isArray(weeklyPattern)) return 0;

	let totalMinutes = 0;
	for (const entry of weeklyPattern) {
		if (!entry || typeof entry !== "object" || entry.isWorkingDay !== true) continue;
		const startMinutes = parseTimeToMinutes(entry.startTime);
		const endMinutes = parseTimeToMinutes(entry.endTime);
		const breakMinutes = Number(entry.breakMinutes);
		if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || !Number.isFinite(breakMinutes)) continue;
		const duration = endMinutes - startMinutes - breakMinutes;
		if (duration > 0) totalMinutes += duration;
	}

	return Number((totalMinutes / 60).toFixed(2));
};

export { computeWeeklyHours };
