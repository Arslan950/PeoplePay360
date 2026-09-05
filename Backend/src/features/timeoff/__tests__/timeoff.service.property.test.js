import fc from 'fast-check';
import { computeDuration } from '../timeoff.service.js';
import { ApiError } from '../../../utils/api-error.js';

const validDate = (min, max) => fc.integer({ min: min.getTime(), max: max.getTime() }).map((timestamp) => new Date(timestamp));

describe('Duration Computation Property Tests', () => {
	
	// Property 1: Duration is always >= 1 for valid date ranges
	test('Property 1: Duration is always >= 1 for valid date ranges', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2030, 11, 31)),
				fc.integer({ min: 0, max: 365 }),
				(startDate, dayOffset) => {
					const endDate = new Date(startDate.getTime() + dayOffset * 86400000);
					const duration = computeDuration(startDate, endDate);
					return duration >= 1;
				}
			),
			{ numRuns: 100 }
		);
	});
	
	// Property 2: Duration from date to (date + n days) equals n + 1
	test('Property 2: Duration from date to (date + n days) equals n + 1', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2030, 0, 1)),
				fc.integer({ min: 0, max: 100 }),
				(startDate, n) => {
					const endDate = new Date(startDate.getTime() + n * 86400000);
					const duration = computeDuration(startDate, endDate);
					return duration === n + 1;
				}
			),
			{ numRuns: 100 }
		);
	});
	
	// Property 3: Duration computation handles same date correctly
	test('Property 3: Same date should return duration of 1', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2030, 11, 31)),
				(date) => {
					const duration = computeDuration(date, date);
					return duration === 1;
				}
			),
			{ numRuns: 100 }
		);
	});
	
	// Property 4: Invalid date ranges should throw ApiError
	test('Property 4: End date before start date should throw ApiError', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2030, 0, 1)),
				fc.integer({ min: 1, max: 365 }),
				(endDate, dayOffset) => {
					const startDate = new Date(endDate.getTime() + dayOffset * 86400000);
					expect(() => computeDuration(startDate, endDate)).toThrow(ApiError);
					expect(() => computeDuration(startDate, endDate)).toThrow('endDate must be after or equal to startDate');
					return true;
				}
			),
			{ numRuns: 50 }
		);
	});
	
	// Property 5: Duration calculation is consistent with manual calculation
	test('Property 5: Duration matches manual inclusive day calculation', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2029, 0, 1)),
				validDate(new Date(2020, 0, 1), new Date(2029, 0, 1)),
				(date1, date2) => {
					// Ensure proper order
					const startDate = date1 <= date2 ? date1 : date2;
					const endDate = date1 <= date2 ? date2 : date1;
					
					const duration = computeDuration(startDate, endDate);
					const expectedDuration = Math.round((endDate - startDate) / 86400000) + 1;
					
					return duration === expectedDuration;
				}
			),
			{ numRuns: 100 }
		);
	});
	
	// Edge case: Test with Date objects vs string dates
	test('Property 6: Function handles Date objects and ISO strings consistently', () => {
		fc.assert(
			fc.property(
				validDate(new Date(2020, 0, 1), new Date(2030, 0, 1)),
				fc.integer({ min: 0, max: 30 }),
				(startDate, dayOffset) => {
					const endDate = new Date(startDate.getTime() + dayOffset * 86400000);
					
					// Test with Date objects
					const durationWithDates = computeDuration(startDate, endDate);
					
					// Test with ISO strings
					const durationWithStrings = computeDuration(startDate.toISOString(), endDate.toISOString());
					
					return durationWithDates === durationWithStrings;
				}
			),
			{ numRuns: 100 }
		);
	});
});
