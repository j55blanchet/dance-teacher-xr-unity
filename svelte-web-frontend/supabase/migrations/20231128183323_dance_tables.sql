
INSERT INTO storage.buckets (id, name)
    SELECT 'dancevideos', 'dancevideos'
    WHERE NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'dancevideos'
    );

CREATE TABLE IF NOT EXISTS DanceDemoVideo (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    duration FLOAT NOT NULL,
    frameCount INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    detected_beats jsonb
);
alter table "public"."dancedemovideo" enable row level security;
DO $$BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for all users' AND polrelid = 'public.dancedemovideo'::regclass
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "public"."dancedemovideo" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
    END IF;
END$$;

-- Create DanceDemo table
CREATE TABLE IF NOT EXISTS DanceDemo (
  id SERIAL PRIMARY KEY,
  creator UUID REFERENCES profiles(id),
  displayTitle TEXT not null,
  duration FLOAT not null,
  video_id BIGINT REFERENCES public.DanceDemoVideo(id),
  start_time FLOAT not null,
  end_time FLOAT not null
);
alter table "public"."dancedemo" enable row level security;

DO $$BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for all users' AND polrelid = 'public.dancedemo'::regclass
    ) THEN
        CREATE POLICY "Enable read access for all users" ON DanceDemo FOR SELECT TO PUBLIC USING (true);
    END IF;
END$$;


-- Create DanceSegment table
CREATE TABLE IF NOT EXISTS DanceSegmentation (
  id SERIAL PRIMARY KEY,
  dance_id BIGINT REFERENCES public.dancedemo(id),
  description text default '',
  segmentation jsonb default '[]'
);
alter table "public"."dancesegmentation" enable row level security;

DO $$BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for all users' AND polrelid = 'public.DanceSegmentation'::regclass
    ) THEN
        CREATE POLICY "Enable read access for all users" ON DanceSegmentation FOR SELECT TO PUBLIC USING (true);
    END IF;
END$$;

-- -- Add row-level security policies for DanceVideo table
-- -- BEGIN: DanceVideo row-level security policies
-- CREATE POLICY "Dance videos are viewable by everyone" ON DanceVideo FOR ALL TO PUBLIC USING (true);
-- -- END: DanceVideo row-level security policies

-- -- Add row-level security policies for DanceDemo table
-- -- BEGIN: DanceDemo row-level security policies
-- CREATE POLICY "Dance demos are viewable by everyone" ON DanceDemo FOR ALL TO PUBLIC USING (true);
-- -- END: DanceDemo row-level security policies

-- -- Add row-level security policies for DanceSegment table
-- -- BEGIN: DanceSegment row-level security policies
-- CREATE POLICY "Dance segments are viewable by everyone" ON DanceSegment FOR ALL TO PUBLIC USING (true);
-- -- END: DanceSegment row-level security policies
