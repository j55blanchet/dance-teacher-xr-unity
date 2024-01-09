
CREATE TABLE IF NOT EXISTS LearningStepProgress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    dance_id UUID NOT NULL,
    tree_name TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    state jsonb NOT NULL
);
