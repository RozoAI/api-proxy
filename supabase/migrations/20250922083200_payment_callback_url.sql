-- Migration: Add callback_url column to payments table

ALTER TABLE public.payments
ADD COLUMN callback_url TEXT NULL;
