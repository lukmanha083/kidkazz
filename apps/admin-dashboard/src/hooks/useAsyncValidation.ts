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
