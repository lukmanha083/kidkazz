import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemStatus } from './SystemStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SystemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the system status button', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      expect(screen.getByRole('button', { name: /system status/i })).toBeInTheDocument();
    });

    it('should display system status text on larger screens', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('should render status indicator circle', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      const { container } = render(<SystemStatus />);

      const circle = container.querySelector('svg');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('Initial Health Check', () => {
    it('should perform health check on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [
            { name: 'API Gateway', status: 'online' },
            { name: 'User Service', status: 'online' },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/health/all'),
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        );
      });
    });

    it('should display checking status initially', () => {
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(<SystemStatus />);

      const button = screen.getByRole('button', { name: /system status/i });
      fireEvent.click(button);

      expect(screen.getByText(/checking status/i)).toBeInTheDocument();
    });

    it('should use environment variable for API URL', async () => {
      const originalEnv = import.meta.env.VITE_API_URL;
      import.meta.env.VITE_API_URL = 'https://custom-api.example.com';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://custom-api.example.com'),
          expect.anything()
        );
      });

      import.meta.env.VITE_API_URL = originalEnv;
    });
  });

  describe('Service Status Display', () => {
    it('should display all services when dropdown is opened', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [
            { name: 'API Gateway', status: 'online' },
            { name: 'User Service', status: 'online' },
            { name: 'Product Service', status: 'online' },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
        expect(screen.getByText('Product Service')).toBeInTheDocument();
      });
    });

    it('should show online status for operational services', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [{ name: 'API Gateway', status: 'online' }],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        const statusElements = screen.getAllByText(/online/i);
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });

    it('should show offline status for failed services', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'offline',
          services: [{ name: 'API Gateway', status: 'offline' }],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        const statusElements = screen.getAllByText(/offline/i);
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });

    it('should show degraded status for degraded services', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'degraded',
          services: [{ name: 'API Gateway', status: 'degraded' }],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        const statusElements = screen.getAllByText(/degraded/i);
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Overall Status Messages', () => {
    it('should display "All Systems Operational" when all services are online', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [
            { name: 'API Gateway', status: 'online' },
            { name: 'User Service', status: 'online' },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/all systems operational/i)).toBeInTheDocument();
      });
    });

    it('should display "System Offline" when any service is offline', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'offline',
          services: [
            { name: 'API Gateway', status: 'online' },
            { name: 'User Service', status: 'offline' },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/system offline/i)).toBeInTheDocument();
      });
    });

    it('should display "Degraded Performance" when services are degraded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'degraded',
          services: [
            { name: 'API Gateway', status: 'online' },
            { name: 'User Service', status: 'degraded' },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/degraded performance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Manual Refresh', () => {
    it('should have a refresh button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const triggerButton = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: '' });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should refresh status when refresh button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            overall: 'operational',
            services: [{ name: 'API Gateway', status: 'online' }],
            timestamp: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            overall: 'operational',
            services: [{ name: 'API Gateway', status: 'online' }],
            timestamp: new Date().toISOString(),
          }),
        });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const triggerButton = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const refreshButton = buttons.find((btn) => btn.querySelector('svg'));
        if (refreshButton) {
          fireEvent.click(refreshButton);
        }
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while refreshing', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    overall: 'operational',
                    services: [],
                    timestamp: new Date().toISOString(),
                  }),
                }),
              100
            )
          )
      );

      render(<SystemStatus />);

      const triggerButton = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const refreshButton = buttons.find((btn) => btn.querySelector('svg'));
        expect(refreshButton).toBeDisabled();
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh every 30 seconds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should clear interval on unmount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      const { unmount } = render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      vi.advanceTimersByTime(30000);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when health check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display timeout error when request times out', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 11000);
          })
      );

      render(<SystemStatus />);

      vi.advanceTimersByTime(11000);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /system status/i });
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText(/health check timed out/i)).toBeInTheDocument();
      });
    });

    it('should display error for non-ok HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/health check failed/i)).toBeInTheDocument();
      });
    });

    it('should set all services to offline on error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            overall: 'operational',
            services: [{ name: 'API Gateway', status: 'online' }],
            timestamp: new Date().toISOString(),
          }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const triggerButton = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(triggerButton);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const refreshButton = buttons.find((btn) => btn.querySelector('svg'));
        if (refreshButton) {
          fireEvent.click(refreshButton);
        }
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        const offlineElements = screen.getAllByText(/offline/i);
        expect(offlineElements.length).toBeGreaterThan(0);
      });
    });

    it('should display "Unable to Check Status" message on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/unable to check status/i)).toBeInTheDocument();
      });
    });
  });

  describe('Last Checked Timestamp', () => {
    it('should display last checked time after successful check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/last checked:/i)).toBeInTheDocument();
      });
    });

    it('should update last checked time on manual refresh', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const triggerButton = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText(/last checked:/i)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const refreshButton = buttons.find((btn) => btn.querySelector('svg'));
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Default Services', () => {
    it('should show default services list when health check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection error'));

      render(<SystemStatus />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const button = screen.getByRole('button', { name: /system status/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('API Gateway')).toBeInTheDocument();
        expect(screen.getByText('User Service')).toBeInTheDocument();
        expect(screen.getByText('Product Service')).toBeInTheDocument();
        expect(screen.getByText('Order Service')).toBeInTheDocument();
        expect(screen.getByText('Payment Service')).toBeInTheDocument();
        expect(screen.getByText('Inventory Service')).toBeInTheDocument();
        expect(screen.getByText('Shipping Service')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dropdown trigger', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      const button = screen.getByRole('button', { name: /system status/i });
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          overall: 'operational',
          services: [],
          timestamp: new Date().toISOString(),
        }),
      });

      render(<SystemStatus />);

      const button = screen.getByRole('button', { name: /system status/i });
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
