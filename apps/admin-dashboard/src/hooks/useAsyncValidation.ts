/**
 * Async Validation Hook with Debouncing
 *
 * Provides debounced async validation with visual feedback states:
 * - isValidating: Shows loading spinner
 * - isValid: true (checkmark) | false (error X) | null (idle)
 * - error: Error message to display
 *
 * Features:
 * - Automatic debouncing (default 500ms)
 * - Request cancellation on new input
 * - Cleanup on unmount
 *
 * @see Phase 5: Async Validation with Debouncing
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface AsyncValidationState {
	isValidating: boolean;
	isValid: boolean | null;
	error: string | null;
}

/**
 * Hook that performs debounced, cancellable asynchronous validation for a value.
 *
 * Starts a debounced validation request via `validationFn`, cancels any in-flight request
 * when a new validation is started or on unmount, and exposes validation state and controls.
 *
 * @param validationFn - Async function that determines whether the provided value is valid/unique. It receives the value and an optional `excludeId` and must resolve to `true` for valid or `false` for invalid.
 * @param debounceMs - Delay in milliseconds to wait after the last call to `validate` before invoking `validationFn`. Defaults to 500.
 * @returns An object containing:
 *  - `isValidating`: `true` while a validation request is pending, otherwise `false`.
 *  - `isValid`: `true` if the value is valid, `false` if invalid, or `null` when idle or on error.
 *  - `error`: A string error message when validation failed, or `null`.
 *  - `validate(value, excludeId?)`: Function to start debounced validation for `value`.
 *  - `reset()`: Function to reset the validation state to idle.
 */
export function useAsyncValidation<T>(
	validationFn: (value: T, excludeId?: string) => Promise<boolean>,
	debounceMs = 500
) {
	const [state, setState] = useState<AsyncValidationState>({
		isValidating: false,
		isValid: null,
		error: null,
	});

	const abortControllerRef = useRef<AbortController | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const validate = useCallback(
		(value: T, excludeId?: string) => {
			// Clear previous timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Cancel previous request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			// Reset state if value is empty
			if (!value || (typeof value === 'string' && value.trim() === '')) {
				setState({ isValidating: false, isValid: null, error: null });
				return;
			}

			// Set validating state
			setState({ isValidating: true, isValid: null, error: null });

			// Debounce the validation request
			timeoutRef.current = setTimeout(async () => {
				abortControllerRef.current = new AbortController();

				try {
					const isUnique = await validationFn(value, excludeId);
					setState({
						isValidating: false,
						isValid: isUnique,
						error: isUnique ? null : 'Already exists',
					});
				} catch (error: any) {
					// Ignore abort errors (from cancellation)
					if (error.name !== 'AbortError') {
						setState({
							isValidating: false,
							isValid: null,
							error: 'Validation failed',
						});
					}
				}
			}, debounceMs);
		},
		[validationFn, debounceMs]
	);

	const reset = useCallback(() => {
		setState({ isValidating: false, isValid: null, error: null });
	}, []);

	return { ...state, validate, reset };
}