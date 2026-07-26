CREATE TABLE "business_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"website" text,
	"logo_url" text,
	"description" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_units_slug_unique" UNIQUE("slug"),
	CONSTRAINT "business_units_category_valid" CHECK ("business_units"."category" IN ('Media', 'Digital', 'Tourism', 'Luxury', 'Travel Support', 'Lifestyle', 'Service', 'Retail'))
);
--> statement-breakpoint
ALTER TABLE "business_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"nationality" text,
	"country" text,
	"address" text,
	"business_unit_id" integer,
	"service_interested" text,
	"lead_source" text,
	"facebook" text,
	"instagram" text,
	"website" text,
	"notes" text,
	"status" text DEFAULT 'Lead' NOT NULL,
	"last_contact" text,
	"next_follow_up" text,
	"assigned_staff" text,
	"tags" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"stage" text DEFAULT 'Lead' NOT NULL,
	"value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"customer_id" integer,
	"business_unit_id" integer,
	"assigned_staff" text,
	"description" text,
	"expected_close_date" text,
	"probability" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deals_stage_valid" CHECK ("deals"."stage" IN ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
	CONSTRAINT "deals_probability_range" CHECK ("deals"."probability" IS NULL OR ("deals"."probability" >= 0 AND "deals"."probability" <= 100)),
	CONSTRAINT "deals_currency_iso4217" CHECK ("deals"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "income" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"business_unit_id" integer,
	"customer_id" integer,
	"category" text,
	"description" text,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"invoice_number" text,
	"status" text DEFAULT 'Received' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "income_status_valid" CHECK ("income"."status" IN ('Pending', 'Received', 'Cancelled'))
);
--> statement-breakpoint
ALTER TABLE "income" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"business_unit_id" integer,
	"vendor" text,
	"category" text,
	"description" text,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(15, 2) DEFAULT '0' NOT NULL,
	"payment_method" text,
	"receipt_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income" ADD CONSTRAINT "income_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_units_category_idx" ON "business_units" USING btree ("category");--> statement-breakpoint
CREATE INDEX "business_units_is_active_idx" ON "business_units" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "customers_business_unit_id_idx" ON "customers" USING btree ("business_unit_id");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_next_follow_up_idx" ON "customers" USING btree ("next_follow_up");--> statement-breakpoint
CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deals_customer_id_idx" ON "deals" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "deals_business_unit_id_idx" ON "deals" USING btree ("business_unit_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "deals_expected_close_date_idx" ON "deals" USING btree ("expected_close_date");--> statement-breakpoint
CREATE INDEX "income_business_unit_id_idx" ON "income" USING btree ("business_unit_id");--> statement-breakpoint
CREATE INDEX "income_customer_id_idx" ON "income" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "income_date_idx" ON "income" USING btree ("date");--> statement-breakpoint
CREATE INDEX "income_status_idx" ON "income" USING btree ("status");--> statement-breakpoint
CREATE INDEX "income_category_idx" ON "income" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_business_unit_id_idx" ON "expenses" USING btree ("business_unit_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_vendor_idx" ON "expenses" USING btree ("vendor");