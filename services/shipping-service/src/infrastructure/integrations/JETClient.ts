/**
 * JET API Client
 * Integration with JET shipping service (https://developer.jet.co.id/documentation)
 *
 * PLACEHOLDER IMPLEMENTATION - Waiting for sandbox credentials
 *
 * JET API Features:
 * - Rate calculation (GET /rates)
 * - Order creation (POST /orders)
 * - Order tracking (GET /orders/:id/tracking)
 * - Order cancellation (POST /orders/:id/cancel)
 * - Pickup scheduling (POST /orders/:id/pickup)
 */

export interface JETAddress {
  name: string;
  phone: string;
  address: string;
  city_id: string; // JET city ID
  postal_code: string;
  province: string;
  district?: string;
  subdistrict?: string;
}

export interface JETPackage {
  weight: number; // in grams
  length?: number; // in cm
  width?: number; // in cm
  height?: number; // in cm
  item_description: string;
  item_value: number;
}

export interface JETRateRequest {
  origin_city_id: string;
  destination_city_id: string;
  weight: number;
  courier_codes?: string[]; // ['jne', 'jnt', 'sicepat', etc.]
}

export interface JETRateResponse {
  courier_code: string;
  courier_name: string;
  services: Array<{
    service_code: string;
    service_name: string;
    description: string;
    cost: number;
    etd_min: number; // days
    etd_max: number; // days
  }>;
}

export interface JETCreateOrderRequest {
  origin: JETAddress;
  destination: JETAddress;
  package: JETPackage;
  courier_code: string;
  service_code: string;
  cod_amount?: number; // Cash on Delivery
  insurance_amount?: number;
  notes?: string;
}

export interface JETCreateOrderResponse {
  order_id: string;
  awb_number: string;
  courier_code: string;
  service_code: string;
  status: string;
  tracking_url: string;
  estimated_delivery_date?: string;
}

export interface JETTrackingResponse {
  order_id: string;
  awb_number: string;
  status: string;
  history: Array<{
    status: string;
    status_description: string;
    location: string;
    timestamp: string;
    notes?: string;
    received_by?: string;
  }>;
}

export class JETClient {
  private baseURL: string;
  private apiKey: string;
  private mode: 'production' | 'sandbox';

  constructor(config: { baseURL: string; apiKey: string; mode: 'production' | 'sandbox' }) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.mode = config.mode;
  }

  /**
   * Get shipping rates for different couriers
   * GET /rates
   */
  async getRates(request: JETRateRequest): Promise<JETRateResponse[]> {
    // PLACEHOLDER: Return mock data until sandbox is available
    console.log('[JET API] Getting rates (PLACEHOLDER):', request);

    return [
      {
        courier_code: 'jne',
        courier_name: 'JNE',
        services: [
          {
            service_code: 'reg',
            service_name: 'Regular',
            description: 'Layanan reguler JNE',
            cost: 25000,
            etd_min: 2,
            etd_max: 3,
          },
          {
            service_code: 'yes',
            service_name: 'YES',
            description: 'Yakin Esok Sampai',
            cost: 45000,
            etd_min: 1,
            etd_max: 1,
          },
        ],
      },
      {
        courier_code: 'jnt',
        courier_name: 'J&T Express',
        services: [
          {
            service_code: 'reg',
            service_name: 'Regular',
            description: 'Layanan reguler J&T',
            cost: 22000,
            etd_min: 2,
            etd_max: 4,
          },
        ],
      },
      {
        courier_code: 'sicepat',
        courier_name: 'SiCepat',
        services: [
          {
            service_code: 'reg',
            service_name: 'Regular',
            description: 'Layanan reguler SiCepat',
            cost: 23000,
            etd_min: 2,
            etd_max: 3,
          },
          {
            service_code: 'best',
            service_name: 'BEST',
            description: 'Besok Sampai Tujuan',
            cost: 40000,
            etd_min: 1,
            etd_max: 1,
          },
        ],
      },
    ];

    /* REAL IMPLEMENTATION (when sandbox is ready):
    const response = await fetch(`${this.baseURL}/rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`JET API Error: ${response.statusText}`);
    }

    return response.json();
    */
  }

  /**
   * Create a shipping order
   * POST /orders
   */
  async createOrder(request: JETCreateOrderRequest): Promise<JETCreateOrderResponse> {
    // PLACEHOLDER: Return mock data
    console.log('[JET API] Creating order (PLACEHOLDER):', request);

    const mockOrderId = `JET-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const mockAwbNumber = `AWB${Math.random().toString().substring(2, 14)}`;

    return {
      order_id: mockOrderId,
      awb_number: mockAwbNumber,
      courier_code: request.courier_code,
      service_code: request.service_code,
      status: 'pending',
      tracking_url: `https://tracking.jet.co.id/${mockAwbNumber}`,
      estimated_delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    /* REAL IMPLEMENTATION:
    const response = await fetch(`${this.baseURL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`JET API Error: ${response.statusText}`);
    }

    return response.json();
    */
  }

  /**
   * Get tracking information for an order
   * GET /orders/:orderId/tracking
   */
  async getTracking(orderId: string): Promise<JETTrackingResponse> {
    // PLACEHOLDER: Return mock data
    console.log('[JET API] Getting tracking (PLACEHOLDER):', orderId);

    return {
      order_id: orderId,
      awb_number: 'AWB123456789012',
      status: 'in_transit',
      history: [
        {
          status: 'booked',
          status_description: 'Pesanan telah dibuat',
          location: 'Jakarta Pusat',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'picked_up',
          status_description: 'Paket telah diambil kurir',
          location: 'Jakarta Pusat',
          timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          status: 'in_transit',
          status_description: 'Paket dalam perjalanan',
          location: 'Bandung',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    /* REAL IMPLEMENTATION:
    const response = await fetch(`${this.baseURL}/orders/${orderId}/tracking`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`JET API Error: ${response.statusText}`);
    }

    return response.json();
    */
  }

  /**
   * Cancel a shipping order
   * POST /orders/:orderId/cancel
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    // PLACEHOLDER
    console.log('[JET API] Cancelling order (PLACEHOLDER):', orderId, reason);

    /* REAL IMPLEMENTATION:
    const response = await fetch(`${this.baseURL}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`JET API Error: ${response.statusText}`);
    }
    */
  }

  /**
   * Schedule pickup for an order
   * POST /orders/:orderId/pickup
   */
  async schedulePickup(orderId: string, pickupDate: string): Promise<void> {
    // PLACEHOLDER
    console.log('[JET API] Scheduling pickup (PLACEHOLDER):', orderId, pickupDate);

    /* REAL IMPLEMENTATION:
    const response = await fetch(`${this.baseURL}/orders/${orderId}/pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ pickup_date: pickupDate }),
    });

    if (!response.ok) {
      throw new Error(`JET API Error: ${response.statusText}`);
    }
    */
  }
}
