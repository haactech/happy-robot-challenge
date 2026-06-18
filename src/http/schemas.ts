import { z } from "zod";

export const carrierVerifySchema = z.object({
  mc_number: z.string().min(1),
});

export const loadSearchSchema = z.object({
  mc_number: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  equipment_type: z.string().min(1),
  pickup_date: z.string().optional(),
});

export const negotiationEvaluateSchema = z.object({
  load_id: z.string().min(1),
  mc_number: z.string().min(1),
  round: z.number().int().min(1),
  offer_cents: z.number().int().positive(),
});

export const callCreateSchema = z.object({
  external_call_id: z.string().min(1),
  mc_number: z.string().min(1),
  load_id: z.string().nullable().optional(),
  outcome: z.enum([
    "booked",
    "carrier_ineligible",
    "no_matching_load",
    "not_interested",
    "price_not_agreed",
    "incomplete",
  ]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  agreed_price_cents: z.number().int().positive().nullable().optional(),
  negotiation_rounds: z.number().int().min(0).nullable().optional(),
  transferred: z.boolean().default(false),
  extracted: z
    .object({
      carrier_contact_name: z.string().optional(),
      carrier_phone: z.string().optional(),
      initial_offer_cents: z.number().int().positive().optional(),
      final_offer_cents: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});
