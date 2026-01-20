import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ============================================================================
// CUSTOMER TABLE
// ============================================================================
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),

    // Basic Info
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),

    // Customer Type
    customerType: text('customer_type').notNull(), // 'retail' | 'wholesale'

    // B2B Fields (for wholesale)
    companyName: text('company_name'),
    npwp: text('npwp'), // Tax ID
    creditLimit: integer('credit_limit').default(0),
    creditUsed: integer('credit_used').default(0),
    paymentTermDays: integer('payment_term_days').default(0),

    // B2C Fields (for retail)
    loyaltyPoints: integer('loyalty_points').default(0),
    membershipTier: text('membership_tier'), // 'bronze' | 'silver' | 'gold'

    // Stats (updated by events)
    totalOrders: integer('total_orders').default(0),
    totalSpent: integer('total_spent').default(0),
    lastOrderDate: integer('last_order_date'),

    // Status
    status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'blocked'

    // =========================================================================
    // GEOSPATIAL FIELDS (for graph analysis & mobile mining)
    // =========================================================================
    // Service Area (GeoJSON polygon for wholesale delivery zones)
    serviceAreaGeojson: text('service_area_geojson'), // GeoJSON Polygon/MultiPolygon
    preferredDeliveryZone: text('preferred_delivery_zone'), // Geohash prefix (e.g., "qqguw")

    // Last Known Location (from mobile app / sales visits)
    lastKnownLatitude: real('last_known_latitude'),
    lastKnownLongitude: real('last_known_longitude'),
    lastKnownGeohash: text('last_known_geohash'), // For clustering queries
    lastLocationAccuracy: real('last_location_accuracy'), // Accuracy in meters
    lastLocationSource: text('last_location_source'), // 'gps' | 'network' | 'manual' | 'geocoded'
    lastLocationCapturedAt: integer('last_location_captured_at'),
    lastLocationCapturedBy: text('last_location_captured_by'), // Employee ID who captured

    // =========================================================================
    // DEMOGRAPHIC ANALYTICS
    // =========================================================================
    dateOfBirth: integer('date_of_birth'),
    ageEstimate: integer('age_estimate'), // From face recognition
    ageRangeMin: integer('age_range_min'),
    ageRangeMax: integer('age_range_max'),
    gender: text('gender'), // 'male' | 'female' | 'unknown'
    genderConfidence: real('gender_confidence'), // 0.0-1.0 from Rekognition
    incomeBracket: text('income_bracket'), // 'low' | 'medium' | 'high' | 'premium'
    occupation: text('occupation'),
    educationLevel: text('education_level'),

    // =========================================================================
    // FACE RECOGNITION (AWS Rekognition)
    // =========================================================================
    faceId: text('face_id'), // Rekognition Face ID
    facePhotoUrl: text('face_photo_url'), // S3 URL of indexed face
    faceIndexedAt: integer('face_indexed_at'),
    faceMatchConfidence: real('face_match_confidence'), // Last match confidence
    faceEmotions: text('face_emotions'), // JSON: last detected emotions
    faceLastSeenAt: integer('face_last_seen_at'),

    // =========================================================================
    // BEHAVIORAL ANALYTICS
    // =========================================================================
    avgOrderValue: integer('avg_order_value'),
    purchaseFrequencyDays: integer('purchase_frequency_days'), // Days between purchases
    preferredShoppingDay: text('preferred_shopping_day'), // 'monday' | 'tuesday' | ...
    preferredShoppingHour: integer('preferred_shopping_hour'), // 0-23
    preferredPaymentMethod: text('preferred_payment_method'), // 'cash' | 'transfer' | 'qris'
    preferredCategories: text('preferred_categories'), // JSON array of category IDs
    preferredBrands: text('preferred_brands'), // JSON array of brand IDs
    basketSizeAvg: real('basket_size_avg'), // Average items per order
    discountSensitivity: real('discount_sensitivity'), // 0.0-1.0 (1.0 = always waits)

    // =========================================================================
    // ENGAGEMENT ANALYTICS
    // =========================================================================
    lastContactDate: integer('last_contact_date'),
    lastContactChannel: text('last_contact_channel'), // 'whatsapp' | 'email' | 'phone' | 'visit'
    contactResponseRate: real('contact_response_rate'), // 0.0-1.0
    satisfactionScore: real('satisfaction_score'), // NPS/CSAT (1-10)
    satisfactionUpdatedAt: integer('satisfaction_updated_at'),
    preferredContactChannel: text('preferred_contact_channel'),
    optInWhatsapp: integer('opt_in_whatsapp').default(0), // Boolean - GDPR explicit opt-in
    optInEmail: integer('opt_in_email').default(0),
    optInSms: integer('opt_in_sms').default(0),
    optInPush: integer('opt_in_push').default(0),
    feedbackCount: integer('feedback_count').default(0),
    complaintCount: integer('complaint_count').default(0),

    // =========================================================================
    // SOCIAL/NETWORK ANALYTICS
    // =========================================================================
    acquisitionSource: text('acquisition_source'), // 'organic' | 'referral' | 'ads' | 'salesperson'
    acquisitionCampaign: text('acquisition_campaign'),
    referredByCustomerId: text('referred_by_customer_id'),
    referredCustomersCount: integer('referred_customers_count').default(0),
    referralRevenueGenerated: integer('referral_revenue_generated').default(0),
    influenceScore: real('influence_score'), // 0-100
    communityTags: text('community_tags'), // JSON: ['ibu_pkk', 'arisan_rt5']
    socialConnections: text('social_connections'), // JSON: customer IDs

    // =========================================================================
    // PREDICTIVE ANALYTICS (ML Scores)
    // =========================================================================
    // RFM Segmentation
    rfmRecencyScore: integer('rfm_recency_score'), // 1-5
    rfmFrequencyScore: integer('rfm_frequency_score'), // 1-5
    rfmMonetaryScore: integer('rfm_monetary_score'), // 1-5
    rfmSegment: text('rfm_segment'), // 'champion' | 'loyal' | 'at_risk' | 'lost'
    rfmUpdatedAt: integer('rfm_updated_at'),

    // Customer Lifetime Value
    clvScore: integer('clv_score'), // Predicted lifetime value
    clvPercentile: integer('clv_percentile'), // 0-100
    clvUpdatedAt: integer('clv_updated_at'),

    // Churn Prediction
    churnRiskScore: real('churn_risk_score'), // 0.0-1.0
    churnRiskFactors: text('churn_risk_factors'), // JSON: factors
    churnRiskUpdatedAt: integer('churn_risk_updated_at'),

    // Next Purchase Prediction
    nextPurchasePredictedAt: integer('next_purchase_predicted_at'),
    nextPurchaseConfidence: real('next_purchase_confidence'), // 0.0-1.0
    recommendedProducts: text('recommended_products'), // JSON: product IDs

    // Notes
    notes: text('notes'),

    // Audit
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('idx_customers_code').on(table.code),
    index('idx_customers_email').on(table.email),
    index('idx_customers_status').on(table.status),
    index('idx_customers_type').on(table.customerType),
    // Geospatial indexes
    index('idx_customers_geohash').on(table.lastKnownGeohash),
    index('idx_customers_delivery_zone').on(table.preferredDeliveryZone),
    // Analytics indexes
    index('idx_customers_rfm_segment').on(table.rfmSegment),
    index('idx_customers_churn_risk').on(table.churnRiskScore),
    index('idx_customers_clv_percentile').on(table.clvPercentile),
    index('idx_customers_face_id').on(table.faceId),
    index('idx_customers_referred_by').on(table.referredByCustomerId),
    index('idx_customers_acquisition').on(table.acquisitionSource),
  ]
);

// ============================================================================
// SUPPLIER TABLE
// ============================================================================
export const suppliers = sqliteTable(
  'suppliers',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),

    // Basic Info
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),

    // Company Info
    companyName: text('company_name'),
    npwp: text('npwp'),

    // Business Terms
    paymentTermDays: integer('payment_term_days').default(30),
    leadTimeDays: integer('lead_time_days').default(7),
    minimumOrderAmount: integer('minimum_order_amount').default(0),

    // Bank Info (for payment)
    bankName: text('bank_name'),
    bankAccountNumber: text('bank_account_number'),
    bankAccountName: text('bank_account_name'),

    // Rating & Stats
    rating: real('rating'),
    totalOrders: integer('total_orders').default(0),
    totalPurchased: integer('total_purchased').default(0),
    lastOrderDate: integer('last_order_date'),

    // Status
    status: text('status').notNull().default('active'),

    // Notes
    notes: text('notes'),

    // Audit
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('idx_suppliers_code').on(table.code),
    index('idx_suppliers_status').on(table.status),
  ]
);

// ============================================================================
// EMPLOYEE TABLE (Data only - NO auth fields yet)
// ============================================================================
export const employees = sqliteTable(
  'employees',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),

    // Basic Info
    name: text('name').notNull(),
    email: text('email').unique(),
    phone: text('phone'),

    // Employment Info
    employeeNumber: text('employee_number').unique(),
    department: text('department'),
    position: text('position'),
    managerId: text('manager_id'), // Self-reference for org chart

    // Personal Info
    dateOfBirth: integer('date_of_birth'),
    gender: text('gender'), // 'male' | 'female'
    nationalId: text('national_id'), // KTP number
    npwp: text('npwp'),

    // Employment Dates
    joinDate: integer('join_date'),
    endDate: integer('end_date'),

    // Status
    employmentStatus: text('employment_status').notNull().default('active'),
    // 'active' | 'on_leave' | 'terminated' | 'resigned'

    // Salary (basic info, detailed in HRM module)
    baseSalary: integer('base_salary'),

    // Notes
    notes: text('notes'),

    // Audit
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('idx_employees_code').on(table.code),
    index('idx_employees_email').on(table.email),
    index('idx_employees_status').on(table.employmentStatus),
    index('idx_employees_department').on(table.department),
    index('idx_employees_manager').on(table.managerId),
  ]
);

// ============================================================================
// ADDRESS TABLE (Shared by all partner types)
// ============================================================================
export const addresses = sqliteTable(
  'addresses',
  {
    id: text('id').primaryKey(),

    // Owner (polymorphic)
    ownerType: text('owner_type').notNull(), // 'customer' | 'supplier' | 'employee'
    ownerId: text('owner_id').notNull(),

    // Address Type
    addressType: text('address_type').notNull(), // 'billing' | 'shipping' | 'home' | 'office'
    isPrimary: integer('is_primary').default(0),

    // Address Fields
    label: text('label'), // "Kantor Pusat", "Rumah", etc.
    recipientName: text('recipient_name'),
    phone: text('phone'),

    addressLine1: text('address_line_1').notNull(),
    addressLine2: text('address_line_2'),

    subdistrict: text('subdistrict'), // Kelurahan
    district: text('district'), // Kecamatan
    city: text('city').notNull(),
    province: text('province').notNull(),
    postalCode: text('postal_code'),
    country: text('country').default('Indonesia'),

    // =========================================================================
    // GEOSPATIAL FIELDS (enhanced for graph analysis & mobile mining)
    // =========================================================================
    // Coordinates
    latitude: real('latitude'),
    longitude: real('longitude'),

    // Geohash for efficient spatial indexing (precision 7 = ~150m)
    geohash: text('geohash'),

    // Location metadata (for data quality assessment)
    locationAccuracy: real('location_accuracy'), // Accuracy in meters from GPS
    locationSource: text('location_source'), // 'gps' | 'network' | 'manual' | 'geocoded'
    locationCapturedAt: integer('location_captured_at'), // When location was captured
    locationCapturedBy: text('location_captured_by'), // Employee ID who captured

    // GeoJSON for complex geometries (e.g., building footprint, delivery area)
    geojson: text('geojson'), // GeoJSON Point/Polygon

    // Notes
    notes: text('notes'),

    // Audit
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_addresses_owner').on(table.ownerType, table.ownerId),
    index('idx_addresses_primary').on(table.ownerType, table.ownerId, table.isPrimary),
    // Geospatial indexes
    index('idx_addresses_geohash').on(table.geohash),
    index('idx_addresses_coords').on(table.latitude, table.longitude),
  ]
);

// ============================================================================
// CUSTOMER LOCATION HISTORY (for mobile app tracking & route analysis)
// ============================================================================
export const customerLocationHistory = sqliteTable(
  'customer_location_history',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),

    // Location data
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    geohash: text('geohash').notNull(),

    // Location metadata
    accuracy: real('accuracy'), // Meters
    altitude: real('altitude'), // Meters above sea level
    speed: real('speed'), // Meters per second (for delivery tracking)
    heading: real('heading'), // Degrees from north

    // Source information
    source: text('source').notNull(), // 'gps' | 'network' | 'manual' | 'checkin'
    capturedBy: text('captured_by'), // Employee ID
    deviceId: text('device_id'), // Mobile device identifier

    // Context
    visitType: text('visit_type'), // 'sales_visit' | 'delivery' | 'survey' | 'checkin'
    visitNotes: text('visit_notes'),
    photoUrl: text('photo_url'), // Photo proof of visit

    // GeoJSON for complex data
    geojson: text('geojson'), // Full GeoJSON with properties

    // Timestamp
    capturedAt: integer('captured_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_location_history_customer').on(table.customerId),
    index('idx_location_history_geohash').on(table.geohash),
    index('idx_location_history_captured').on(table.capturedAt),
    index('idx_location_history_captured_by').on(table.capturedBy),
    index('idx_location_history_visit_type').on(table.visitType),
  ]
);

// Type exports for type safety
export type CustomerRecord = typeof customers.$inferSelect;
export type NewCustomerRecord = typeof customers.$inferInsert;

export type SupplierRecord = typeof suppliers.$inferSelect;
export type NewSupplierRecord = typeof suppliers.$inferInsert;

export type EmployeeRecord = typeof employees.$inferSelect;
export type NewEmployeeRecord = typeof employees.$inferInsert;

export type AddressRecord = typeof addresses.$inferSelect;
export type NewAddressRecord = typeof addresses.$inferInsert;

export type CustomerLocationHistoryRecord = typeof customerLocationHistory.$inferSelect;
export type NewCustomerLocationHistoryRecord = typeof customerLocationHistory.$inferInsert;
