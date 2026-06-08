-- Featured plan shown as "Popular" on marketing landing page
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

UPDATE public.plans SET is_featured = FALSE WHERE is_featured IS NULL;

UPDATE public.plans SET is_featured = TRUE WHERE name = 'Pro' AND NOT EXISTS (
  SELECT 1 FROM public.plans WHERE is_featured = TRUE
);
