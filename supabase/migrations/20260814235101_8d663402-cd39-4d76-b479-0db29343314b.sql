CREATE TABLE public.pelada_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  weekday SMALLINT NOT NULL,
  time_of_day TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  total_slots INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  field_type TEXT NOT NULL,
  level TEXT NOT NULL,
  photo_url TEXT,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  last_generated_for DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_templates TO authenticated;
GRANT ALL ON public.pelada_templates TO service_role;

ALTER TABLE public.pelada_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers view their own templates" ON public.pelada_templates
  FOR SELECT TO authenticated USING (auth.uid() = organizer_id);
CREATE POLICY "Organizers create their own templates" ON public.pelada_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers update their own templates" ON public.pelada_templates
  FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers delete their own templates" ON public.pelada_templates
  FOR DELETE TO authenticated USING (auth.uid() = organizer_id);

CREATE TRIGGER trg_pelada_templates_updated_at
  BEFORE UPDATE ON public.pelada_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.peladas
  ADD COLUMN template_id UUID REFERENCES public.pelada_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_pelada_templates_active ON public.pelada_templates(active, weekday);
CREATE INDEX idx_peladas_template ON public.peladas(template_id, starts_at);