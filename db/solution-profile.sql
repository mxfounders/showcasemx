-- Stable question ID; step 0..3 stays compatible with previous forms/integrations.
ALTER TABLE founder_solutions ADD COLUMN IF NOT EXISTS editor_question text CHECK (length(editor_question)<=64);
