CREATE TABLE public.game_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton_key = true),
  bride_name text NOT NULL,
  groom_name text NOT NULL,
  wedding_date date NOT NULL,
  finale_message text NOT NULL,
  bride_face_photo text NOT NULL,
  groom_face_photo text NOT NULL,
  background_music text,
  milestones jsonb NOT NULL,
  obstacle_labels text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_config_milestones_count CHECK (
    jsonb_typeof(milestones) = 'array' AND jsonb_array_length(milestones) BETWEEN 4 AND 8
  ),
  CONSTRAINT game_config_obstacle_labels_count CHECK (
    cardinality(obstacle_labels) BETWEEN 8 AND 12
  )
);

GRANT SELECT ON public.game_config TO anon, authenticated;
GRANT ALL ON public.game_config TO service_role;

ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game config is readable by wedding guests"
  ON public.game_config
  FOR SELECT
  TO anon, authenticated
  USING (true);