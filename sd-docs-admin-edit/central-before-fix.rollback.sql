BEGIN;
UPDATE sectors
SET active = false
WHERE id = 'e4a38afe-06a2-4ea6-8d3c-6f24baf22b5c';

UPDATE user_sectors
SET active = true,
    is_primary = true,
    is_manager = false
WHERE id = 'c03f6e33-ed2f-4bd3-abc8-915e697afd2b';
COMMIT;
