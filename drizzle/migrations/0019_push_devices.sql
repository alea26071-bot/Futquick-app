CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  token text NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 20 AND 4096),
  device_id text CHECK (device_id IS NULL OR char_length(device_id) <= 200),
  app_version text CHECK (app_version IS NULL OR char_length(app_version) <= 50),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_devices_user_idx ON public.push_devices (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT ALL ON public.push_devices TO service_role;

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own push devices" ON public.push_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own push devices" ON public.push_devices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own push devices" ON public.push_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own push devices" ON public.push_devices FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_devices_updated_at BEFORE UPDATE ON public.push_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A token moved to another account (shared phone) is reassigned by the server; clients cannot steal it.
CREATE OR REPLACE FUNCTION public.register_push_device(_platform text, _token text, _device_id text, _app_version text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.push_devices (user_id, platform, token, device_id, app_version, last_seen_at)
  VALUES (auth.uid(), _platform, _token, _device_id, _app_version, now())
  ON CONFLICT (token) DO UPDATE SET user_id = auth.uid(), platform = EXCLUDED.platform,
    device_id = EXCLUDED.device_id, app_version = EXCLUDED.app_version, last_seen_at = now();
  -- One active token per physical device and account.
  IF _device_id IS NOT NULL THEN
    DELETE FROM public.push_devices WHERE device_id = _device_id AND token <> _token;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.register_push_device(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text, text, text) TO authenticated;