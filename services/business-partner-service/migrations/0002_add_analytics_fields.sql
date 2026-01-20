-- Migration: Add customer analytics fields
-- Supports: Demographics, Face Recognition, Behavioral, Engagement, Social, Predictive

-- ============================================================================
-- DEMOGRAPHIC ANALYTICS
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `date_of_birth` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `age_estimate` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `age_range_min` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `age_range_max` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `gender` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `gender_confidence` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `income_bracket` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `occupation` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `education_level` text;

--> statement-breakpoint
-- ============================================================================
-- FACE RECOGNITION (AWS Rekognition)
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `face_id` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `face_photo_url` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `face_indexed_at` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `face_match_confidence` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `face_emotions` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `face_last_seen_at` integer;

--> statement-breakpoint
-- ============================================================================
-- BEHAVIORAL ANALYTICS
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `avg_order_value` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `purchase_frequency_days` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_shopping_day` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_shopping_hour` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_payment_method` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_categories` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_brands` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `basket_size_avg` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `discount_sensitivity` real;

--> statement-breakpoint
-- ============================================================================
-- ENGAGEMENT ANALYTICS
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `last_contact_date` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_contact_channel` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `contact_response_rate` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `satisfaction_score` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `satisfaction_updated_at` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `preferred_contact_channel` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `opt_in_whatsapp` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `opt_in_email` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `opt_in_sms` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `opt_in_push` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `feedback_count` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `complaint_count` integer DEFAULT 0;

--> statement-breakpoint
-- ============================================================================
-- SOCIAL/NETWORK ANALYTICS
-- ============================================================================
ALTER TABLE `customers` ADD COLUMN `acquisition_source` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `acquisition_campaign` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referred_by_customer_id` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referred_customers_count` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `referral_revenue_generated` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `influence_score` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `community_tags` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `social_connections` text;

--> statement-breakpoint
-- ============================================================================
-- PREDICTIVE ANALYTICS (RFM, CLV, Churn)
-- ============================================================================
-- RFM Segmentation
ALTER TABLE `customers` ADD COLUMN `rfm_recency_score` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `rfm_frequency_score` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `rfm_monetary_score` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `rfm_segment` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `rfm_updated_at` integer;

--> statement-breakpoint
-- Customer Lifetime Value
ALTER TABLE `customers` ADD COLUMN `clv_score` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `clv_percentile` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `clv_updated_at` integer;

--> statement-breakpoint
-- Churn Prediction
ALTER TABLE `customers` ADD COLUMN `churn_risk_score` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `churn_risk_factors` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `churn_risk_updated_at` integer;

--> statement-breakpoint
-- Next Purchase Prediction
ALTER TABLE `customers` ADD COLUMN `next_purchase_predicted_at` integer;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `next_purchase_confidence` real;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `recommended_products` text;

--> statement-breakpoint
-- ============================================================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================================================
CREATE INDEX `idx_customers_rfm_segment` ON `customers` (`rfm_segment`);
--> statement-breakpoint
CREATE INDEX `idx_customers_churn_risk` ON `customers` (`churn_risk_score`);
--> statement-breakpoint
CREATE INDEX `idx_customers_clv_percentile` ON `customers` (`clv_percentile`);
--> statement-breakpoint
CREATE INDEX `idx_customers_face_id` ON `customers` (`face_id`);
--> statement-breakpoint
CREATE INDEX `idx_customers_referred_by` ON `customers` (`referred_by_customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_customers_acquisition` ON `customers` (`acquisition_source`);
